import os
import shutil
from pathlib import Path
from datetime import datetime
import logging

from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import FileResponse

from core.config import settings
from core.utils import validate_pdf_file, save_upload_file
from split import PDFSplitter, PDFSplitError


logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/tools/split", tags=["split"])


@router.post("/upload")
async def upload_pdf_for_split(file: UploadFile = File(...)):
    validate_pdf_file(file)
    session_id = datetime.now().strftime("%Y%m%d_%H%M%S_") + os.urandom(4).hex()
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)

    try:
        file_path = Path(session_dir) / file.filename
        await save_upload_file(file, file_path)
        return {
            "session_id": session_id,
            "file": {"original_name": file.filename, "path": str(file_path), "size": getattr(file, "size", 0)},
        }
    except Exception as e:
        if os.path.exists(session_dir):
            shutil.rmtree(session_dir)
        logger.error(f"Split upload failed: {e}")
        raise HTTPException(status_code=500, detail="Dosya yükleme sırasında hata oluştu")


@router.post("/process/{session_id}")
async def process_split(
    session_id: str,
    mode: str = "ranges",
    pages: str | None = None,
    every_n: int | None = None,
):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    if not os.path.exists(session_dir):
        raise HTTPException(status_code=404, detail="Oturum bulunamadı veya süresi dolmuş")

    pdf_files = list(Path(session_dir).glob("*.pdf"))
    if not pdf_files:
        raise HTTPException(status_code=400, detail="PDF bulunamadı")
    input_pdf = str(pdf_files[0])

    splitter = PDFSplitter(temp_dir=session_dir)
    try:
        if mode == "ranges":
            if not pages:
                raise HTTPException(status_code=400, detail="Sayfa aralıkları boş olamaz")
            result = splitter.split_by_ranges(input_pdf, pages)
        elif mode == "every_n":
            if not every_n:
                raise HTTPException(status_code=400, detail="Aralık değeri gerekli")
            result = splitter.split_every_n(input_pdf, int(every_n))
        else:
            raise HTTPException(status_code=400, detail="Geçersiz mod")

        output_files = [os.path.basename(p) for p in result.output_files]
        zip_name = os.path.basename(result.zip_path) if result.zip_path else None

        return {
            "success": True,
            "session_id": session_id,
            "outputs": output_files,
            "zip_file": zip_name,
            "download_url": f"/api/tools/split/download/{session_id}/{zip_name}" if zip_name else None,
        }
    except PDFSplitError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Split process error: {e}")
        raise HTTPException(status_code=500, detail="PDF ayırma sırasında hata oluştu")


@router.get("/download/{session_id}/{filename}")
async def download_split_zip(session_id: str, filename: str):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    file_path = os.path.join(session_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    return FileResponse(path=file_path, media_type="application/zip", filename=filename)


