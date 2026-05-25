import os
import shutil
from datetime import datetime, timedelta
from pathlib import Path
import logging

from fastapi import HTTPException, UploadFile

from .config import settings


logger = logging.getLogger(__name__)


def _read_magic_bytes(file: UploadFile, n: int = 8) -> bytes:
    """Read first N bytes and rewind. Safe against tampered uploads."""
    try:
        pos = file.file.tell()
    except Exception:
        pos = 0
    try:
        head = file.file.read(n)
        file.file.seek(pos)
        return head or b""
    except Exception:
        return b""


def _safe_filename(name: str) -> str:
    """Sanitize filename: strip path separators + null bytes + control chars."""
    if not name:
        return "file"
    # Path separator ve null byte kaldır
    name = name.replace("/", "_").replace("\\", "_").replace("\x00", "")
    # Control karakterler kaldır
    name = "".join(c for c in name if ord(c) >= 32)
    # Çok uzunsa kırp (max 200 kar.)
    if len(name) > 200:
        name = name[:200]
    return name.strip() or "file"


def validate_pdf_file(file: UploadFile) -> None:
    """Validate an uploaded PDF file: extension + size + magic bytes."""
    safe = _safe_filename(file.filename or "")
    if not safe.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Sadece PDF dosyaları kabul edilir")

    size = getattr(file, "size", None)
    if size is not None and size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Dosya boyutu çok büyük. Maksimum: {settings.MAX_FILE_SIZE/(1024*1024):.0f}MB",
        )

    # Magic bytes kontrolü — PDF dosyası "%PDF-" ile başlar
    head = _read_magic_bytes(file, 5)
    if head and not head.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=400,
            detail="Geçersiz PDF dosyası (dosya imzası hatalı)."
        )

    # Güvenli filename'i UploadFile üzerine geri yaz
    try:
        file.filename = safe
    except Exception:
        pass


def validate_word_file(file: UploadFile) -> None:
    """Validate a Word document (.doc or .docx): extension + size + magic bytes."""
    safe = _safe_filename(file.filename or "")
    name = safe.lower()
    if not (name.endswith('.doc') or name.endswith('.docx')):
        raise HTTPException(status_code=400, detail="Sadece Word dosyaları (DOC/DOCX) kabul edilir")

    size = getattr(file, "size", None)
    if size is not None and size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Dosya boyutu çok büyük. Maksimum: {settings.MAX_FILE_SIZE/(1024*1024):.0f}MB",
        )

    # Magic bytes:
    #   .docx = ZIP (PK\x03\x04)
    #   .doc  = OLE Compound File (\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1)
    head = _read_magic_bytes(file, 8)
    if head:
        is_docx = name.endswith('.docx') and head.startswith(b"PK\x03\x04")
        is_doc = name.endswith('.doc') and head.startswith(b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1")
        if not (is_docx or is_doc):
            raise HTTPException(
                status_code=400,
                detail="Geçersiz Word dosyası (dosya imzası hatalı)."
            )

    try:
        file.filename = safe
    except Exception:
        pass


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
    """Guard against path traversal by ensuring file_path resides under base_dir.

    Uses os.path.realpath to resolve symlinks so a symlinked file outside base_dir
    cannot bypass the check. The trailing os.sep prevents a /tmp/abc bypass when
    base_dir is /tmp/ab.
    """
    real_path = os.path.realpath(file_path)
    real_base = os.path.realpath(base_dir)
    if not real_path.startswith(real_base + os.sep) and real_path != real_base:
        logger.error(f"Path traversal attempt: {file_path} (resolved: {real_path}) base={real_base}")
        raise HTTPException(status_code=403, detail="Geçersiz dosya yolu")
    return real_path


def is_pdf_encrypted(file_path) -> bool:
    """Check if a PDF file is password-protected."""
    try:
        from pypdf import PdfReader
        reader = PdfReader(str(file_path))
        return reader.is_encrypted
    except Exception as e:
        logger.warning(f"PDF encryption check failed for {file_path}: {e}")
        return False


def check_encrypted_files(file_paths: list) -> list:
    """Return list of encrypted file basenames. Empty list means all OK."""
    encrypted = []
    for p in file_paths:
        if is_pdf_encrypted(p):
            encrypted.append(os.path.basename(str(p)))
    return encrypted


