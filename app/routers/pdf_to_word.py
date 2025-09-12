import os
from pathlib import Path
from datetime import datetime, timedelta
import logging
import zipfile
import tempfile

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from core.config import settings
from core.utils import validate_pdf_file, save_upload_file, ensure_safe_path
from pdf_to_word import PDFToWordConverter, PDFToWordError


logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/tools/pdf-to-word", tags=["pdf-to-word"])


class PDFToWordProcessParams(BaseModel):
    session_id: str


class PDFToWordDownloadParams(BaseModel):
    session_id: str
    filename: str


@router.post("/upload")
async def upload_pdf_for_convert(files: list[UploadFile] = File(...)):
    if len(files) == 0:
        raise HTTPException(status_code=400, detail="En az 1 PDF dosyası gereklidir")
    if len(files) > settings.MAX_FILES:
        raise HTTPException(
            status_code=400, detail=f"Maksimum {settings.MAX_FILES} dosya yüklenebilir"
        )

    # Her dosyayı validate et
    for file in files:
        validate_pdf_file(file)

    session_id = datetime.now().strftime("%Y%m%d_%H%M%S_") + os.urandom(4).hex()
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)

    total_size = 0
    try:
        uploaded_files = []
        for file in files:
            if getattr(file, "size", None) is not None:
                total_size += file.size
                if total_size > settings.MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Toplam boyut {settings.MAX_FILE_SIZE/(1024*1024)}MB sınırını aşıyor",
                    )

            file_path = Path(session_dir) / file.filename
            await save_upload_file(file, file_path)
            uploaded_files.append(
                {
                    "original_name": file.filename,
                    "path": str(file_path),
                    "size": getattr(file, "size", 0),
                }
            )

        return {
            "session_id": session_id,
            "files": uploaded_files,
            "file_count": len(uploaded_files),
        }
    except Exception as e:
        if os.path.exists(session_dir):
            import shutil

            shutil.rmtree(session_dir)
        logger.error(f"PDF→Word upload failed: {e}")
        raise HTTPException(
            status_code=500, detail="Dosya yükleme sırasında hata oluştu"
        )


@router.post("/process/{session_id}")
async def process_pdf_to_word(params: PDFToWordProcessParams = Depends()):
    session_id = params.session_id
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    if not os.path.exists(session_dir):
        raise HTTPException(
            status_code=404, detail="Oturum bulunamadı veya süresi dolmuş"
        )

    pdf_files = list(Path(session_dir).glob("*.pdf"))
    if not pdf_files:
        raise HTTPException(status_code=400, detail="PDF bulunamadı")

    converter = PDFToWordConverter(temp_dir=session_dir)
    converted_files = []

    try:
        # Her PDF'i Word'e dönüştür
        for pdf_file in pdf_files:
            result = converter.convert(str(pdf_file))
            converted_files.append(
                {
                    "original_pdf": pdf_file.name,
                    "word_file": os.path.basename(result.output_path),
                    "output_path": result.output_path,
                }
            )

        # Eğer birden fazla dosya varsa ZIP oluştur
        if len(converted_files) > 1:
            zip_filename = (
                f"pdf_to_word_converted_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
            )
            zip_path = os.path.join(session_dir, zip_filename)

            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
                for converted in converted_files:
                    zipf.write(converted["output_path"], converted["word_file"])

            return {
                "success": True,
                "session_id": session_id,
                "output_file": zip_filename,
                "download_url": f"/api/tools/pdf-to-word/download/{session_id}/{zip_filename}",
                "file_count": len(converted_files),
                "is_zip": True,
            }
        else:
            # Tek dosya ise direkt döndür
            output_name = converted_files[0]["word_file"]
            return {
                "success": True,
                "session_id": session_id,
                "output_file": output_name,
                "download_url": f"/api/tools/pdf-to-word/download/{session_id}/{output_name}",
                "file_count": 1,
                "is_zip": False,
            }

    except PDFToWordError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"PDF→Word process error: {e}")
        raise HTTPException(status_code=500, detail="Dönüştürme sırasında hata oluştu")


@router.get("/download/{session_id}/{filename}")
async def download_converted(params: PDFToWordDownloadParams = Depends()):
    session_id = params.session_id
    filename = params.filename
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
        media = (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )

    return FileResponse(path=file_path, media_type=media, filename=filename)
