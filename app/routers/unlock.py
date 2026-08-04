import os
from pathlib import Path
from datetime import datetime, timedelta
import logging

from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import FileResponse

from core.config import settings
from core.session_files import uploaded_pdfs
from core.utils import validate_pdf_file, save_upload_file, ensure_safe_path, check_encrypted_files
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
        # idx prefix ile filename collision'ı önle (diğer router'larla tutarlı)
        file_path = Path(session_dir) / f"0_{file.filename}"
        await save_upload_file(file, file_path)
        return {"encrypted_files": check_encrypted_files([str(p) for p in uploaded_pdfs(session_dir)]),
            "session_id": session_id, "file": {"original_name": file.filename, "path": str(file_path), "size": getattr(file, "size", 0)}}
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

    pdfs = list(uploaded_pdfs(session_dir))
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

    return FileResponse(path=file_path, media_type="application/pdf", filename=filename)
