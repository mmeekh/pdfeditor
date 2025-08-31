import os
import logging
import zipfile
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import List
from fastapi.responses import FileResponse

from core.config import settings
from core.utils import validate_pdf_file, save_upload_file
from pdf_to_ppt import PDFToPPTConverter, PDFToPPTError


logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/tools/pdf-to-ppt", tags=["pdf-to-ppt"])


@router.post("/upload")
async def upload_pdf_for_ppt(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="Dosya yüklenmedi")

    session_id = datetime.now().strftime("%Y%m%d_%H%M%S_") + os.urandom(4).hex()
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)

    saved = []
    try:
        for file in files:
            validate_pdf_file(file)
            file_path = Path(session_dir) / file.filename
            await save_upload_file(file, file_path)
            saved.append({
                "original_name": file.filename,
                "path": str(file_path),
                "size": getattr(file, "size", 0),
            })
        return {"session_id": session_id, "files": saved}
    except Exception as e:
        if os.path.exists(session_dir):
            import shutil
            shutil.rmtree(session_dir)
        logger.error(f"PDF→PPT upload failed: {e}")
        raise HTTPException(status_code=500, detail="Dosya yükleme sırasında hata oluştu")


@router.post("/process/{session_id}")
async def process_pdf_to_ppt(session_id: str):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    if not os.path.exists(session_dir):
        raise HTTPException(status_code=404, detail="Oturum bulunamadı veya süresi dolmuş")

    pdfs = list(Path(session_dir).glob("*.pdf"))
    if not pdfs:
        raise HTTPException(status_code=400, detail="PDF bulunamadı")

    converter = PDFToPPTConverter(temp_dir=session_dir)
    outputs = []
    for pdf in pdfs:
        try:
            result = converter.convert(str(pdf))
            outputs.append(result.output_path)
        except PDFToPPTError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error(f"PDF→PPT process error: {e}")
            raise HTTPException(status_code=500, detail="Dönüştürme sırasında hata oluştu")

    if len(outputs) == 1:
        output_name = os.path.basename(outputs[0])
    else:
        zip_name = f"pdf_to_ppt_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        zip_path = os.path.join(session_dir, zip_name)
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for out in outputs:
                zf.write(out, arcname=os.path.basename(out))
        output_name = zip_name

    return {
        "success": True,
        "session_id": session_id,
        "output_file": output_name,
        "download_url": f"/api/tools/pdf-to-ppt/download/{session_id}/{output_name}",
    }


@router.get("/download/{session_id}/{filename}")
async def download_ppt(session_id: str, filename: str):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    file_path = os.path.join(session_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    media = "application/zip" if filename.lower().endswith('.zip') else "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    return FileResponse(path=file_path, media_type=media, filename=filename)


