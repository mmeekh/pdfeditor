import os
from pathlib import Path
from datetime import datetime
import logging

from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import FileResponse

from core.config import settings
from core.utils import validate_pdf_file, save_upload_file
from unlock import PDFUnlocker, PDFUnlockError, UnlockResult


logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/tools/unlock", tags=["unlock"])


@router.post("/upload")
async def upload_pdf_for_unlock(file: UploadFile = File(...)):
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
        logger.error(f"PDF→Unlock upload failed: {e}")
        raise HTTPException(status_code=500, detail="Dosya yükleme sırasında hata oluştu")


@router.post("/process/{session_id}")
async def process_pdf_unlock(
    session_id: str,
    password: str = Form(...)
):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    if not os.path.exists(session_dir):
        raise HTTPException(status_code=404, detail="Oturum bulunamadı veya süresi dolmuş")

    pdfs = list(Path(session_dir).glob("*.pdf"))
    if not pdfs:
        raise HTTPException(status_code=400, detail="PDF bulunamadı")
    input_pdf = str(pdfs[0])

    unlocker = PDFUnlocker(temp_dir=session_dir)
    try:
        result = unlocker.unlock(input_pdf, password)
        output_name = os.path.basename(result.output_path)
        return {
            "success": True,
            "session_id": session_id,
            "output_file": output_name,
            "unlocked": result.unlocked,
            "was_encrypted": result.was_encrypted,
            "download_url": f"/api/tools/unlock/download/{session_id}/{output_name}",
        }
    except PDFUnlockError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"PDF→Unlock process error: {e}")
        raise HTTPException(status_code=500, detail="Şifre kaldırma sırasında hata oluştu")


@router.get("/download/{session_id}/{filename}")
async def download_unlocked_pdf(session_id: str, filename: str):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    file_path = os.path.join(session_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    return FileResponse(path=file_path, media_type="application/pdf", filename=filename)
