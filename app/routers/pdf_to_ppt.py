import os
from pathlib import Path
from datetime import datetime
import logging
import zipfile

from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import FileResponse

from core.config import settings
from core.utils import validate_pdf_file, save_upload_file
from pdf_to_ppt import PDFToPPTConverter, PDFToPPTError


logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/tools/pdf-to-ppt", tags=["pdf-to-ppt"])


@router.post("/upload")
async def upload_pdf_for_ppt(files: list[UploadFile] = File(...)):
    if len(files) == 0:
        raise HTTPException(status_code=400, detail="En az 1 PDF dosyası gereklidir")
    if len(files) > settings.MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Maksimum {settings.MAX_FILES} dosya yüklenebilir")

    # Her dosyayı validate et
    for file in files:
        validate_pdf_file(file)
    
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
        logger.error(f"PDF→PPT upload failed: {e}")
        raise HTTPException(status_code=500, detail="Dosya yükleme sırasında hata oluştu")


@router.post("/process/{session_id}")
async def process_pdf_to_ppt(session_id: str, mode: str = "separate"):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    if not os.path.exists(session_dir):
        raise HTTPException(status_code=404, detail="Oturum bulunamadı veya süresi dolmuş")

    pdfs = list(Path(session_dir).glob("*.pdf"))
    if not pdfs:
        raise HTTPException(status_code=400, detail="PDF bulunamadı")

    converter = PDFToPPTConverter(temp_dir=session_dir)
    converted_files = []
    total_pages = 0
    
    try:
        if mode == "combined" and len(pdfs) > 1:
            # Tüm PDF'leri tek PowerPoint'te birleştir
            combined_result = converter.convert_combined([str(pdf) for pdf in pdfs])
            output_name = os.path.basename(combined_result.output_path)
            return {
                "success": True,
                "session_id": session_id,
                "output_file": output_name,
                "download_url": f"/api/tools/pdf-to-ppt/download/{session_id}/{output_name}",
                "file_count": len(pdfs),
                "page_count": combined_result.page_count,
                "is_zip": False,
                "mode": "combined"
            }
        else:
            # Her PDF'i ayrı PPT'e dönüştür (varsayılan davranış)
            for pdf_file in pdfs:
                result = converter.convert(str(pdf_file))
                converted_files.append({
                    "original_pdf": os.path.basename(pdf_file),
                    "ppt_file": os.path.basename(result.output_path),
                    "output_path": result.output_path,
                    "page_count": result.page_count
                })
                total_pages += result.page_count
            
            # Eğer birden fazla dosya varsa ZIP oluştur
            if len(converted_files) > 1:
                zip_filename = f"pdf_to_ppt_slides_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
                zip_path = os.path.join(session_dir, zip_filename)
                
                with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    for converted in converted_files:
                        zipf.write(converted["output_path"], converted["ppt_file"])
                
                return {
                    "success": True,
                    "session_id": session_id,
                    "output_file": zip_filename,
                    "download_url": f"/api/tools/pdf-to-ppt/download/{session_id}/{zip_filename}",
                    "file_count": len(converted_files),
                    "total_pages": total_pages,
                    "is_zip": True,
                    "mode": "separate"
                }
            else:
                # Tek dosya ise direkt döndür
                output_name = converted_files[0]["ppt_file"]
                return {
                    "success": True,
                    "session_id": session_id,
                    "output_file": output_name,
                    "download_url": f"/api/tools/pdf-to-ppt/download/{session_id}/{output_name}",
                    "file_count": 1,
                    "page_count": converted_files[0]["page_count"],
                    "is_zip": False,
                    "mode": "separate"
                }
            
    except PDFToPPTError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"PDF→PPT process error: {e}")
        raise HTTPException(status_code=500, detail="Dönüştürme sırasında hata oluştu")


@router.get("/download/{session_id}/{filename}")
async def download_ppt(session_id: str, filename: str):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    file_path = os.path.join(session_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    
    # ZIP dosyası ise application/zip, değilse PPT mime type
    if filename.endswith('.zip'):
        media = "application/zip"
    else:
        media = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    
    return FileResponse(path=file_path, media_type=media, filename=filename)


