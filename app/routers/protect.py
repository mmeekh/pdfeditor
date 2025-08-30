import os
from pathlib import Path
from datetime import datetime
import logging

from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import FileResponse

from core.config import settings
from core.utils import validate_pdf_file, save_upload_file
from protect import PDFProtector, PDFProtectError, ProtectionOptions


logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/tools/protect", tags=["protect"])


@router.post("/upload")
async def upload_pdf_for_protect(file: UploadFile = File(...)):
    validate_pdf_file(file)
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
        logger.error(f"PDF→Protect upload failed: {e}")
        raise HTTPException(status_code=500, detail="Dosya yükleme sırasında hata oluştu")


@router.post("/process/{session_id}")
async def process_pdf_protect(
    session_id: str,
    user_password: str = Form(...),
    owner_password: str = Form(""),
    can_print: bool = Form(True),
    can_modify: bool = Form(False),
    can_copy: bool = Form(False),
    can_annotate: bool = Form(False),
    can_fill_forms: bool = Form(False),
    can_accessibility: bool = Form(False),
    can_assemble: bool = Form(False),
    can_modify_contents: bool = Form(False)
):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    if not os.path.exists(session_dir):
        raise HTTPException(status_code=404, detail="Oturum bulunamadı veya süresi dolmuş")

    pdfs = list(Path(session_dir).glob("*.pdf"))
    if not pdfs:
        raise HTTPException(status_code=400, detail="PDF bulunamadı")
    input_pdf = str(pdfs[0])

    # Şifreleme seçeneklerini oluştur
    options = ProtectionOptions(
        user_password=user_password,
        owner_password=owner_password if owner_password else None,
        can_print=can_print,
        can_modify=can_modify,
        can_copy=can_copy,
        can_annotate=can_annotate,
        can_fill_forms=can_fill_forms,
        can_accessibility=can_accessibility,
        can_assemble=can_assemble,
        can_modify_contents=can_modify_contents
    )

    protector = PDFProtector(temp_dir=session_dir)
    try:
        result = protector.protect(input_pdf, options)
        output_name = os.path.basename(result.output_path)
        return {
            "success": True,
            "session_id": session_id,
            "output_file": output_name,
            "protected": result.protected,
            "download_url": f"/api/tools/protect/download/{session_id}/{output_name}",
        }
    except PDFProtectError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"PDF→Protect process error: {e}")
        raise HTTPException(status_code=500, detail="Şifreleme sırasında hata oluştu")


@router.get("/download/{session_id}/{filename}")
async def download_protected_pdf(session_id: str, filename: str):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    file_path = os.path.join(session_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    return FileResponse(path=file_path, media_type="application/pdf", filename=filename)
