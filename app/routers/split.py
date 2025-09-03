import os
import shutil
from pathlib import Path
from datetime import datetime
import logging
import zipfile

from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import FileResponse

from core.config import settings
from core.utils import validate_pdf_file, save_upload_file
from split import PDFSplitter, PDFSplitError


logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/tools/split", tags=["split"])


@router.post("/upload")
async def upload_pdf_for_split(files: list[UploadFile] = File(...)):
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
    all_results = []
    total_outputs = 0
    
    try:
        if mode == "ranges" and len(pdf_files) > 1:
            # Çoklu PDF'ler için birleştirilmiş işlem
            if not pages:
                raise HTTPException(status_code=400, detail="Sayfa aralıkları boş olamaz")
            
            pdf_paths = [str(pdf) for pdf in pdf_files]
            result = splitter.split_combined_by_ranges(pdf_paths, pages)
            
            # Toplam sayfa sayısını hesapla
            total_pages = 0
            for pdf_path in pdf_paths:
                from PyPDF2 import PdfReader
                reader = PdfReader(pdf_path)
                total_pages += len(reader.pages)
            
            return {
                "success": True,
                "session_id": session_id,
                "zip_file": os.path.basename(result.zip_path),
                "download_url": f"/api/tools/split/download/{session_id}/{os.path.basename(result.zip_path)}",
                "file_count": len(pdf_files),
                "total_outputs": len(result.output_files),
                "total_pages": total_pages,
                "is_zip": True,
                "mode": "combined_ranges"
            }
        else:
            # Her PDF'i ayrı ayrı işle (every_n modu veya tek PDF)
            for pdf_file in pdf_files:
                input_pdf = str(pdf_file)
                pdf_name = os.path.basename(pdf_file)
                
                if mode == "ranges":
                    if not pages:
                        raise HTTPException(status_code=400, detail="Sayfa aralıkları boş olamaz")
                    result = splitter.split_by_ranges(input_pdf, pages)
                elif mode == "every_n":
                    if not every_n:
                        raise HTTPException(status_code=400, detail="Aralık değeri gerekli")
                    result = splitter.split_every_n(input_pdf, int(every_n))
                else:
                    raise HTTPException(status_code=400, detail="Geçersiz mod")

                all_results.append({
                    "original_pdf": pdf_name,
                    "output_files": [os.path.basename(p) for p in result.output_files],
                    "zip_path": result.zip_path
                })
                total_outputs += len(result.output_files)

        # Eğer birden fazla PDF varsa, tüm sonuçları tek ZIP'te birleştir
        if len(all_results) > 1:
            combined_zip_name = f"split_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
            combined_zip_path = os.path.join(session_dir, combined_zip_name)
            
            with zipfile.ZipFile(combined_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for result in all_results:
                    if result["zip_path"] and os.path.exists(result["zip_path"]):
                        # Her PDF'in kendi ZIP'ini ana ZIP'e ekle
                        pdf_name = os.path.splitext(result["original_pdf"])[0]
                        for output_file in result["output_files"]:
                            output_path = os.path.join(session_dir, output_file)
                            if os.path.exists(output_path):
                                zipf.write(output_path, f"{pdf_name}/{output_file}")

            return {
                "success": True,
                "session_id": session_id,
                "zip_file": combined_zip_name,
                "download_url": f"/api/tools/split/download/{session_id}/{combined_zip_name}",
                "file_count": len(all_results),
                "total_outputs": total_outputs,
                "is_zip": True
            }
        else:
            # Tek PDF ise orijinal davranış
            result = all_results[0]
            zip_name = os.path.basename(result["zip_path"]) if result["zip_path"] else None
            
            return {
                "success": True,
                "session_id": session_id,
                "outputs": result["output_files"],
                "zip_file": zip_name,
                "download_url": f"/api/tools/split/download/{session_id}/{zip_name}" if zip_name else None,
                "file_count": 1,
                "total_outputs": len(result["output_files"]),
                "is_zip": False
            }
            
    except PDFSplitError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Split process error: {e}")
        raise HTTPException(status_code=500, detail="PDF ayırma sırasında hata oluştu")


@router.get("/download/{session_id}/{filename}")
async def download_split_zip(session_id: str, filename: str):
    session_dir = os.path.join(settings.TEMP_DIR, session_id)
    file_path = os.path.join(session_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    return FileResponse(path=file_path, media_type="application/zip", filename=filename)


