"""
PDF Düzenleme (Sayfa Sıralama/Silme) Modülü
PDFişlemleri.com için PDF sayfalarını yeniden sıralama ve silme işlemlerini yönetir.
"""

import os
import tempfile
import logging
from typing import List, Optional, Dict
from PyPDF2 import PdfReader, PdfWriter

logger = logging.getLogger(__name__)


class PDFOrganizeError(Exception):
    """PDF düzenleme işlemi sırasında oluşan hatalar için özel exception"""
    pass


class PDFOrganizer:
    """PDF sayfalarını yeniden düzenleme işlemlerini yöneten sınıf"""

    def __init__(self, temp_dir: Optional[str] = None):
        self.temp_dir = temp_dir or tempfile.gettempdir()

    def organize(self, pdf_files: List[str], page_order: List[Dict[str, int]], output_path: str) -> str:
        """Belirtilen sayfa sırasına göre PDF oluşturur.

        Args:
            pdf_files: Yüklenmiş PDF dosyalarının yol listesi
            page_order: {'file_index': int, 'page_number': int} içeren liste
            output_path: Oluşturulacak PDF'in yolu
        Returns:
            Çıktı PDF dosya yolu
        Raises:
            PDFOrganizeError: Geçersiz sayfa veya dosya durumlarında
        """
        if not page_order:
            raise PDFOrganizeError("Sayfa sırası boş")

        writer = PdfWriter()
        readers: Dict[int, PdfReader] = {}

        try:
            for item in page_order:
                file_index = item.get("file_index")
                page_number = item.get("page_number")

                if file_index is None or page_number is None:
                    raise PDFOrganizeError("Geçersiz sayfa bilgisi")

                if file_index < 0 or file_index >= len(pdf_files):
                    raise PDFOrganizeError(f"Geçersiz dosya indexi: {file_index}")

                if file_index not in readers:
                    readers[file_index] = PdfReader(pdf_files[file_index])

                reader = readers[file_index]
                if page_number < 1 or page_number > len(reader.pages):
                    raise PDFOrganizeError(f"Geçersiz sayfa numarası: {page_number}")

                writer.add_page(reader.pages[page_number - 1])

            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "wb") as f:
                writer.write(f)

            logger.info("PDF organize işlemi tamamlandı: %s", output_path)
            return output_path
        except Exception as e:
            logger.error("PDF organize hatası: %s", e)
            raise PDFOrganizeError(str(e))

    def get_pdf_info(self, pdf_path: str) -> dict:
        """PDF dosyası hakkında temel bilgi döndürür"""
        reader = PdfReader(pdf_path)
        file_size_mb = round(os.path.getsize(pdf_path) / (1024 * 1024), 2)
        return {"page_count": len(reader.pages), "file_size_mb": file_size_mb}
