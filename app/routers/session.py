import os
import shutil
from datetime import datetime, timedelta
import logging

from fastapi import APIRouter, HTTPException

from core.config import settings


logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/tools/merge", tags=["session"])  # Keep exact paths


@router.get("/session/{session_id}/check")
async def check_session_status(session_id: str):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    if not os.path.exists(session_dir):
        raise HTTPException(status_code=404, detail="Session bulunamadı")

    try:
        session_time = datetime.fromtimestamp(os.path.getctime(session_dir))
        time_remaining = timedelta(minutes=settings.SESSION_LIFETIME_MINUTES) - (datetime.now() - session_time)
        if time_remaining.total_seconds() <= 0:
            raise HTTPException(status_code=410, detail=f"Session süresi dolmuş ({settings.SESSION_LIFETIME_MINUTES} dakika). Lütfen dosyaları tekrar işleyin.")
        return {
            "status": "active",
            "session_id": session_id,
            "time_remaining_seconds": int(time_remaining.total_seconds()),
            "expires_at": (session_time + timedelta(minutes=settings.SESSION_LIFETIME_MINUTES)).isoformat(),
        }
    except Exception as e:
        logger.error(f"Session check failed: {e}")
        raise HTTPException(status_code=500, detail="Session kontrol hatası")


@router.delete("/session/{session_id}")
async def cleanup_session(session_id: str):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    if os.path.exists(session_dir):
        try:
            shutil.rmtree(session_dir)
            logger.info(f"Session temizlendi: {session_id}")
            return {"success": True, "message": "Session dosyaları temizlendi"}
        except Exception as e:
            logger.error(f"Session temizleme hatası: {str(e)}")
            raise HTTPException(status_code=500, detail="Temizleme sırasında hata oluştu")
    else:
        return {"success": False, "message": "Session bulunamadı"}


