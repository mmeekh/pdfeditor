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
async def upload_pdfs_for_rotate(files: list[UploadFile] = File(...)):
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
        logger.error(f"Rotate upload failed: {e}")
        raise HTTPException(status_code=500, detail="Dosya yükleme sırasında hata oluştu")

@router.post("/process/{session_id}")
async def process_rotate(session_id: str, degrees: int = 90):
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

    rotator = PDFRotator(temp_dir=session_dir)
    outputs: list[str] = []
    for src in pdf_files:
        output_name = f"rotated_{Path(src).name}"
        output_path = os.path.join(session_dir, output_name)
        try:
            rotator.rotate(src, output_path, degrees)
            outputs.append(output_name)
        except Exception as e:
            logger.error(f"Rotate failed for {src}: {e}")
            continue

    if not outputs:
        raise HTTPException(status_code=500, detail="Döndürme sırasında hata oluştu")

    zip_name = None
    if len(outputs) > 1:
        import zipfile
        zip_name = f"rotated_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        zip_path = os.path.join(session_dir, zip_name)
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for o in outputs:
                zf.write(os.path.join(session_dir, o), arcname=o)

    return {
        "success": True,
        "session_id": session_id,
        "results": outputs,
        "zip_file": zip_name,
        "download_url": f"/api/tools/rotate/download/{session_id}/{zip_name}" if zip_name else f"/api/tools/rotate/download/{session_id}/{outputs[0]}",
    }

@router.get("/download/{session_id}/{filename}")
async def download_rotated(session_id: str, filename: str):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    file_path = os.path.join(session_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    return FileResponse(path=file_path, media_type="application/pdf", filename=filename)
