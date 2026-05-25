import os
import re
import json
from pathlib import Path
from datetime import datetime, timedelta
import logging

from fastapi import APIRouter, File, UploadFile, HTTPException, Form, Request
from fastapi.responses import FileResponse

from core.config import settings
from core.utils import validate_pdf_file, save_upload_file, ensure_safe_path
from sign import PDFSigner

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tools/sign", tags=["sign"])

# NOTE: In-memory rate limiter kaldırıldı (memory leak: key-per-minute birikiyordu).
# SlowAPI middleware main.py'da global default_limits=["60/minute"] uyguluyor.

def validate_input_sanitization(text: str, field_name: str) -> str:
    """Input sanitization ve validation"""
    if not text or len(text.strip()) == 0:
        raise HTTPException(status_code=400, detail=f"{field_name} boş olamaz")
    
    # XSS koruması - HTML/JavaScript tag'lerini temizle
    text = re.sub(r'<[^>]*>', '', text)
    
    # SQL injection koruması - tehlikeli karakterleri temizle
    text = re.sub(r'[;\'\"\\]', '', text)
    
    # Uzunluk kontrolü
    if len(text) > 100:
        raise HTTPException(status_code=400, detail=f"{field_name} çok uzun (maksimum 100 karakter)")
    
    return text.strip()

def validate_signature_data(signature_data: str) -> str:
    """İmza verisi validation"""
    if not signature_data:
        raise HTTPException(status_code=400, detail="İmza verisi gereklidir")
    
    # Base64 format kontrolü
    if not signature_data.startswith('data:image/'):
        raise HTTPException(status_code=400, detail="Geçersiz imza formatı")
    
    # Boyut kontrolü (maksimum 1MB)
    if len(signature_data) > 1024 * 1024:
        raise HTTPException(status_code=400, detail="İmza dosyası çok büyük (maksimum 1MB)")
    
    return signature_data

def validate_signature_positions(positions_str: str) -> dict:
    """İmza pozisyonları validation"""
    try:
        positions = json.loads(positions_str)
        if not isinstance(positions, dict):
            raise ValueError("Pozisyonlar dict formatında olmalı")
        
        # Her pozisyon için validation
        for file_idx, pages in positions.items():
            if not isinstance(pages, dict):
                continue
            for page_num, pos in pages.items():
                if not isinstance(pos, dict):
                    continue
                # Koordinat kontrolü
                for coord in ['x', 'y', 'pdfX', 'pdfY', 'relativeX', 'relativeY']:
                    if coord in pos and not isinstance(pos[coord], (int, float)):
                        raise ValueError(f"Geçersiz koordinat: {coord}")
        
        return positions
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Geçersiz pozisyon formatı")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/upload")
async def upload_pdfs_for_sign(request: Request, files: list[UploadFile] = File(...)):
    # Rate limit SlowAPI tarafından (main.py) global olarak uygulanıyor.
    client_ip = request.client.host if request.client else "unknown"

    # Güvenlik loglama
    logger.info(f"Sign upload request from IP: {client_ip}, Files: {len(files)}")
    
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
        logger.error(f"Sign upload failed: {e}")
        raise


@router.post("/process/{session_id}")
async def process_sign(
    request: Request,
    session_id: str,
    name: str = Form(...),
    surname: str = Form(...),
    signature_data: str = Form(...),  # Base64 encoded signature image
    signature_type: str = Form(...),  # "drawn" or "uploaded"
    opacity: float = Form(0.8),
    selected_files: str = Form(...),  # JSON string of selected file indices
    signature_positions: str = Form("{}")  # JSON string of signature positions
):
    # Rate limit SlowAPI tarafından (main.py) global olarak uygulanıyor.
    client_ip = request.client.host if request.client else "unknown"

    # Güvenlik loglama
    logger.info(f"Sign process request from IP: {client_ip}, Session: {session_id}")
    
    # Input validation
    name = validate_input_sanitization(name, "İsim")
    surname = validate_input_sanitization(surname, "Soyisim")
    signature_data = validate_signature_data(signature_data)
    
    # Signature type validation
    if signature_type not in ["drawn", "uploaded"]:
        raise HTTPException(status_code=400, detail="Geçersiz imza türü")
    
    # Opacity validation
    if not (0.1 <= opacity <= 1.0):
        raise HTTPException(status_code=400, detail="Opaklık 0.1 ile 1.0 arasında olmalı")
    
    # Selected files validation
    try:
        selected_files_list = json.loads(selected_files)
        if not isinstance(selected_files_list, list):
            raise ValueError("Seçili dosyalar liste formatında olmalı")
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=400, detail="Geçersiz dosya seçimi formatı")
    
    # Signature positions validation
    positions = validate_signature_positions(signature_positions)
    
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    if not os.path.exists(session_dir):
        raise HTTPException(status_code=404, detail="Oturum bulunamadı veya süresi dolmuş")

    files = [str(p) for p in Path(session_dir).glob("*.pdf")]
    def _upload_index_key(p: str) -> int:
        name = Path(p).name
        parts = name.split('_', 1)
        if len(parts) == 2 and parts[0].isdigit():
            return int(parts[0])
        return 0
    pdf_files = sorted(files, key=_upload_index_key)
    if not pdf_files:
        raise HTTPException(status_code=400, detail="PDF bulunamadı")

    # Use validated data
    selected_indices = selected_files_list

    signer = PDFSigner(temp_dir=session_dir)
    outputs = []
    total_processed = 0

    for idx, src in enumerate(pdf_files):
        if idx not in selected_indices:
            continue
            
        try:
            # Bu dosya için pozisyon bilgilerini al
            file_positions = positions.get(str(idx), {})
            
            out_path = signer.sign_pdf(
                src, 
                name=name,
                surname=surname,
                signature_data=signature_data,
                signature_type=signature_type,
                opacity=opacity,
                positions=file_positions
            )
            outputs.append({
                "input": os.path.basename(src),
                "output": os.path.basename(out_path),
                "signed": True
            })
            total_processed += 1
        except Exception as e:
            logger.error(f"Sign failed for {src}: {e}", exc_info=True)
            outputs.append({
                "input": os.path.basename(src),
                "output": None,
                "signed": False,
                "error": str(e)
            })

    zip_name = None
    if len(outputs) > 1:
        import zipfile
        zip_name = f"imzali_{len(selected_indices)}_dosya.zip" if len(selected_indices) > 1 else f"imzali.zip"
        zip_path = os.path.join(session_dir, zip_name)
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for o in outputs:
                if o["signed"] and o["output"]:
                    zf.write(os.path.join(session_dir, o["output"]), arcname=o["output"])

    summary = {
        "total_files": len(selected_indices),
        "successfully_signed": total_processed,
        "failed": len(selected_indices) - total_processed
    }

    return {
        "success": True,
        "session_id": session_id,
        "results": outputs,
        "summary": summary,
        "zip_file": zip_name,
        "download_url": f"/api/tools/sign/download/{session_id}/{zip_name}" if zip_name else (f"/api/tools/sign/download/{session_id}/{outputs[0]['output']}" if outputs and outputs[0]['signed'] else None),
    }


@router.get("/download/{session_id}/{filename}")
async def download_sign(session_id: str, filename: str):
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
