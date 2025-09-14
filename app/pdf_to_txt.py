"""
PDF ve Word'den TXT'ye dönüştürme modülü.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional
from pathlib import Path
from datetime import datetime
import logging

from PyPDF2 import PdfReader
from docx import Document
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io
import platform

logger = logging.getLogger(__name__)


@dataclass
class ConvertResult:
    output_path: str
    text_length: int
    file_type: str  # 'pdf' or 'word'


class PDFToTXTError(Exception):
    pass


class PDFToTXTConverter:
    def __init__(self, temp_dir: str):
        self.temp_dir = temp_dir
        os.makedirs(self.temp_dir, exist_ok=True)
        
        # Tesseract OCR yolunu ayarla
        self._setup_tesseract()

    def _setup_tesseract(self):
        """Tesseract OCR yolunu sistem tipine göre ayarla"""
        try:
            if platform.system() == "Windows":
                # Windows için varsayılan Tesseract yolları
                possible_paths = [
                    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
                    r"C:\Users\{}\AppData\Local\Tesseract-OCR\tesseract.exe".format(os.getenv('USERNAME', '')),
                ]
                
                for path in possible_paths:
                    if os.path.exists(path):
                        pytesseract.pytesseract.tesseract_cmd = path
                        logger.info(f"Tesseract bulundu: {path}")
                        return
                
                logger.warning("Tesseract bulunamadı, sistem PATH'inde aranacak")
            else:
                # Linux/macOS için sistem PATH'inde aranacak
                logger.info("Tesseract sistem PATH'inde aranacak")
                
        except Exception as e:
            logger.warning(f"Tesseract yolu ayarlanamadı: {e}")

    def _out_name(self, src: str, file_type: str) -> str:
        base = Path(src).stem
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{base}_converted_{file_type}_{ts}.txt"

    def convert_pdf_to_txt(self, src_pdf: str, out_path: Optional[str] = None) -> ConvertResult:
        """PDF'den TXT'ye dönüştür (OCR desteği ile)"""
        if not os.path.exists(src_pdf):
            raise PDFToTXTError("Kaynak PDF bulunamadı")
        
        if out_path is None:
            out_path = os.path.join(self.temp_dir, self._out_name(src_pdf, "pdf"))

        try:
            # Önce PyPDF2 ile metin çıkarmayı dene
            text_content = []
            has_text = False
            
            with open(src_pdf, 'rb') as file:
                pdf_reader = PdfReader(file)
                
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    text = page.extract_text()
                    if text.strip():
                        has_text = True
                        text_content.append(f"--- Sayfa {page_num + 1} ---\n{text}\n")
            
            # Eğer metin çıkarılamadıysa OCR kullan
            extracted_text = "".join(text_content).strip()
            if not has_text or len(extracted_text) < 20:
                logger.info(f"PDF'den metin çıkarılamadı (uzunluk: {len(extracted_text)}), OCR kullanılıyor...")
                text_content = self._extract_text_with_ocr(src_pdf)
            else:
                logger.info(f"PDF'den {len(extracted_text)} karakter metin çıkarıldı, OCR gerekmiyor")
            
            full_text = "\n".join(text_content)
            
            # TXT dosyasına yaz
            with open(out_path, 'w', encoding='utf-8') as txt_file:
                txt_file.write(full_text)
            
            return ConvertResult(
                output_path=out_path,
                text_length=len(full_text),
                file_type="pdf"
            )
                
        except Exception as e:
            logger.error(f"PDF to TXT conversion failed: {e}")
            raise PDFToTXTError(f"PDF dönüştürme hatası: {str(e)}")
    
    def _extract_text_with_ocr(self, src_pdf: str) -> list[str]:
        """OCR ile PDF'den metin çıkar"""
        text_content = []
        
        try:
            # PyMuPDF ile PDF'i aç
            pdf_document = fitz.open(src_pdf)
            total_pages = len(pdf_document)
            logger.info(f"OCR başlatılıyor: {total_pages} sayfa işlenecek")
            
            for page_num in range(total_pages):
                try:
                    page = pdf_document[page_num]
                    logger.info(f"Sayfa {page_num + 1}/{total_pages} işleniyor...")
                    
                    # Sayfayı görüntüye dönüştür (daha yüksek çözünürlük)
                    mat = fitz.Matrix(4.0, 4.0)  # 4x büyütme (daha net)
                    pix = page.get_pixmap(matrix=mat, alpha=False)
                    img_data = pix.tobytes("png")
                    
                    # PIL Image'a dönüştür
                    image = Image.open(io.BytesIO(img_data))
                    
                    # Görüntü ön işleme (OCR kalitesini artır)
                    from PIL import ImageEnhance, ImageFilter
                    
                    # Kontrast artır
                    enhancer = ImageEnhance.Contrast(image)
                    image = enhancer.enhance(2.0)
                    
                    # Keskinlik artır
                    image = image.filter(ImageFilter.SHARPEN)
                    
                    # Boyutu büyüt (daha net OCR için)
                    width, height = image.size
                    image = image.resize((width * 2, height * 2), Image.Resampling.LANCZOS)
                    
                    # OCR ile metin çıkar
                    try:
                        # Önce İngilizce ile dene (Türkçe paketi yoksa)
                        text = pytesseract.image_to_string(image, lang='eng', config='--psm 6')
                        
                        # Eğer çok az metin çıktıysa farklı PSM modları dene
                        if len(text.strip()) < 10:
                            # PSM 3: Otomatik sayfa segmentasyonu
                            text = pytesseract.image_to_string(image, lang='eng', config='--psm 3')
                        
                        if len(text.strip()) < 10:
                            # PSM 8: Tek kelime
                            text = pytesseract.image_to_string(image, lang='eng', config='--psm 8')
                        
                        if len(text.strip()) < 10:
                            # PSM 13: Ham satır
                            text = pytesseract.image_to_string(image, lang='eng', config='--psm 13')
                        
                        if text.strip():
                            text_content.append(f"--- Sayfa {page_num + 1} (OCR) ---\n{text}\n")
                            logger.info(f"Sayfa {page_num + 1} OCR ile işlendi ({len(text.strip())} karakter)")
                        else:
                            text_content.append(f"--- Sayfa {page_num + 1} (OCR) ---\n[Bu sayfadan metin çıkarılamadı]\n")
                            logger.warning(f"Sayfa {page_num + 1} OCR'dan metin çıkarılamadı")
                            
                    except Exception as ocr_error:
                        logger.warning(f"Sayfa {page_num + 1} OCR hatası: {ocr_error}")
                        text_content.append(f"--- Sayfa {page_num + 1} (OCR) ---\n[OCR hatası: {str(ocr_error)}]\n")
                    
                except Exception as page_error:
                    logger.error(f"Sayfa {page_num + 1} işlenirken hata: {page_error}")
                    text_content.append(f"--- Sayfa {page_num + 1} (OCR) ---\n[Sayfa işleme hatası: {str(page_error)}]\n")
            
            pdf_document.close()
            logger.info(f"OCR tamamlandı: {len(text_content)} sayfa işlendi")
            
        except Exception as e:
            logger.error(f"OCR extraction failed: {e}")
            text_content.append(f"[OCR hatası: {str(e)}]")
        
        return text_content

    def convert_word_to_txt(self, src_word: str, out_path: Optional[str] = None) -> ConvertResult:
        """Word'den TXT'ye dönüştür"""
        if not os.path.exists(src_word):
            raise PDFToTXTError("Kaynak Word dosyası bulunamadı")
        
        if out_path is None:
            out_path = os.path.join(self.temp_dir, self._out_name(src_word, "word"))

        try:
            doc = Document(src_word)
            text_content = []
            
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():  # Boş paragrafları atla
                    text_content.append(paragraph.text)
            
            full_text = "\n".join(text_content)
            
            # TXT dosyasına yaz
            with open(out_path, 'w', encoding='utf-8') as txt_file:
                txt_file.write(full_text)
            
            return ConvertResult(
                output_path=out_path,
                text_length=len(full_text),
                file_type="word"
            )
            
        except Exception as e:
            logger.error(f"Word to TXT conversion failed: {e}")
            raise PDFToTXTError(f"Word dönüştürme hatası: {str(e)}")

    def convert(self, src_file: str, out_path: Optional[str] = None) -> ConvertResult:
        """Dosya tipine göre otomatik dönüştürme"""
        file_ext = Path(src_file).suffix.lower()
        
        if file_ext == '.pdf':
            return self.convert_pdf_to_txt(src_file, out_path)
        elif file_ext in ['.docx', '.doc']:
            return self.convert_word_to_txt(src_file, out_path)
        else:
            raise PDFToTXTError(f"Desteklenmeyen dosya formatı: {file_ext}")
