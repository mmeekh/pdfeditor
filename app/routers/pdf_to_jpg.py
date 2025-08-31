import os
from pathlib import Path
from datetime import datetime
import logging
import zipfile

from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
from fastapi.responses import FileResponse

from core.config import settings
from core.utils import validate_pdf_file, save_upload_file
from pdf_to_jpg import PDFToJPGConverter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tools/pdf-to-jpg", tags=["pdf-to-jpg"])


@router.post("/upload")
async def upload_pdf_for_jpg(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="Dosya yüklenmedi")

    session_id = datetime.now().strftime("%Y%m%d_%H%M%S_") + os.urandom(4).hex()
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)
    saved = []
    try:
        for file in files:
            validate_pdf_file(file)
            file_path = Path(session_dir) / file.filename
            await save_upload_file(file, file_path)
            saved.append({
                "original_name": file.filename,
                "path": str(file_path),
                "size": getattr(file, "size", 0),
            })
        return {"session_id": session_id, "files": saved}
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
    for pdf in pdf_files:
        sub_dir = os.path.join(session_dir, Path(pdf).stem)
        os.makedirs(sub_dir, exist_ok=True)
        images = converter.convert(str(pdf), sub_dir, dpi)
        for img in images:
            all_images.append((img, os.path.join(Path(pdf).stem, os.path.basename(img))))

    if not all_images:
        raise HTTPException(status_code=500, detail="Görsel oluşturulamadı")

    zip_name = f"images_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
    zip_path = os.path.join(session_dir, zip_name)
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for img_path, arc in all_images:
            zf.write(img_path, arcname=arc)

    return {
        "success": True,
        "session_id": session_id,
        "output_file": zip_name,
        "download_url": f"/api/tools/pdf-to-jpg/download/{session_id}/{zip_name}",
    }

@router.get("/download/{session_id}/{filename}")
async def download_converted_images(session_id: str, filename: str):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    file_path = os.path.join(session_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    media = "application/zip" if filename.lower().endswith('.zip') else "image/jpeg"
    return FileResponse(path=file_path, media_type=media, filename=filename)
