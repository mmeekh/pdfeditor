"""
PDF Sıkıştırma Modülü
Not: PyPDF2 gerçek görüntü yeniden örnekleme yapmaz; burada
sayfa içerik akışlarını (content streams) sıkıştırıp PDF'i
yeni yazıyoruz. Görüntü yoğunluklu PDF'lerde azalma sınırlı olabilir.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional
from pathlib import Path
from datetime import datetime
import logging

from PyPDF2 import PdfReader, PdfWriter
import shutil
import subprocess

logger = logging.getLogger(__name__)


@dataclass
class CompressMetrics:
    input_size_bytes: int
    output_size_bytes: int

    @property
    def saved_bytes(self) -> int:
        return max(0, self.input_size_bytes - self.output_size_bytes)

    @property
    def saved_percent(self) -> float:
        if self.input_size_bytes <= 0:
            return 0.0
        return round(self.saved_bytes * 100.0 / self.input_size_bytes, 2)


class PDFCompressor:
    def __init__(self, temp_dir: str):
        self.temp_dir = temp_dir
        os.makedirs(self.temp_dir, exist_ok=True)

    def _out_name(self, src: str, level: str) -> str:
        base = Path(src).stem
        # Upload index prefix temizleme ("0_dosya" → "dosya")
        if "_" in base and base.split("_", 1)[0].isdigit():
            base = base.split("_", 1)[1]

        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{base}_sikistirilmis.pdf"

    def _gs_setting(self, level: str) -> str:
        # high => en küçük dosya, low => daha iyi kalite
        mapping = {
            'high': '/screen',      # agresif
            'medium': '/ebook',     # dengeli
            'low': '/printer',      # daha az sıkıştırma
        }
        return mapping.get(level, '/ebook')

    def _compress_with_gs(self, src_pdf: str, level: str, out_path: str) -> bool:
        gs = shutil.which('gs')
        if not gs:
            return False
        setting = self._gs_setting(level)
        cmd = [
            gs,
            '-sDEVICE=pdfwrite',
            '-dCompatibilityLevel=1.4',
            f'-dPDFSETTINGS={setting}',
            '-dNOPAUSE', '-dQUIET', '-dBATCH',
            f'-sOutputFile={out_path}',
            src_pdf
        ]
        try:
            subprocess.run(cmd, check=True)
            return os.path.exists(out_path)
        except subprocess.CalledProcessError as e:
            logger.error(f"Ghostscript failed: {e}")
            return False

    def _compress_with_pypdf(self, src_pdf: str, out_path: str) -> None:
        reader = PdfReader(src_pdf)
        writer = PdfWriter()
        for page in reader.pages:
            try:
                page.compress_content_streams()
            except Exception as e:
                logger.debug(f"compress_content_streams skip: {e}")
            writer.add_page(page)
        try:
            if reader.metadata:
                writer.add_metadata(reader.metadata)
        except Exception:
            pass
        with open(out_path, 'wb') as f:
            writer.write(f)

    def compress(self, src_pdf: str, level: str = "medium") -> tuple[str, CompressMetrics]:
        if not os.path.exists(src_pdf):
            raise FileNotFoundError("Kaynak PDF bulunamadı")

        input_size = os.path.getsize(src_pdf)
        out_name = self._out_name(src_pdf, level)
        out_path = os.path.join(self.temp_dir, out_name)

        # Önce Ghostscript ile dene, yoksa PyPDF2 fallback
        success = self._compress_with_gs(src_pdf, level, out_path)
        if not success:
            self._compress_with_pypdf(src_pdf, out_path)

        # Eğer büyümüşse orijinali kullan
        output_size = os.path.getsize(out_path) if os.path.exists(out_path) else 0
        if output_size and output_size >= input_size:
            # Orijinali kopyala, boyut değişmesin
            try:
                import shutil as _sh
                _sh.copy2(src_pdf, out_path)
                output_size = os.path.getsize(out_path)
            except Exception:
                pass

        metrics = CompressMetrics(input_size_bytes=input_size, output_size_bytes=output_size)
        return out_path, metrics


