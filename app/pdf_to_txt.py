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

    def _out_name(self, src: str, file_type: str) -> str:
        base = Path(src).stem
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{base}_converted_{file_type}_{ts}.txt"

    def convert_pdf_to_txt(self, src_pdf: str, out_path: Optional[str] = None) -> ConvertResult:
        """PDF'den TXT'ye dönüştür"""
        if not os.path.exists(src_pdf):
            raise PDFToTXTError("Kaynak PDF bulunamadı")
        
        if out_path is None:
            out_path = os.path.join(self.temp_dir, self._out_name(src_pdf, "pdf"))

        try:
            with open(src_pdf, 'rb') as file:
                pdf_reader = PdfReader(file)
                text_content = []
                
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    text = page.extract_text()
                    if text.strip():  # Boş sayfaları atla
                        text_content.append(f"--- Sayfa {page_num + 1} ---\n{text}\n")
                
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
