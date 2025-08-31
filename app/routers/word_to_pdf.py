import os
from pathlib import Path
from datetime import datetime
import logging

from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import FileResponse

from core.config import settings
from core.utils import validate_word_file, save_upload_file, sanitize_error_message, log_operation_safely
from word_to_pdf import WordToPDFConverter, WordToPDFError


logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/tools/word-to-pdf", tags=["word-to-pdf"])


@router.post("/upload")
async def upload_word_for_convert(file: UploadFile = File(...)):
    validate_word_file(file)
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
        logger.error(f"Word→PDF upload failed: {sanitize_error_message(e, 'Word→PDF')}")
        raise HTTPException(status_code=500, detail="Dosya yükleme sırasında hata oluştu")


@router.post("/process/{session_id}")
async def process_word_to_pdf(session_id: str):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    if not os.path.exists(session_dir):
        raise HTTPException(status_code=404, detail="Oturum bulunamadı veya süresi dolmuş")

    docs = [str(p) for p in Path(session_dir).glob("*.doc*")]
    if not docs:
        raise HTTPException(status_code=400, detail="Word dosyası bulunamadı")
    input_doc = docs[0]

    converter = WordToPDFConverter(temp_dir=session_dir)
    try:
        result = converter.convert(input_doc)
        output_name = os.path.basename(result.output_path)
        return {
            "success": True,
            "session_id": session_id,
            "output_file": output_name,
            "download_url": f"/api/tools/word-to-pdf/download/{session_id}/{output_name}",
        }
    except WordToPDFError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Word→PDF process error: {sanitize_error_message(e, 'Word→PDF')}")
        raise HTTPException(status_code=500, detail="Dönüştürme sırasında hata oluştu")


@router.get("/download/{session_id}/{filename}")
async def download_converted(session_id: str, filename: str):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    file_path = os.path.join(session_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    return FileResponse(path=file_path, media_type="application/pdf", filename=filename)


