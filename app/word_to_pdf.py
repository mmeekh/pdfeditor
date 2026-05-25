"""
Word'den PDF'e dönüştürme modülü.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional
from pathlib import Path
from datetime import datetime
import logging

import shutil
import subprocess


logger = logging.getLogger(__name__)


@dataclass
class ConvertResult:
    output_path: str


class WordToPDFError(Exception):
    pass


class WordToPDFConverter:
    def __init__(self, temp_dir: str):
        self.temp_dir = temp_dir
        os.makedirs(self.temp_dir, exist_ok=True)

    def _out_name(self, src: str) -> str:
        base = Path(src).stem
        # Upload index prefix temizleme ("0_dosya" → "dosya")
        if "_" in base and base.split("_", 1)[0].isdigit():
            base = base.split("_", 1)[1]

        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{base}.pdf"

    def convert(self, src_doc: str, out_path: Optional[str] = None) -> ConvertResult:
        if not os.path.exists(src_doc):
            raise WordToPDFError("Kaynak Word dosyası bulunamadı")
        if out_path is None:
            out_path = os.path.join(self.temp_dir, self._out_name(src_doc))

        try:
            soffice = shutil.which('soffice')
            if not soffice:
                raise WordToPDFError("LibreOffice (soffice) bulunamadı")
            out_dir = os.path.dirname(out_path)
            # LibreOffice converts into out_dir with same basename.pdf
            cmd = [
                soffice,
                "--headless",
                "--nologo",
                "--nofirststartwizard",
                "--convert-to", "pdf",
                "--outdir", out_dir,
                src_doc,
            ]
            # 180 saniye (3 dk) timeout: hung soffice worker'ı bloklamasın.
            subprocess.run(cmd, check=True, timeout=180)
            # computed target path (LibreOffice may choose base.pdf)
            base_pdf = os.path.join(out_dir, f"{Path(src_doc).stem}.pdf")
            if base_pdf != out_path and os.path.exists(base_pdf):
                try:
                    os.replace(base_pdf, out_path)
                except Exception:
                    out_path = base_pdf
        except subprocess.TimeoutExpired as e:
            logger.error(f"LibreOffice timeout (>180s) for {src_doc}: {e}")
            # Router 504/422 ile dönüştürebilsin diye spesifik mesajla fırlat.
            raise WordToPDFError("Dönüştürme zaman aşımına uğradı (180sn)")
        except Exception as e:
            logger.error(f"Word→PDF dönüşüm hatası: {e}")
            raise WordToPDFError("Dönüştürme sırasında hata oluştu")

        if not os.path.exists(out_path):
            raise WordToPDFError("Çıktı oluşturulamadı")

        return ConvertResult(output_path=out_path)


