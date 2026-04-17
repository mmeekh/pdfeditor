import os
from pathlib import Path
from datetime import datetime, timedelta
import logging
import zipfile

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

from core.config import settings
from core.utils import validate_pdf_file, save_upload_file, ensure_safe_path
from pdf_to_jpg import PDFToJPGConverter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tools/pdf-to-jpg", tags=["pdf-to-jpg"])

@router.post("/upload")
async def upload_pdf_for_jpg(files: list[UploadFile] = File(...)):
    if len(files) == 0:
        raise HTTPException(status_code=400, detail="En az 1 PDF dosyası gereklidir")
    if len(files) > settings.MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Maksimum {settings.MAX_FILES} dosya yüklenebilir")

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
                    raise HTTPException(status_code=400, detail=f"Toplam boyut {settings.MAX_FILE_SIZE/(1024*1024)}MB sınırını aşıyor")
            
            file_path = Path(session_dir) / file.filename
            await save_upload_file(file, file_path)
            uploaded_files.append({
                "original_name": file.filename,
                "path": str(file_path),
                "size": getattr(file, "size", 0)
            })
        
        return {
            "session_id": session_id, 
            "files": uploaded_files,
            "file_count": len(uploaded_files)
        }
    except Exception as e:
        if os.path.exists(session_dir):
            import shutil
            shutil.rmtree(session_dir)
        logger.error(f"PDF→JPG upload failed: {e}")
        raise HTTPException(status_code=500, detail="Dosya yükleme sırasında hata oluştu")

@router.post("/process/{session_id}")
async def process_pdf_to_jpg(session_id: str, dpi: int = 200):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    if not os.path.exists(session_dir):
        raise HTTPException(status_code=404, detail="Oturum bulunamadı veya süresi dolmuş")
    
    pdf_files = list(Path(session_dir).glob("*.pdf"))
    if not pdf_files:
        raise HTTPException(status_code=400, detail="PDF bulunamadı")

    converter = PDFToJPGConverter(temp_dir=session_dir)
    all_images = []
    
    try:
        # Her PDF'i JPG'ye dönüştür
        for pdf_file in pdf_files:
            images = converter.convert(str(pdf_file), session_dir, dpi)
            all_images.extend(images)
        
        # Eğer birden fazla PDF varsa veya çok sayfa varsa ZIP oluştur
        if len(pdf_files) > 1 or len(all_images) > 1:
            # İlk PDF'in adını baz al
            first_pdf = sorted(pdf_files)[0]
            base = os.path.splitext(os.path.basename(str(first_pdf)))[0].split("_", 1)[-1]
            zip_name = f"{base}_jpg_gorseller.zip" if len(pdf_files) == 1 else f"jpg_gorseller_{len(pdf_files)}_dosya.zip"
            zip_path = os.path.join(session_dir, zip_name)
            
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                for img in all_images:
                    zf.write(img, arcname=os.path.basename(img))
            
            return {
                "success": True,
                "session_id": session_id,
                "output_file": zip_name,
                "download_url": f"/api/tools/pdf-to-jpg/download/{session_id}/{zip_name}",
                "file_count": len(pdf_files),
                "image_count": len(all_images),
                "is_zip": True
            }
        else:
            # Tek dosya ise direkt döndür
            output_file = os.path.basename(all_images[0])
            return {
                "success": True,
                "session_id": session_id,
                "output_file": output_file,
                "download_url": f"/api/tools/pdf-to-jpg/download/{session_id}/{output_file}",
                "file_count": 1,
                "image_count": 1,
                "is_zip": False
            }
            
    except Exception as e:
        logger.error(f"PDF→JPG process error: {e}")
        raise HTTPException(status_code=500, detail="Dönüştürme sırasında hata oluştu")

@router.get("/download/{session_id}/{filename}")
async def download_converted_images(session_id: str, filename: str):
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
        if datetime.now() - session_time > timedelta(minutes=settings.SESSION_LIFETIME_MINUTES):
            logger.info(f"Session süresi dolmuş: {session_id}")
            raise HTTPException(
                status_code=410,
                detail=f"İndirme linki süresi dolmuş ({settings.SESSION_LIFETIME_MINUTES} dakika). Lütfen dosyaları tekrar işleyin ve daha hızlı indirin.",
            )
    except Exception as e:
        logger.error(f"Session time check failed: {e}")

    media = "application/zip" if filename.lower().endswith('.zip') else "image/jpeg"
    return FileResponse(path=file_path, media_type=media, filename=filename)
