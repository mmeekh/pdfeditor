import os
import logging
from typing import List, Optional
from pathlib import Path
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io

logger = logging.getLogger(__name__)


class PDFOCRError(Exception):
    """PDF OCR işlemi sırasında oluşan hatalar"""
    pass


class PDFOCR:
    """PDF OCR işlemleri için ana sınıf"""
    
    def __init__(self, temp_dir: str = None):
        self.temp_dir = temp_dir
        self.supported_languages = ['eng', 'tur', 'deu', 'fra', 'spa', 'ita', 'por', 'rus', 'ara', 'chi_sim', 'jpn', 'kor']
    
    def get_supported_languages(self) -> List[str]:
        """Desteklenen OCR dillerini döndür"""
        return self.supported_languages
    
    def extract_text_from_pdf(self, pdf_path: str, language: str = 'tur+eng', dpi: int = 300, include_coordinates: bool = False) -> dict:
        """
        PDF'den metin çıkarır
        
        Args:
            pdf_path: PDF dosya yolu
            language: OCR dili (örn: 'tur+eng')
            dpi: Görüntü çözünürlüğü
            include_coordinates: Koordinat bilgilerini dahil et
            
        Returns:
            dict: Çıkarılan metin ve sayfa bilgileri
        """
        try:
            # PDF'i aç
            pdf_document = fitz.open(pdf_path)
            total_pages = len(pdf_document)
            
            extracted_text = []
            page_info = []
            
            for page_num in range(total_pages):
                page = pdf_document[page_num]
                
                # Sayfayı görüntüye dönüştür
                mat = fitz.Matrix(dpi/72, dpi/72)  # DPI ayarı
                pix = page.get_pixmap(matrix=mat)
                img_data = pix.tobytes("png")
                
                # PIL Image'a dönüştür
                image = Image.open(io.BytesIO(img_data))
                
                # OCR uygula
                if include_coordinates:
                    # Koordinat bilgileri ile
                    data = pytesseract.image_to_data(image, lang=language, output_type=pytesseract.Output.DICT)
                    text = pytesseract.image_to_string(image, lang=language)
                else:
                    # Sadece metin
                    text = pytesseract.image_to_string(image, lang=language)
                    data = None
                
                # Metni temizle
                cleaned_text = self._clean_text(text)
                
                if cleaned_text.strip():
                    extracted_text.append({
                        'page': page_num + 1,
                        'text': cleaned_text,
                        'coordinates': data if include_coordinates else None
                    })
                    
                    page_info.append({
                        'page': page_num + 1,
                        'text_length': len(cleaned_text),
                        'word_count': len(cleaned_text.split())
                    })
            
            pdf_document.close()
            
            return {
                'success': True,
                'total_pages': total_pages,
                'extracted_pages': len(extracted_text),
                'text': extracted_text,
                'page_info': page_info,
                'full_text': '\n\n'.join([page['text'] for page in extracted_text])
            }
            
        except Exception as e:
            logger.error(f"PDF OCR hatası: {str(e)}")
            raise PDFOCRError(f"PDF'den metin çıkarılamadı: {str(e)}")
    
    def _clean_text(self, text: str) -> str:
        """Metni temizle ve düzenle"""
        if not text:
            return ""
        
        # Gereksiz boşlukları temizle
        lines = text.split('\n')
        cleaned_lines = []
        
        for line in lines:
            line = line.strip()
            if line:  # Boş satırları atla
                cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines)
    
    def save_text_to_file(self, text: str, output_path: str) -> str:
        """Çıkarılan metni dosyaya kaydet"""
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(text)
            return output_path
        except Exception as e:
            logger.error(f"Metin dosyası kaydetme hatası: {str(e)}")
            raise PDFOCRError(f"Metin dosyası kaydedilemedi: {str(e)}")
    
    def get_pdf_info(self, pdf_path: str) -> dict:
        """PDF dosya bilgilerini al"""
        try:
            pdf_document = fitz.open(pdf_path)
            page_count = len(pdf_document)
            file_size = os.path.getsize(pdf_path)
            file_size_mb = round(file_size / (1024 * 1024), 2)
            
            pdf_document.close()
            
            return {
                'page_count': page_count,
                'file_size_bytes': file_size,
                'file_size_mb': file_size_mb
            }
        except Exception as e:
            logger.error(f"PDF bilgi alma hatası: {str(e)}")
            return {
                'page_count': 0,
                'file_size_bytes': 0,
                'file_size_mb': 0
            }
    
    def process_pdf_ocr(self, pdf_path: str, output_path: str, language: str = 'tur+eng', dpi: int = 300, include_coordinates: bool = False) -> dict:
        """PDF OCR işlemini tamamla ve sonuçları kaydet"""
        try:
            # PDF bilgilerini al
            pdf_info = self.get_pdf_info(pdf_path)
            
            # Metin çıkar
            ocr_result = self.extract_text_from_pdf(pdf_path, language, dpi, include_coordinates)
            
            if not ocr_result['success']:
                raise PDFOCRError("OCR işlemi başarısız")
            
            # Metni dosyaya kaydet
            self.save_text_to_file(ocr_result['full_text'], output_path)
            
            # Dosya boyutunu al
            output_size = os.path.getsize(output_path)
            output_size_mb = round(output_size / (1024 * 1024), 2)
            
            return {
                'success': True,
                'total_pages': ocr_result['total_pages'],
                'successful_pages': ocr_result['extracted_pages'],
                'failed_pages': ocr_result['total_pages'] - ocr_result['extracted_pages'],
                'text_length': len(ocr_result['full_text']),
                'file_size_mb': output_size_mb,
                'output_path': output_path
            }
            
        except Exception as e:
            logger.error(f"PDF OCR process hatası: {str(e)}")
            raise PDFOCRError(f"OCR işlemi tamamlanamadı: {str(e)}")
