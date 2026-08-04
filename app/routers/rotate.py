import os
import json
from pathlib import Path
from datetime import datetime, timedelta
import logging

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from PyPDF2 import PdfReader as PypdfReader, PdfWriter as PypdfWriter

from core.config import settings
from core.session_files import uploaded_pdfs
from core.utils import validate_pdf_file, save_upload_file, ensure_safe_path
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
        logger.error(f"Rotate upload failed: {e}")
        raise

@router.post("/process/{session_id}")
async def process_rotate(session_id: str, degrees: int = 90, page_rotations: str | None = None):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    if not os.path.exists(session_dir):
        raise HTTPException(status_code=404, detail="Oturum bulunamadı veya süresi dolmuş")

    files = [str(p) for p in uploaded_pdfs(session_dir)]
    def _upload_index_key(p: str) -> int:
        name = Path(p).name
        parts = name.split('_', 1)
        if len(parts) == 2 and parts[0].isdigit():
            return int(parts[0])
        return 0
    pdf_files = sorted(files, key=_upload_index_key)
    if not pdf_files:
        raise HTTPException(status_code=400, detail="PDF bulunamadı")

    # Sayfa bazlı rotation map'i parse et (varsa)
    rotation_map = None
    if page_rotations:
        try:
            parsed = json.loads(page_rotations)
            if isinstance(parsed, dict):
                rotation_map = {}
                for k, v in parsed.items():
                    # key format: "fileIndex_pageNumber"
                    try:
                        fi_str, pn_str = str(k).split('_', 1)
                        fi = int(fi_str)
                        pn = int(pn_str)
                        deg = int(v)
                        rotation_map.setdefault(fi, {})[pn] = deg
                    except Exception:
                        continue
        except Exception as e:
            logger.warning(f"page_rotations parse failed: {e}")
            rotation_map = None

    rotator = PDFRotator(temp_dir=session_dir)
    outputs = []
    for idx, src in enumerate(pdf_files):
        out_name = f"rotated_{Path(src).name}"
        out_path = os.path.join(session_dir, out_name)

        if rotation_map is not None:
            # Sayfa bazlı rotate: pypdf ile her sayfaya ayrı açı uygula
            file_rotations = rotation_map.get(idx, {})
            try:
                reader = PypdfReader(src)
                writer = PypdfWriter()
                for pi, page in enumerate(reader.pages, start=1):
                    deg = int(file_rotations.get(pi, 0)) % 360
                    if deg != 0:
                        page.rotate(deg)
                    writer.add_page(page)
                with open(out_path, "wb") as f:
                    writer.write(f)
            except Exception as e:
                logger.error(f"Page-based rotate failed for {src}: {e}")
                raise HTTPException(status_code=500, detail=f"Sayfa bazlı döndürme hatası: {e}")
        else:
            rotator.rotate(src, out_path, degrees)

        outputs.append({"input": os.path.basename(src), "output": out_name})

    zip_name = None
    if len(outputs) > 1:
        import zipfile
        zip_name = f"dondurulmus_{len(files)}_dosya.zip" if len(files) > 1 else f"dondurulmus.zip"
        zip_path = os.path.join(session_dir, zip_name)
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for o in outputs:
                zf.write(os.path.join(session_dir, o["output"]), arcname=o["output"])

    download_url = f"/api/tools/rotate/download/{session_id}/{zip_name}" if zip_name else f"/api/tools/rotate/download/{session_id}/{outputs[0]['output']}"

    return {
        "success": True,
        "session_id": session_id,
        "results": outputs,
        "zip_file": zip_name,
        "download_url": download_url,
    }

@router.get("/download/{session_id}/{filename}")
async def download_rotated(session_id: str, filename: str):
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
