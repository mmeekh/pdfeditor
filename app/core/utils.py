import os
import shutil
from datetime import datetime, timedelta
from pathlib import Path
import logging

from fastapi import HTTPException, UploadFile

from .config import settings


logger = logging.getLogger(__name__)


def validate_pdf_file(file: UploadFile) -> None:
    """Validate an uploaded PDF file for extension and size constraints."""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Sadece PDF dosyaları kabul edilir")

    size = getattr(file, "size", None)
    if size is not None and size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Dosya boyutu çok büyük. Maksimum: {settings.MAX_FILE_SIZE/(1024*1024)}MB",
        )


def validate_word_file(file: UploadFile) -> None:
    """Validate a Word document (.doc or .docx)."""
    name = file.filename.lower()
    if not (name.endswith('.doc') or name.endswith('.docx')):
        raise HTTPException(status_code=400, detail="Sadece Word dosyaları (DOC/DOCX) kabul edilir")
    size = getattr(file, "size", None)
    if size is not None and size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Dosya boyutu çok büyük. Maksimum: {settings.MAX_FILE_SIZE/(1024*1024)}MB",
        )


async def save_upload_file(upload_file: UploadFile, destination: Path) -> None:
    """Persist an UploadFile to the given destination path."""
    try:
        with destination.open("wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
    finally:
        upload_file.file.close()


def cleanup_old_files() -> None:
    """Remove files older than FILE_CLEANUP_HOURS from TEMP_DIR."""
    try:
        now = datetime.now()
        for file_path in Path(settings.TEMP_DIR).glob("*"):
            if file_path.is_file():
                file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                if now - file_time > timedelta(hours=settings.FILE_CLEANUP_HOURS):
                    file_path.unlink()
                    logger.info(f"Eski dosya silindi: {file_path}")
    except Exception as e:
        logger.error(f"Dosya temizleme hatası: {e}")


def ensure_safe_path(file_path: str, base_dir: str) -> str:
    """Guard against path traversal by ensuring file_path resides under base_dir."""
    safe_path = os.path.normpath(file_path)
    if not safe_path.startswith(os.path.normpath(base_dir)):
        logger.error(f"Path traversal attempt detected")
        raise HTTPException(status_code=403, detail="Geçersiz dosya yolu")
    return safe_path


def sanitize_error_message(error: Exception, context: str = "İşlem") -> str:
    """Güvenli hata mesajları oluştur - dosya bilgisi sızdırmaz."""
    error_type = type(error).__name__
    
    # Genel hata mesajları
    if "permission" in str(error).lower():
        return f"{context} için yetki hatası oluştu"
    elif "not found" in str(error).lower() or "file not found" in str(error).lower():
        return f"{context} için dosya bulunamadı"
    elif "size" in str(error).lower():
        return f"{context} için dosya boyutu uygun değil"
    elif "format" in str(error).lower() or "type" in str(error).lower():
        return f"{context} için dosya formatı uygun değil"
    else:
        return f"{context} sırasında beklenmeyen hata oluştu"


def log_operation_safely(operation: str, session_id: str = None, file_count: int = None, **kwargs):
    """Güvenli log kaydı - dosya isimleri ve yolları loglanmaz."""
    log_data = {
        "operation": operation,
        "timestamp": datetime.now().isoformat(),
        "session_id": session_id,
        "file_count": file_count
    }
    
    # Güvenli ek bilgiler ekle
    for key, value in kwargs.items():
        if key not in ["filename", "file_path", "file_paths", "original_name"]:
            log_data[key] = value
    
    logger.info(f"Operation: {operation}, Session: {session_id}, Files: {file_count}")


