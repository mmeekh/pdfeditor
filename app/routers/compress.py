import os
from pathlib import Path
from datetime import datetime, timedelta
import logging

from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import FileResponse

from core.config import settings
from core.session_files import uploaded_pdfs
from core.utils import validate_pdf_file, save_upload_file, ensure_safe_path, check_encrypted_files
from compress import PDFCompressor


logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/tools/compress", tags=["compress"])


@router.post("/upload")
async def upload_pdfs_for_compress(files: list[UploadFile] = File(...)):
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
        return {"encrypted_files": check_encrypted_files([str(p) for p in uploaded_pdfs(session_dir)]),
            "session_id": session_id, "files": uploaded}
    except Exception as e:
        if os.path.exists(session_dir):
            import shutil
            shutil.rmtree(session_dir)
        logger.error(f"Compress upload failed: {e}")
        raise


@router.post("/process/{session_id}")
async def process_compress(session_id: str, level: str = "medium", target_kb: int | None = None):
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

    compressor = PDFCompressor(temp_dir=session_dir)
    outputs = []
    total_in = 0
    total_out = 0

    def _compress_to_target(src_path: str, target_bytes: int):
        """Hedef boyuta en yakın level'ı bul (level sırası ile dene)."""
        levels = ["low", "medium", "high", "extreme"]
        best = None  # (abs_diff, result_tuple, level)
        for lv in levels:
            try:
                out_path, metrics = compressor.compress(src_path, level=lv)
            except Exception as e:
                logger.warning(f"Compress level {lv} failed for {src_path}: {e}")
                continue
            diff = abs(metrics.output_size_bytes - target_bytes)
            candidate = (diff, (out_path, metrics), lv)
            if best is None or diff < best[0]:
                best = candidate
            # Hedefin altına düştüysek erken çık (binary-search benzeri kısa devre)
            if metrics.output_size_bytes <= target_bytes:
                return best[1], best[2]
        if best is None:
            raise RuntimeError("Hiçbir level sıkıştıramadı")
        return best[1], best[2]

    for src in pdf_files:
        try:
            if target_kb is not None and target_kb > 0:
                target_bytes = int(target_kb) * 1024
                (out_path, metrics), picked_level = _compress_to_target(src, target_bytes)
                outputs.append({
                    "input": os.path.basename(src),
                    "output": os.path.basename(out_path),
                    "input_bytes": metrics.input_size_bytes,
                    "output_bytes": metrics.output_size_bytes,
                    "saved_percent": metrics.saved_percent,
                    "picked_level": picked_level,
                    "target_kb": target_kb,
                })
            else:
                out_path, metrics = compressor.compress(src, level=level)
                outputs.append({
                    "input": os.path.basename(src),
                    "output": os.path.basename(out_path),
                    "input_bytes": metrics.input_size_bytes,
                    "output_bytes": metrics.output_size_bytes,
                    "saved_percent": metrics.saved_percent,
                    # 2026-08-03: motor <%3 kazançta otomatik kademe yükseltir;
                    # kullanıcıya dürüst bilgi için gerçekte kullanılan seviye.
                    "used_level": getattr(metrics, "used_level", level),
                    "requested_level": level,
                })
            total_in += metrics.input_size_bytes
            total_out += metrics.output_size_bytes
        except Exception as e:
            logger.error(f"Compress failed for {src}: {e}")
            continue

    zip_name = None
    if len(outputs) > 1:
        import zipfile
        zip_name = f"sikistirilmis_{len(outputs)}_dosya.zip" if len(outputs) > 1 else f"sikistirilmis.zip"
        zip_path = os.path.join(session_dir, zip_name)
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for o in outputs:
                zf.write(os.path.join(session_dir, o["output"]), arcname=o["output"])

    summary = {
        "total_input_bytes": total_in,
        "total_output_bytes": total_out,
        "total_saved_percent": round((max(0, total_in - total_out) * 100.0 / total_in), 2) if total_in else 0.0,
    }

    return {
        "success": True,
        "session_id": session_id,
        "results": outputs,
        "summary": summary,
        "zip_file": zip_name,
        "download_url": f"/api/tools/compress/download/{session_id}/{zip_name}" if zip_name else (f"/api/tools/compress/download/{session_id}/{outputs[0]['output']}" if outputs else None),
    }


@router.get("/download/{session_id}/{filename}")
async def download_compress(session_id: str, filename: str):
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


