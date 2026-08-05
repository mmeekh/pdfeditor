"""
PDF ve Word'den TXT'ye dönüştürme modülü.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional
from pathlib import Path
import logging

import fitz  # PyMuPDF
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
        if "_" in base and base.split("_", 1)[0].isdigit():
            base = base.split("_", 1)[1]
        return f"{base}.txt"

    def convert_pdf_to_txt(
        self,
        src_pdf: str,
        out_path: Optional[str] = None,
        encoding: str = "utf-8",
        preserve_paragraphs: bool = True,
        use_ocr: bool = True,
    ) -> ConvertResult:
        if not os.path.exists(src_pdf):
            raise PDFToTXTError("Kaynak PDF bulunamadı")
        if out_path is None:
            out_path = os.path.join(self.temp_dir, self._out_name(src_pdf, "pdf"))

        try:
            doc = fitz.open(src_pdf)
            text_parts = []

            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text()

                if not text.strip() and use_ocr:
                    text = self._ocr_page(page)

                if text.strip():
                    if preserve_paragraphs:
                        text_parts.append(f"--- Sayfa {page_num + 1} ---\n{text.rstrip()}\n")
                    else:
                        text_parts.append(text.replace("\n", " ").strip())

            doc.close()

            full_text = "\n".join(text_parts) if preserve_paragraphs else " ".join(text_parts)

            with open(out_path, "w", encoding=encoding, errors="replace") as f:
                f.write(full_text)

            return ConvertResult(output_path=out_path, text_length=len(full_text), file_type="pdf")

        except PDFToTXTError:
            raise
        except Exception as e:
            logger.error(f"PDF to TXT conversion failed: {e}")
            raise PDFToTXTError(f"PDF dönüştürme hatası: {str(e)}")

    def convert_word_to_txt(
        self,
        src_word: str,
        out_path: Optional[str] = None,
        encoding: str = "utf-8",
        preserve_paragraphs: bool = True,
        use_ocr: bool = True,  # noqa: ARG002 (not applicable for Word)
    ) -> ConvertResult:
        if not os.path.exists(src_word):
            raise PDFToTXTError("Kaynak Word dosyası bulunamadı")
        if out_path is None:
            out_path = os.path.join(self.temp_dir, self._out_name(src_word, "word"))

        try:
            doc = Document(src_word)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]

            if preserve_paragraphs:
                full_text = "\n".join(paragraphs)
            else:
                full_text = " ".join(paragraphs)

            with open(out_path, "w", encoding=encoding, errors="replace") as f:
                f.write(full_text)

            return ConvertResult(output_path=out_path, text_length=len(full_text), file_type="word")

        except PDFToTXTError:
            raise
        except Exception as e:
            logger.error(f"Word to TXT conversion failed: {e}")
            raise PDFToTXTError(f"Word dönüştürme hatası: {str(e)}")

    def convert(
        self,
        src_file: str,
        out_path: Optional[str] = None,
        encoding: str = "utf-8",
        preserve_paragraphs: bool = True,
        use_ocr: bool = True,
    ) -> ConvertResult:
        file_ext = Path(src_file).suffix.lower()
        if file_ext == ".pdf":
            return self.convert_pdf_to_txt(src_file, out_path, encoding, preserve_paragraphs, use_ocr)
        elif file_ext in (".docx", ".doc"):
            return self.convert_word_to_txt(src_file, out_path, encoding, preserve_paragraphs, use_ocr)
        else:
            raise PDFToTXTError(f"Desteklenmeyen dosya formatı: {file_ext}")

    def _ocr_page(self, page: fitz.Page) -> str:
        try:
            import pytesseract
            from PIL import Image

            pix = page.get_pixmap(dpi=200)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            return pytesseract.image_to_string(img, lang="tur+eng")
        except Exception as e:
            logger.warning(f"OCR başarısız, boş metin döndürülüyor: {e}")
            return ""
