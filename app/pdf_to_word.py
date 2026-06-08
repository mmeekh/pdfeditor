"""
PDF'den Word'e dönüştürme modülü.
"""

from __future__ import annotations

import os
import shutil
import subprocess
from dataclasses import dataclass
from typing import Optional
from pathlib import Path
from datetime import datetime
import logging

from pdf2docx import Converter


logger = logging.getLogger(__name__)


@dataclass
class ConvertResult:
    output_path: str


class PDFToWordError(Exception):
    pass


class PDFToWordConverter:
    def __init__(self, temp_dir: str):
        self.temp_dir = temp_dir
        os.makedirs(self.temp_dir, exist_ok=True)

    def _out_name(self, src: str, ext: str = "docx") -> str:
        base = Path(src).stem
        if "_" in base and base.split("_", 1)[0].isdigit():
            base = base.split("_", 1)[1]
        return f"{base}.{ext}"

    def convert(
        self,
        src_pdf: str,
        out_path: Optional[str] = None,
        layout: str = "layout-preserve",
        output_format: str = "docx",
    ) -> ConvertResult:
        if not os.path.exists(src_pdf):
            raise PDFToWordError("Kaynak PDF bulunamadı")

        # Always produce .docx first; convert to .doc later if needed
        docx_path = out_path if (out_path and output_format == "docx") else os.path.join(
            self.temp_dir, self._out_name(src_pdf, "docx")
        )

        if layout == "text-only":
            self._convert_text_only(src_pdf, docx_path)
        else:
            self._convert_layout_preserve(src_pdf, docx_path)

        if not os.path.exists(docx_path):
            raise PDFToWordError("Çıktı oluşturulamadı")

        if output_format == "doc":
            doc_path = out_path or os.path.join(self.temp_dir, self._out_name(src_pdf, "doc"))
            self._convert_docx_to_doc(docx_path, doc_path)
            if docx_path != out_path:
                try:
                    os.remove(docx_path)
                except OSError:
                    pass
            return ConvertResult(output_path=doc_path)

        return ConvertResult(output_path=docx_path)

    def _convert_layout_preserve(self, src_pdf: str, out_path: str) -> None:
        try:
            cv = Converter(src_pdf)
            try:
                cv.convert(out_path)
            finally:
                cv.close()
        except Exception as e:
            logger.error(f"pdf2docx dönüşüm hatası: {e}")
            raise PDFToWordError("Dönüştürme sırasında hata oluştu")

    def _convert_text_only(self, src_pdf: str, out_path: str) -> None:
        try:
            import fitz
            from docx import Document as DocxDocument
            from docx.shared import Pt

            pdf_doc = fitz.open(src_pdf)
            word_doc = DocxDocument()

            for page_num in range(len(pdf_doc)):
                page = pdf_doc[page_num]
                text = page.get_text()
                if page_num > 0:
                    word_doc.add_page_break()
                for line in text.splitlines():
                    if line.strip():
                        word_doc.add_paragraph(line)

            pdf_doc.close()
            word_doc.save(out_path)
        except Exception as e:
            logger.error(f"Metin-only dönüşüm hatası: {e}")
            raise PDFToWordError("Metin çıkarma sırasında hata oluştu")

    def _convert_docx_to_doc(self, docx_path: str, doc_path: str) -> None:
        soffice = shutil.which("soffice")
        if not soffice:
            raise PDFToWordError("LibreOffice (soffice) bulunamadı")
        out_dir = os.path.dirname(doc_path)
        try:
            subprocess.run(
                [soffice, "--headless", "--nologo", "--convert-to", "doc", "--outdir", out_dir, docx_path],
                check=True,
                timeout=120,
            )
            # LibreOffice outputs <stem>.doc next to the source
            auto_out = os.path.join(out_dir, Path(docx_path).stem + ".doc")
            if auto_out != doc_path and os.path.exists(auto_out):
                os.replace(auto_out, doc_path)
        except subprocess.TimeoutExpired:
            raise PDFToWordError("DOC dönüşümü zaman aşımına uğradı")
        except Exception as e:
            logger.error(f"docx→doc dönüşüm hatası: {e}")
            raise PDFToWordError("DOC dönüştürme sırasında hata oluştu")
