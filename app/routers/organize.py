import os
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from typing import List
import logging

from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks, Request
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

from core.config import settings
from core.utils import validate_pdf_file, save_upload_file, cleanup_old_files, ensure_safe_path
from organize import PDFOrganizer, PDFOrganizeError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tools/organize", tags=["organize"])


class PageItem(BaseModel):
    file_index: int
    page_number: int


class PageOrder(BaseModel):
    pages: List[PageItem]


@router.post("/upload")
async def upload_pdfs_for_organize(
    files: List[UploadFile] = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    if len(files) == 0:
        raise HTTPException(status_code=400, detail="En az 1 PDF dosyası gereklidir")
    if len(files) > settings.MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Maksimum {settings.MAX_FILES} dosya yüklenebilir")

    session_id = datetime.now().strftime("%Y%m%d_%H%M%S_") + os.urandom(4).hex()
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)

    uploaded_files = []
    total_size = 0

    try:
        for idx, file in enumerate(files):
            validate_pdf_file(file)
            if getattr(file, "size", None) is not None:
                total_size += file.size
                if total_size > settings.MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Toplam dosya boyutu {settings.MAX_FILE_SIZE/(1024*1024)}MB sınırını aşıyor",
                    )

            file_path = Path(session_dir) / f"{idx}_{file.filename}"
            await save_upload_file(file, file_path)

            uploaded_files.append(
                {
                    "original_name": file.filename,
                    "path": str(file_path),
                    "size": getattr(file, "size", None) or 0,
                }
            )
            logger.info(f"Dosya yüklendi: {file.filename}")

        background_tasks.add_task(cleanup_old_files)

        return {
            "session_id": session_id,
            "files": uploaded_files,
            "total_files": len(uploaded_files),
            "total_size_mb": round((total_size or 0) / (1024 * 1024), 2),
        }
    except Exception as e:
        if os.path.exists(session_dir):
            shutil.rmtree(session_dir)
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Dosya yükleme hatası: {str(e)}")
        raise HTTPException(status_code=500, detail="Dosya yükleme sırasında hata oluştu")


@router.post("/process/{session_id}")
async def process_organize(
    session_id: str,
    page_order: PageOrder,
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    if not os.path.exists(session_dir):
        raise HTTPException(status_code=404, detail="Oturum bulunamadı veya süresi dolmuş")

    try:
        files = [str(f) for f in Path(session_dir).glob("*.pdf")]
        if not files:
            raise HTTPException(status_code=400, detail="PDF dosyası bulunamadı")

        def _upload_index_key(p: str) -> int:
            name = Path(p).name
            parts = name.split('_', 1)
            if len(parts) == 2 and parts[0].isdigit():
                return int(parts[0])
            return 0

        pdf_files = sorted(files, key=_upload_index_key)

        if not page_order.pages:
            raise HTTPException(status_code=400, detail="Sayfa sırası boş")

        output_filename = f"organized_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        output_path = os.path.join(session_dir, output_filename)

        organizer = PDFOrganizer(temp_dir=session_dir)
        result_path = organizer.organize(
            pdf_files=pdf_files,
            page_order=[p.dict() for p in page_order.pages],
            output_path=output_path,
        )

        file_info = organizer.get_pdf_info(result_path)
        logger.info(f"PDF organize başarılı: {session_id}")

        return {
            "success": True,
            "session_id": session_id,
            "output_file": output_filename,
            "file_info": file_info,
            "download_url": f"/api/tools/organize/download/{session_id}/{output_filename}",
        }
    except PDFOrganizeError as e:
        logger.error(f"PDF organize hatası: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"İşlem hatası: {str(e)}")
        raise HTTPException(status_code=500, detail="PDF düzenleme sırasında hata oluştu")


@router.api_route("/download/{session_id}/{filename}", methods=["GET", "HEAD"])
async def download_organized_pdf(session_id: str, filename: str, request: Request):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    file_path = os.path.join(session_dir, filename)

    if not os.path.exists(session_dir):
        logger.warning(f"Session bulunamadı: {session_id}")
        raise HTTPException(
            status_code=404,
            detail=f"İndirme oturumu bulunamadı veya süresi dolmuş ({settings.SESSION_LIFETIME_MINUTES} dakika). Dosyaları tekrar yükleyip işleyin.",
        )

    if not os.path.exists(file_path) or not filename.endswith(".pdf"):
        logger.warning(f"Dosya bulunamadı: {file_path}")
        raise HTTPException(status_code=404, detail="Dosya bulunamadı veya silinmiş")

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

    if request.method == "HEAD":
        logger.info(f"HEAD request: {filename} (Session: {session_id})")
        return Response(
            status_code=200,
            headers={
                "Content-Type": "application/pdf",
                "Content-Length": str(os.path.getsize(file_path)),
                "Content-Disposition": f"attachment; filename={filename}",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )

    logger.info(f"Dosya indiriliyor: {filename} (Session: {session_id})")
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=filename,
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )
