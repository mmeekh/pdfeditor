import os
from pathlib import Path
from datetime import datetime
import logging

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

from core.config import settings
from core.utils import validate_pdf_file, save_upload_file
from rotate import PDFRotator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tools/rotate", tags=["rotate"])

@router.post("/upload")
async def upload_pdf_for_rotate(file: UploadFile = File(...)):
    validate_pdf_file(file)
    session_id = datetime.now().strftime("%Y%m%d_%H%M%S_") + os.urandom(4).hex()
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)
    try:
        file_path = Path(session_dir) / file.filename
        await save_upload_file(file, file_path)
        return {"session_id": session_id, "file": {"original_name": file.filename, "path": str(file_path), "size": getattr(file, "size", 0)}}
    except Exception as e:
        if os.path.exists(session_dir):
            import shutil
            shutil.rmtree(session_dir)
        logger.error(f"Rotate upload failed: {e}")
        raise HTTPException(status_code=500, detail="Dosya yükleme sırasında hata oluştu")

@router.post("/process/{session_id}")
async def process_rotate(session_id: str, degrees: int = 90):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    if not os.path.exists(session_dir):
        raise HTTPException(status_code=404, detail="Oturum bulunamadı veya süresi dolmuş")
    pdf_files = list(Path(session_dir).glob("*.pdf"))
    if not pdf_files:
        raise HTTPException(status_code=400, detail="PDF bulunamadı")
    input_pdf = str(pdf_files[0])
    output_name = f"rotated_{pdf_files[0].name}"
    output_path = os.path.join(session_dir, output_name)
    rotator = PDFRotator(temp_dir=session_dir)
    rotator.rotate(input_pdf, output_path, degrees)
    return {
        "success": True,
        "session_id": session_id,
        "output_file": output_name,
        "download_url": f"/api/tools/rotate/download/{session_id}/{output_name}",
    }

@router.get("/download/{session_id}/{filename}")
async def download_rotated(session_id: str, filename: str):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    file_path = os.path.join(session_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    return FileResponse(path=file_path, media_type="application/pdf", filename=filename)
