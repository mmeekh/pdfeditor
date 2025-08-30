import os
from pathlib import Path
from datetime import datetime
import logging
import zipfile

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

from core.config import settings
from core.utils import validate_pdf_file, save_upload_file
from pdf_to_jpg import PDFToJPGConverter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tools/pdf-to-jpg", tags=["pdf-to-jpg"])

@router.post("/upload")
async def upload_pdfs_for_jpg(files: list[UploadFile] = File(...)):
    if len(files) == 0:
        raise HTTPException(status_code=400, detail="En az 1 PDF dosyası gereklidir")
    if len(files) > settings.MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Maksimum {settings.MAX_FILES} dosya yüklenebilir")

    session_id = datetime.now().strftime("%Y%m%d_%H%M%S_") + os.urandom(4).hex()
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)

    total_size = 0
    uploaded: list[dict] = []
    try:
        for idx, file in enumerate(files):
            validate_pdf_file(file)
            if getattr(file, "size", None) is not None:
                total_size += file.size
                if total_size > settings.MAX_FILE_SIZE:
                    raise HTTPException(status_code=400, detail=f"Toplam boyut {settings.MAX_FILE_SIZE/(1024*1024)}MB sınırını aşıyor")
            path = Path(session_dir) / f"{idx}_{file.filename}"
            await save_upload_file(file, path)
            uploaded.append({"original_name": file.filename, "path": str(path), "size": getattr(file, "size", 0)})
        return {"session_id": session_id, "files": uploaded}
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

    files = [str(p) for p in Path(session_dir).glob("*.pdf")]
    if not files:
        raise HTTPException(status_code=400, detail="PDF bulunamadı")

    def _upload_index_key(p: str) -> int:
        name = Path(p).name
        parts = name.split('_', 1)
        if len(parts) == 2 and parts[0].isdigit():
            return int(parts[0])
        return 0

    pdf_files = sorted(files, key=_upload_index_key)

    converter = PDFToJPGConverter(temp_dir=session_dir)
    images: list[str] = []
    for src in pdf_files:
        try:
            imgs = converter.convert(src, session_dir, dpi)
            images.extend(os.path.basename(i) for i in imgs)
        except Exception as e:
            logger.error(f"PDF→JPG failed for {src}: {e}")
            continue

    if not images:
        raise HTTPException(status_code=500, detail="Dönüştürme sırasında hata oluştu")

    zip_name = None
    if len(images) > 1:
        zip_name = f"images_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        zip_path = os.path.join(session_dir, zip_name)
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for img in images:
                zf.write(os.path.join(session_dir, img), arcname=img)

    return {
        "success": True,
        "session_id": session_id,
        "results": images,
        "zip_file": zip_name,
        "download_url": f"/api/tools/pdf-to-jpg/download/{session_id}/{zip_name}" if zip_name else f"/api/tools/pdf-to-jpg/download/{session_id}/{images[0]}",
    }

@router.get("/download/{session_id}/{filename}")
async def download_converted_images(session_id: str, filename: str):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    file_path = os.path.join(session_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    media = "application/zip" if filename.lower().endswith('.zip') else "image/jpeg"
    return FileResponse(path=file_path, media_type=media, filename=filename)
