import os
import shutil
import logging
import zipfile
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import List
from fastapi.responses import FileResponse

from core.config import settings
from core.utils import validate_pdf_file, save_upload_file
from split import PDFSplitter, PDFSplitError


logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/tools/split", tags=["split"])


@router.post("/upload")
async def upload_pdf_for_split(files: List[UploadFile] = File(...)):
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

    splitter = PDFSplitter(temp_dir=session_dir)
    all_outputs: list[str] = []
    for pdf in pdf_files:
        try:
            if mode == "ranges":
                if not pages:
                    raise HTTPException(status_code=400, detail="Sayfa aralıkları boş olamaz")
                result = splitter.split_by_ranges(str(pdf), pages)
            elif mode == "every_n":
                if not every_n:
                    raise HTTPException(status_code=400, detail="Aralık değeri gerekli")
                result = splitter.split_every_n(str(pdf), int(every_n))
            else:
                raise HTTPException(status_code=400, detail="Geçersiz mod")
            all_outputs.extend(result.output_files)
        except PDFSplitError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error(f"Split process error: {e}")
            raise HTTPException(status_code=500, detail="PDF ayırma sırasında hata oluştu")

    if not all_outputs:
        raise HTTPException(status_code=500, detail="Çıktı oluşturulamadı")

    zip_name = f"split_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
    zip_path = os.path.join(session_dir, zip_name)
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for f in all_outputs:
            zf.write(f, arcname=os.path.basename(f))

    output_files = [os.path.basename(p) for p in all_outputs]

    return {
        "success": True,
        "session_id": session_id,
        "outputs": output_files,
        "zip_file": zip_name,
        "download_url": f"/api/tools/split/download/{session_id}/{zip_name}",
    }


@router.get("/download/{session_id}/{filename}")
async def download_split_zip(session_id: str, filename: str):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    file_path = os.path.join(session_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    return FileResponse(path=file_path, media_type="application/zip", filename=filename)


