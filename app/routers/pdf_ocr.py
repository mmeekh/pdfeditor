import os
from pathlib import Path
from datetime import datetime
import logging

from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import FileResponse

from core.config import settings
from core.utils import validate_pdf_file, save_upload_file
from pdf_ocr import PDFOCR, PDFOCRError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tools/pdf-ocr", tags=["pdf-ocr"])


@router.post("/upload")
async def upload_pdf_for_ocr(files: list[UploadFile] = File(...)):
    """PDF dosyasını OCR için yükle"""
    if len(files) == 0:
        raise HTTPException(status_code=400, detail="En az 1 PDF dosyası gereklidir")
    if len(files) > settings.MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Maksimum {settings.MAX_FILES} dosya yüklenebilir")

    session_id = datetime.now().strftime("%Y%m%d_%H%M%S_") + os.urandom(4).hex()
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)

    total_size = 0
    uploaded = []
    
    try:
        for idx, file in enumerate(files):
            validate_pdf_file(file)
            if getattr(file, "size", None) is not None:
                total_size += file.size
                if total_size > settings.MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Toplam boyut {settings.MAX_FILE_SIZE/(1024*1024)}MB sınırını aşıyor"
                    )
            
            path = Path(session_dir) / f"{idx}_{file.filename}"
            await save_upload_file(file, path)
            uploaded.append({
                "original_name": file.filename,
                "path": str(path),
                "size": getattr(file, "size", 0)
            })
            
        return {
            "session_id": session_id,
            "files": uploaded,
            "total_files": len(uploaded),
            "total_size_mb": round((total_size or 0) / (1024 * 1024), 2)
        }
    except Exception as e:
        if os.path.exists(session_dir):
            import shutil
            shutil.rmtree(session_dir)
        logger.error(f"PDF OCR upload failed: {e}")
        raise


@router.post("/process/{session_id}")
async def process_pdf_ocr(
    session_id: str,
    language: str = Form("tur+eng"),
    dpi: int = Form(300),
    include_coordinates: bool = Form(False)
):
    """PDF OCR işlemini başlat"""
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    if not os.path.exists(session_dir):
        raise HTTPException(status_code=404, detail="Oturum bulunamadı veya süresi dolmuş")

    files = [str(p) for p in Path(session_dir).glob("*.pdf")]
    if not files:
        raise HTTPException(status_code=400, detail="PDF bulunamadı")

    # DPI sınırları
    if dpi < 150 or dpi > 600:
        raise HTTPException(status_code=400, detail="DPI 150-600 arasında olmalıdır")

    try:
        ocr = PDFOCR(temp_dir=session_dir)
        
        # Desteklenen dilleri kontrol et
        supported_langs = ocr.get_supported_languages()
        lang_parts = language.split('+')
        for lang in lang_parts:
            if lang not in supported_langs:
                logger.warning(f"Desteklenmeyen dil: {lang}, desteklenenler: {supported_langs}")

        results = []
        total_pages = 0
        successful_pages = 0
        
        for pdf_file in files:
            try:
                # Çıktı dosya adı
                base_name = Path(pdf_file).stem
                output_name = f"{base_name}_ocr_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
                output_path = os.path.join(session_dir, output_name)
                
                # OCR işlemi
                result = ocr.process_pdf_ocr(
                    pdf_path=pdf_file,
                    output_path=output_path,
                    language=language,
                    dpi=dpi,
                    include_coordinates=include_coordinates
                )
                
                results.append({
                    "input_file": os.path.basename(pdf_file),
                    "output_file": output_name,
                    "success": result["success"],
                    "total_pages": result["total_pages"],
                    "successful_pages": result["successful_pages"],
                    "failed_pages": result["failed_pages"],
                    "text_length": result["text_length"],
                    "file_size_mb": result["file_size_mb"]
                })
                
                total_pages += result["total_pages"]
                successful_pages += result["successful_pages"]
                
            except PDFOCRError as e:
                logger.error(f"OCR failed for {pdf_file}: {e}")
                results.append({
                    "input_file": os.path.basename(pdf_file),
                    "output_file": None,
                    "success": False,
                    "error": str(e)
                })
            except Exception as e:
                logger.error(f"Unexpected error for {pdf_file}: {e}")
                results.append({
                    "input_file": os.path.basename(pdf_file),
                    "output_file": None,
                    "success": False,
                    "error": f"Beklenmeyen hata: {str(e)}"
                })

        # Özet bilgiler
        summary = {
            "total_files": len(files),
            "successful_files": len([r for r in results if r["success"]]),
            "total_pages": total_pages,
            "successful_pages": successful_pages,
            "failed_pages": total_pages - successful_pages,
            "language": language,
            "dpi": dpi,
            "include_coordinates": include_coordinates
        }

        return {
            "success": True,
            "session_id": session_id,
            "results": results,
            "summary": summary,
            "download_url": f"/api/tools/pdf-ocr/download/{session_id}" if any(r["success"] for r in results) else None
        }

    except PDFOCRError as e:
        logger.error(f"PDF OCR error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"PDF OCR process error: {e}")
        raise HTTPException(status_code=500, detail="OCR işlemi sırasında hata oluştu")


@router.get("/download/{session_id}")
async def download_ocr_result(session_id: str):
    """OCR sonuçlarını indir"""
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    if not os.path.exists(session_dir):
        raise HTTPException(status_code=404, detail="Oturum bulunamadı veya süresi dolmuş")

    # Tüm OCR sonuç dosyalarını bul
    txt_files = list(Path(session_dir).glob("*.txt"))
    if not txt_files:
        raise HTTPException(status_code=404, detail="OCR sonucu bulunamadı")

    if len(txt_files) == 1:
        # Tek dosya varsa direkt indir
        file_path = txt_files[0]
        return FileResponse(
            path=str(file_path),
            media_type="text/plain; charset=utf-8",
            filename=file_path.name,
            headers={
                "Content-Disposition": f"attachment; filename={file_path.name}",
                "Cache-Control": "no-cache, no-store, must-revalidate"
            }
        )
    else:
        # Birden fazla dosya varsa ZIP oluştur
        import zipfile
        zip_name = f"ocr_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        zip_path = os.path.join(session_dir, zip_name)
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for txt_file in txt_files:
                zf.write(txt_file, arcname=txt_file.name)
        
        return FileResponse(
            path=zip_path,
            media_type="application/zip",
            filename=zip_name,
            headers={
                "Content-Disposition": f"attachment; filename={zip_name}",
                "Cache-Control": "no-cache, no-store, must-revalidate"
            }
        )


@router.get("/languages")
async def get_supported_languages():
    """Desteklenen OCR dillerini döndür"""
    try:
        ocr = PDFOCR()
        languages = ocr.get_supported_languages()
        return {
            "languages": languages,
            "default": "tur+eng",
            "note": "Birden fazla dil için '+' ile ayırın (örn: tur+eng+deu)"
        }
    except Exception as e:
        logger.error(f"Language list error: {e}")
        return {
            "languages": ["eng", "tur"],
            "default": "tur+eng",
            "note": "Varsayılan diller yükleniyor"
        }
