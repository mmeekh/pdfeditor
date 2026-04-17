import os
from pathlib import Path
from datetime import datetime, timedelta
import logging

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

from core.config import settings
from core.utils import validate_pdf_file, save_upload_file, ensure_safe_path
from watermark import PDFWatermarker

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tools/watermark", tags=["watermark"])

@router.post("/upload")
async def upload_pdfs_for_watermark(files: list[UploadFile] = File(...)):
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
                    raise HTTPException(status_code=400, detail=f"Toplam boyut {settings.MAX_FILE_SIZE/(1024*1024)}MB sınırını aşıyor")
            path = Path(session_dir) / f"{idx}_{file.filename}"
            await save_upload_file(file, path)
            uploaded.append({"original_name": file.filename, "path": str(path), "size": getattr(file, "size", 0)})
        return {"session_id": session_id, "files": uploaded}
    except Exception as e:
        if os.path.exists(session_dir):
            import shutil
            shutil.rmtree(session_dir)
        logger.error(f"Watermark upload failed: {e}")
        raise

@router.post("/process/{session_id}")
async def process_watermark(
    session_id: str,
    text: str,
    position: str = "center",
    font_size: int = 36,
    color: str = "#000000",
    opacity: float = 0.5,
):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    if not os.path.exists(session_dir):
        raise HTTPException(status_code=404, detail="Oturum bulunamadı veya süresi dolmuş")
    files = [str(p) for p in Path(session_dir).glob("*.pdf")]
    def _upload_index_key(p: str) -> int:
        name = Path(p).name
        parts = name.split('_', 1)
        if len(parts) == 2 and parts[0].isdigit():
            return int(parts[0])
        return 0
    pdf_files = sorted(files, key=_upload_index_key)
    if not pdf_files:
        raise HTTPException(status_code=400, detail="PDF bulunamadı")

    watermarker = PDFWatermarker(temp_dir=session_dir)
    outputs = []
    for src in pdf_files:
        out_name = f"watermarked_{Path(src).name}"
        out_path = os.path.join(session_dir, out_name)
        watermarker.add_text_watermark(src, out_path, text, position, font_size, color, opacity)
        outputs.append({"input": os.path.basename(src), "output": out_name})

    zip_name = None
    if len(outputs) > 1:
        import zipfile
        zip_name = f"filigranli_{len(files)}_dosya.zip" if len(files) > 1 else f"filigranli.zip"
        zip_path = os.path.join(session_dir, zip_name)
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for o in outputs:
                zf.write(os.path.join(session_dir, o["output"]), arcname=o["output"])

    download_url = f"/api/tools/watermark/download/{session_id}/{zip_name}" if zip_name else f"/api/tools/watermark/download/{session_id}/{outputs[0]['output']}"

    return {
        "success": True,
        "session_id": session_id,
        "results": outputs,
        "zip_file": zip_name,
        "download_url": download_url,
    }

@router.get("/download/{session_id}/{filename}")
async def download_watermarked(session_id: str, filename: str):
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

    media = "application/zip" if filename.lower().endswith('.zip') else "application/pdf"
    return FileResponse(path=file_path, media_type=media, filename=filename)
