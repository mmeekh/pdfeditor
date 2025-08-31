"""
PDF Birleştirme Modülü
PDFişlemleri.com için PDF birleştirme işlemlerini yönetir.
"""

import os
import tempfile
from typing import List, Optional
from pathlib import Path
import logging
from PyPDF2 import PdfMerger, PdfReader
from datetime import datetime

from core.utils import sanitize_error_message

# Logger ayarla
logger = logging.getLogger(__name__)


class PDFMergeError(Exception):
    """PDF birleştirme işlemi sırasında oluşan hatalar için özel exception"""
    pass


class PDFMerger:
    """PDF birleştirme işlemlerini yöneten sınıf"""
    
    def __init__(self, temp_dir: Optional[str] = None):
        """
        PDFMerger başlatıcı
        
        Args:
            temp_dir: Geçici dosyalar için kullanılacak dizin
        """
        self.temp_dir = temp_dir or tempfile.gettempdir()
        self.merger = None
        
    def validate_pdf(self, file_path: str) -> bool:
        """
        PDF dosyasının geçerli olup olmadığını kontrol eder
        
        Args:
            file_path: Kontrol edilecek PDF dosyasının yolu
            
        Returns:
            bool: Dosya geçerliyse True, değilse False
        """
        try:
            with open(file_path, 'rb') as file:
                PdfReader(file)
            return True
        except Exception as e:
            logger.error(f"PDF doğrulama hatası: {sanitize_error_message(e, 'Doğrulama')}")
            return False
    
    def merge_pdfs(self, 
                   pdf_files: List[str], 
                   output_path: str,
                   sort_by_name: bool = False) -> str:
        """
        Birden fazla PDF dosyasını birleştirir
        
        Args:
            pdf_files: Birleştirilecek PDF dosyalarının yol listesi
            output_path: Çıktı dosyasının kaydedileceği yol
            sort_by_name: Dosyaları ada göre sıralayıp birleştir
            
        Returns:
            str: Oluşturulan birleştirilmiş PDF dosyasının yolu
            
        Raises:
            PDFMergeError: Birleştirme işlemi sırasında hata oluşursa
        """
        if not pdf_files:
            raise PDFMergeError("Birleştirilecek PDF dosyası bulunamadı")
        
        if len(pdf_files) == 1:
            raise PDFMergeError("En az 2 PDF dosyası gereklidir")
        
        # Dosyaları sırala (istenirse)
        if sort_by_name:
            def _alpha_key(path_str: str) -> str:
                name = Path(path_str).name
                parts = name.split('_', 1)
                # Yükleme sırasında eklenen indeks önekini yoksay
                original = parts[1] if len(parts) == 2 and parts[0].isdigit() else name
                return original.lower()
            pdf_files = sorted(pdf_files, key=_alpha_key)
        
        # Tüm dosyaları doğrula
        for pdf_file in pdf_files:
            if not os.path.exists(pdf_file) or not self.validate_pdf(pdf_file):
                raise PDFMergeError("Geçersiz PDF dosyası")
        
        # Birleştirme işlemi
        try:
            self.merger = PdfMerger()
            
            for pdf_file in pdf_files:
                self.merger.append(pdf_file)
            
            # Çıktı dizinini oluştur
            output_dir = os.path.dirname(output_path)
            if output_dir and not os.path.exists(output_dir):
                os.makedirs(output_dir, exist_ok=True)
            
            # Birleştirilmiş PDF'i kaydet
            with open(output_path, 'wb') as output_file:
                self.merger.write(output_file)
            
            logger.info("PDF birleştirme başarılı")
            return output_path

        except Exception as e:
            logger.error(f"PDF birleştirme hatası: {sanitize_error_message(e, 'Birleştirme')}")
            raise PDFMergeError("Birleştirme işlemi başarısız")
        finally:
            if self.merger:
                self.merger.close()
    
    def merge_pdfs_with_ranges(self, 
                              pdf_configs: List[dict], 
                              output_path: str) -> str:
        """
        PDF dosyalarını belirli sayfa aralıklarıyla birleştirir
        
        Args:
            pdf_configs: Her bir PDF için yapılandırma listesi
                        [{"path": "dosya.pdf", "pages": "1-3,5,7-9"}, ...]
            output_path: Çıktı dosyasının yolu
            
        Returns:
            str: Oluşturulan PDF dosyasının yolu
        """
        if not pdf_configs:
            raise PDFMergeError("Birleştirilecek PDF yapılandırması bulunamadı")
        
        try:
            self.merger = PdfMerger()
            
            for config in pdf_configs:
                pdf_path = config.get('path')
                pages = config.get('pages', None)
                
                if not pdf_path or not os.path.exists(pdf_path):
                    raise PDFMergeError("Geçersiz dosya yolu")
                
                if pages:
                    # Sayfa aralıklarını parse et
                    page_ranges = self._parse_page_ranges(pages)
                    for start, end in page_ranges:
                        self.merger.append(pdf_path, pages=(start-1, end))
                else:
                    # Tüm sayfaları ekle
                    self.merger.append(pdf_path)
            
            # Çıktıyı kaydet
            with open(output_path, 'wb') as output_file:
                self.merger.write(output_file)
            
            return output_path
            
        except Exception as e:
            logger.error(f"Sayfa aralıklı birleştirme hatası: {sanitize_error_message(e, 'Birleştirme')}")
            raise PDFMergeError("İşlem başarısız")
        finally:
            if self.merger:
                self.merger.close()
    
    def _parse_page_ranges(self, pages_str: str) -> List[tuple]:
        """
        Sayfa aralık string'ini parse eder
        Örnek: "1-3,5,7-9" -> [(1,3), (5,5), (7,9)]
        """
        ranges = []
        parts = pages_str.replace(' ', '').split(',')
        
        for part in parts:
            if '-' in part:
                start, end = map(int, part.split('-'))
                ranges.append((start, end))
            else:
                page = int(part)
                ranges.append((page, page))
        
        return ranges
    
    def get_pdf_info(self, pdf_path: str) -> dict:
        """
        PDF dosyası hakkında bilgi döndürür
        
        Args:
            pdf_path: PDF dosyasının yolu
            
        Returns:
            dict: PDF bilgileri (sayfa sayısı, boyut, vb.)
        """
        try:
            file_size = os.path.getsize(pdf_path) / (1024 * 1024)  # MB
            
            with open(pdf_path, 'rb') as file:
                reader = PdfReader(file)
                page_count = len(reader.pages)

                # Metadata bilgileri
                metadata = reader.metadata if reader.metadata else {}

                return {
                    'file_name': os.path.basename(pdf_path),
                    'page_count': page_count,
                    'file_size_mb': round(file_size, 2),
                    'title': metadata.get('/Title', ''),
                    'author': metadata.get('/Author', ''),
                    'creation_date': metadata.get('/CreationDate', ''),
                    'is_encrypted': reader.is_encrypted
                }

        except Exception as e:
            logger.error(f"PDF bilgi alma hatası: {sanitize_error_message(e, 'Bilgi alma')}")
            return None
    
    def create_temp_file(self, prefix: str = "merged_", suffix: str = ".pdf") -> str:
        """
        Geçici bir dosya oluşturur
        
        Returns:
            str: Oluşturulan geçici dosyanın yolu
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{prefix}{timestamp}{suffix}"
        return os.path.join(self.temp_dir, filename)


# Kullanım örneği
if __name__ == "__main__":
    # Test için basit bir örnek
    merger = PDFMerger()
    
    # Örnek PDF listesi
    pdf_files = ["dosya1.pdf", "dosya2.pdf", "dosya3.pdf"]
    output_file = "birlestirilmis.pdf"
    
    try:
        result = merger.merge_pdfs(pdf_files, output_file, sort_by_name=True)
        print(f"Birleştirme başarılı: {result}")
        
        # PDF bilgilerini göster
        info = merger.get_pdf_info(result)
        if info:
            print(f"Çıktı dosyası: {info['page_count']} sayfa, {info['file_size_mb']} MB")
            
    except PDFMergeError as e:
        print(f"Hata: {e}")
