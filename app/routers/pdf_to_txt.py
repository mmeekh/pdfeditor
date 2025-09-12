import os
from pathlib import Path
from datetime import datetime, timedelta
import logging
import zipfile

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from core.config import settings
from core.utils import validate_pdf_file, validate_word_file, save_upload_file, ensure_safe_path
from pdf_to_txt import PDFToTXTConverter, PDFToTXTError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tools/pdf-to-txt", tags=["pdf-to-txt"])


class PDFToTXTProcessParams(BaseModel):
    session_id: str


@router.post("/upload")
async def upload_files_for_convert(files: list[UploadFile] = File(...)):
    """PDF ve Word dosyalarını TXT dönüştürme için yükle"""
    if len(files) == 0:
        raise HTTPException(status_code=400, detail="En az 1 dosya gereklidir")
    if len(files) > settings.MAX_FILES:
        raise HTTPException(
            status_code=400, detail=f"Maksimum {settings.MAX_FILES} dosya yüklenebilir"
        )

    session_id = datetime.now().strftime("%Y%m%d_%H%M%S_") + os.urandom(4).hex()
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)

    total_size = 0
    uploaded_files = []

    try:
        for idx, file in enumerate(files):
            # Dosya tipine göre validasyon
            file_ext = Path(file.filename).suffix.lower()
            if file_ext == '.pdf':
                validate_pdf_file(file)
            elif file_ext in ['.docx', '.doc']:
                validate_word_file(file)
            else:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Desteklenmeyen dosya formatı: {file_ext}. Sadece PDF ve Word dosyaları kabul edilir."
                )

            if getattr(file, "size", None) is not None:
                total_size += file.size
                if total_size > settings.MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Toplam boyut {settings.MAX_FILE_SIZE/(1024*1024)}MB sınırını aşıyor",
                    )

            file_path = Path(session_dir) / f"{idx}_{file.filename}"
            await save_upload_file(file, file_path)
            uploaded_files.append(
                {
                    "original_name": file.filename,
                    "path": str(file_path),
                    "size": getattr(file, "size", 0),
                    "file_type": "pdf" if file_ext == '.pdf' else "word"
                }
            )

        return {
            "session_id": session_id,
            "files": uploaded_files,
            "file_count": len(uploaded_files),
            "total_size_mb": round((total_size or 0) / (1024 * 1024), 2),
        }
    except Exception as e:
        if os.path.exists(session_dir):
            import shutil
            shutil.rmtree(session_dir)
        logger.error(f"PDF/Word→TXT upload failed: {e}")
        raise HTTPException(
            status_code=500, detail="Dosya yükleme sırasında hata oluştu"
        )


@router.post("/process/{session_id}")
async def process_pdf_to_txt(params: PDFToTXTProcessParams = Depends()):
    """PDF ve Word dosyalarını TXT'ye dönüştür"""
    session_id = params.session_id
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    if not os.path.exists(session_dir):
        raise HTTPException(
            status_code=404, detail="Oturum bulunamadı veya süresi dolmuş"
        )

    # PDF ve Word dosyalarını bul
    pdf_files = list(Path(session_dir).glob("*.pdf"))
    word_files = list(Path(session_dir).glob("*.doc*"))
    all_files = pdf_files + word_files
    
    if not all_files:
        raise HTTPException(status_code=400, detail="PDF veya Word dosyası bulunamadı")

    converter = PDFToTXTConverter(temp_dir=session_dir)
    converted_files = []

    try:
        # Her dosyayı TXT'ye dönüştür
        for file_path in all_files:
            result = converter.convert(str(file_path))
            converted_files.append(
                {
                    "original_file": file_path.name,
                    "txt_file": os.path.basename(result.output_path),
                    "output_path": result.output_path,
                    "text_length": result.text_length,
                    "file_type": result.file_type,
                }
            )

        # Eğer birden fazla dosya varsa ZIP oluştur
        if len(converted_files) > 1:
            zip_filename = (
                f"converted_to_txt_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
            )
            zip_path = os.path.join(session_dir, zip_filename)

            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
                for converted in converted_files:
                    zipf.write(converted["output_path"], converted["txt_file"])

            return {
                "success": True,
                "session_id": session_id,
                "output_file": zip_filename,
                "download_url": f"/api/tools/pdf-to-txt/download/{session_id}/{zip_filename}",
                "file_count": len(converted_files),
                "is_zip": True,
                "results": converted_files,
            }
        else:
            # Tek dosya ise direkt döndür
            output_name = converted_files[0]["txt_file"]
            return {
                "success": True,
                "session_id": session_id,
                "output_file": output_name,
                "download_url": f"/api/tools/pdf-to-txt/download/{session_id}/{output_name}",
                "file_count": 1,
                "is_zip": False,
                "results": converted_files,
            }

    except PDFToTXTError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"PDF/Word→TXT process error: {e}")
        raise HTTPException(status_code=500, detail="Dönüştürme sırasında hata oluştu")


@router.get("/download/{session_id}/{filename}")
async def download_converted_txt(session_id: str, filename: str):
    """Dönüştürülmüş TXT dosyasını indir"""
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    file_path = os.path.join(session_dir, filename)

    if not os.path.exists(session_dir):
        logger.warning(f"Session bulunamadı: {session_id}")
        raise HTTPException(
            status_code=404,
            detail=f"İndirme oturumu bulunamadı veya süresi dolmuş ({settings.SESSION_LIFETIME_MINUTES} dakika). Dosyaları tekrar yükleyip işleyin.",
        )

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")

    ensure_safe_path(file_path, settings.TEMP_DIR)

    try:
        session_time = datetime.fromtimestamp(os.path.getctime(session_dir))
        if datetime.now() - session_time > timedelta(
            minutes=settings.SESSION_LIFETIME_MINUTES
        ):
            logger.info(f"Session süresi dolmuş: {session_id}")
            raise HTTPException(
                status_code=410,
                detail=f"İndirme linki süresi dolmuş ({settings.SESSION_LIFETIME_MINUTES} dakika). Lütfen dosyaları tekrar işleyin ve daha hızlı indirin.",
            )
    except Exception as e:
        logger.error(f"Session time check failed: {e}")

    if filename.endswith(".zip"):
        media = "application/zip"
    else:
        media = "text/plain; charset=utf-8"

    return FileResponse(
        path=file_path, 
        media_type=media, 
        filename=filename,
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Cache-Control": "no-cache, no-store, must-revalidate",
        }
    )
