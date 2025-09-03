import os
from pathlib import Path
from datetime import datetime
import logging
import zipfile

from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import FileResponse

from core.config import settings
from core.utils import validate_word_file, save_upload_file
from word_to_pdf import WordToPDFConverter, WordToPDFError


logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/tools/word-to-pdf", tags=["word-to-pdf"])


@router.post("/upload")
async def upload_word_for_convert(files: list[UploadFile] = File(...)):
    if len(files) == 0:
        raise HTTPException(status_code=400, detail="En az 1 Word dosyası gereklidir")
    if len(files) > settings.MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Maksimum {settings.MAX_FILES} dosya yüklenebilir")

    # Her dosyayı validate et
    for file in files:
        validate_word_file(file)
    
    session_id = datetime.now().strftime("%Y%m%d_%H%M%S_") + os.urandom(4).hex()
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)

    total_size = 0
    try:
        uploaded_files = []
        for file in files:
            if getattr(file, "size", None) is not None:
                total_size += file.size
                if total_size > settings.MAX_FILE_SIZE:
                    raise HTTPException(status_code=400, detail=f"Toplam boyut {settings.MAX_FILE_SIZE/(1024*1024)}MB sınırını aşıyor")
            
            file_path = Path(session_dir) / file.filename
            await save_upload_file(file, file_path)
            uploaded_files.append({
                "original_name": file.filename,
                "path": str(file_path),
                "size": getattr(file, "size", 0)
            })
        
        return {
            "session_id": session_id, 
            "files": uploaded_files,
            "file_count": len(uploaded_files)
        }
    except Exception as e:
        if os.path.exists(session_dir):
            import shutil
            shutil.rmtree(session_dir)
        logger.error(f"Word→PDF upload failed: {e}")
        raise HTTPException(status_code=500, detail="Dosya yükleme sırasında hata oluştu")


@router.post("/process/{session_id}")
async def process_word_to_pdf(session_id: str):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    if not os.path.exists(session_dir):
        raise HTTPException(status_code=404, detail="Oturum bulunamadı veya süresi dolmuş")

    docs = [str(p) for p in Path(session_dir).glob("*.doc*")]
    if not docs:
        raise HTTPException(status_code=400, detail="Word dosyası bulunamadı")

    converter = WordToPDFConverter(temp_dir=session_dir)
    converted_files = []
    
    try:
        # Her Word dosyasını PDF'e dönüştür
        for doc_file in docs:
            result = converter.convert(doc_file)
            converted_files.append({
                "original_doc": os.path.basename(doc_file),
                "pdf_file": os.path.basename(result.output_path),
                "output_path": result.output_path
            })
        
        # Eğer birden fazla dosya varsa ZIP oluştur
        if len(converted_files) > 1:
            zip_filename = f"word_to_pdf_converted_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
            zip_path = os.path.join(session_dir, zip_filename)
            
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for converted in converted_files:
                    zipf.write(converted["output_path"], converted["pdf_file"])
            
            return {
                "success": True,
                "session_id": session_id,
                "output_file": zip_filename,
                "download_url": f"/api/tools/word-to-pdf/download/{session_id}/{zip_filename}",
                "file_count": len(converted_files),
                "is_zip": True
            }
        else:
            # Tek dosya ise direkt döndür
            output_name = converted_files[0]["pdf_file"]
            return {
                "success": True,
                "session_id": session_id,
                "output_file": output_name,
                "download_url": f"/api/tools/word-to-pdf/download/{session_id}/{output_name}",
                "file_count": 1,
                "is_zip": False
            }
            
    except WordToPDFError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Word→PDF process error: {e}")
        raise HTTPException(status_code=500, detail="Dönüştürme sırasında hata oluştu")


@router.get("/download/{session_id}/{filename}")
async def download_converted(session_id: str, filename: str):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    file_path = os.path.join(session_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    
    # ZIP dosyası ise application/zip, değilse PDF mime type
    if filename.endswith('.zip'):
        media = "application/zip"
    else:
        media = "application/pdf"
    
    return FileResponse(path=file_path, media_type=media, filename=filename)


