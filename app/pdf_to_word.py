"""
PDF'den Word'e dönüştürme modülü.
"""

from __future__ import annotations

import os
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

    def _out_name(self, src: str) -> str:
        base = Path(src).stem
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{base}_converted_{ts}.docx"

    def convert(self, src_pdf: str, out_path: Optional[str] = None) -> ConvertResult:
        if not os.path.exists(src_pdf):
            raise PDFToWordError("Kaynak PDF bulunamadı")
        if out_path is None:
            out_path = os.path.join(self.temp_dir, self._out_name(src_pdf))

        try:
            cv = Converter(src_pdf)
            try:
                cv.convert(out_path)
            finally:
                cv.close()
        except Exception as e:
            logger.error(f"PDF→Word dönüşüm hatası: {e}")
            raise PDFToWordError("Dönüştürme sırasında hata oluştu")

        if not os.path.exists(out_path):
            raise PDFToWordError("Çıktı oluşturulamadı")

        return ConvertResult(output_path=out_path)


