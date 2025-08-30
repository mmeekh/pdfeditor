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
async def upload_pdfs_for_protect(files: list[UploadFile] = File(...)):
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
        can_modify_contents=can_modify_contents,
    )

    protector = PDFProtector(temp_dir=session_dir)
    results: list[dict] = []
    try:
        for src in pdf_files:
            res = protector.protect(src, options)
            out_name = os.path.basename(res.output_path)
            results.append({"output_file": out_name, "protected": res.protected})
    except PDFProtectError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"PDF→Protect process error: {e}")
        raise HTTPException(status_code=500, detail="Şifreleme sırasında hata oluştu")

    if not results:
        raise HTTPException(status_code=500, detail="Şifreleme sırasında hata oluştu")

    zip_name = None
    if len(results) > 1:
        import zipfile
        zip_name = f"protected_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        zip_path = os.path.join(session_dir, zip_name)
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for r in results:
                zf.write(os.path.join(session_dir, r["output_file"]), arcname=r["output_file"])

    return {
        "success": True,
        "session_id": session_id,
        "results": results,
        "zip_file": zip_name,
        "download_url": f"/api/tools/protect/download/{session_id}/{zip_name}" if zip_name else f"/api/tools/protect/download/{session_id}/{results[0]['output_file']}",
    }


@router.get("/download/{session_id}/{filename}")
async def download_protected_pdf(session_id: str, filename: str):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    file_path = os.path.join(session_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    return FileResponse(path=file_path, media_type="application/pdf", filename=filename)
