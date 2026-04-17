import os
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import List
import logging

from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks, Request
from fastapi.responses import FileResponse, Response

from core.config import settings
from core.utils import validate_pdf_file, save_upload_file, cleanup_old_files, ensure_safe_path
from merge import PDFMerger, PDFMergeError


logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/tools/merge", tags=["merge"])


@router.post("/upload")
async def upload_pdfs_for_merge(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
):
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="En az 2 PDF dosyası gereklidir")
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

            uploaded_files.append({
                "original_name": file.filename,
                "path": str(file_path),
                "size": getattr(file, "size", None) or 0,
            })
            logger.info(f"Dosya yüklendi: {file.filename}")

        if background_tasks:
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
async def process_merge(
    session_id: str,
    background_tasks: BackgroundTasks,
    sort_by_name: bool = False,
):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    if not os.path.exists(session_dir):
        raise HTTPException(status_code=404, detail="Oturum bulunamadı veya süresi dolmuş")

    try:
        files = [str(f) for f in Path(session_dir).glob("*.pdf")]
        if len(files) < 2:
            raise HTTPException(status_code=400, detail="Yetersiz PDF dosyası")
        # Determine processing order
        if sort_by_name:
            pdf_files = files  # Sorting by original name will be handled inside PDFMerger
        else:
            def _upload_index_key(p: str) -> int:
                name = Path(p).name
                parts = name.split('_', 1)
                if len(parts) == 2 and parts[0].isdigit():
                    return int(parts[0])
                return 0
            pdf_files = sorted(files, key=_upload_index_key)

        # Akıllı isim: N dosya → 'birlestirilmis_N_dosya.pdf'
        output_filename = f"birlestirilmis_{len(files)}_dosya.pdf"
        output_path = os.path.join(session_dir, output_filename)

        merger = PDFMerger(temp_dir=session_dir)
        result_path = merger.merge_pdfs(
            pdf_files=pdf_files,
            output_path=output_path,
            sort_by_name=sort_by_name,
        )

        file_info = merger.get_pdf_info(result_path)
        logger.info(f"PDF birleştirme başarılı: {session_id}")

        return {
            "success": True,
            "session_id": session_id,
            "output_file": output_filename,
            "file_info": file_info,
            "download_url": f"/api/tools/merge/download/{session_id}/{output_filename}",
        }
    except PDFMergeError as e:
        logger.error(f"PDF birleştirme hatası: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"İşlem hatası: {str(e)}")
        raise HTTPException(status_code=500, detail="PDF birleştirme sırasında hata oluştu")


@router.api_route("/download/{session_id}/{filename}", methods=["GET", "HEAD"])
async def download_merged_pdf(session_id: str, filename: str, request: Request):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    file_path = os.path.join(session_dir, filename)

    if not os.path.exists(session_dir):
        logger.warning(f"Session bulunamadı: {session_id}")
        raise HTTPException(
            status_code=404,
            detail=f"İndirme oturumu bulunamadı veya süresi dolmuş ({settings.SESSION_LIFETIME_MINUTES} dakika). Dosyaları tekrar yükleyip işleyin.",
        )

    if not os.path.exists(file_path) or not filename.endswith('.pdf'):
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
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Expose-Headers": "Content-Disposition, Content-Length, Content-Type"
        },
    )


