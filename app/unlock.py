"""
PDF Şifre Kaldırma Modülü.

PDF dosyalarından şifre korumasını kaldırır.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional
from pathlib import Path
from datetime import datetime
import logging

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


@dataclass
class UnlockResult:
    output_path: str
    unlocked: bool
    was_encrypted: bool


class PDFUnlockError(Exception):
    pass


class PDFUnlocker:
    def __init__(self, temp_dir: str):
        self.temp_dir = temp_dir
        os.makedirs(self.temp_dir, exist_ok=True)

    def _out_name(self, src: str) -> str:
        base = Path(src).stem
        # Upload index prefix temizleme ("0_dosya" → "dosya")
        if "_" in base and base.split("_", 1)[0].isdigit():
            base = base.split("_", 1)[1]

        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{base}_sifresiz.pdf"

    def unlock(self, src_pdf: str, password: str, out_path: Optional[str] = None) -> UnlockResult:
        """PDF'den şifre korumasını kaldır"""
        if not os.path.exists(src_pdf):
            raise PDFUnlockError("Kaynak PDF bulunamadı")
            
        if out_path is None:
            out_path = os.path.join(self.temp_dir, self._out_name(src_pdf))

        doc = None
        try:
            # PDF'i PyMuPDF ile aç
            doc = fitz.open(src_pdf)

            # PDF şifreli mi kontrol et
            was_encrypted = doc.needs_pass

            if was_encrypted:
                if not doc.authenticate(password):
                    raise PDFUnlockError("Şifre yanlış")
                doc.save(out_path, encryption=fitz.PDF_ENCRYPT_NONE)
            else:
                doc.save(out_path)

        except PDFUnlockError:
            raise
        except Exception as e:
            logger.error(f"PDF şifre kaldırma hatası: {e}")
            raise PDFUnlockError(f"PDF şifre kaldırma sırasında hata oluştu: {str(e)}")
        finally:
            if doc:
                doc.close()

        # Dosyanın gerçekten oluşturulduğunu kontrol et
        if not os.path.exists(out_path):
            raise PDFUnlockError("Şifresi kaldırılmış PDF oluşturulamadı")

        return UnlockResult(
            output_path=out_path,
            unlocked=True,
            was_encrypted=was_encrypted
        )

    def check_encryption(self, pdf_path: str) -> bool:
        """PDF'in şifreli olup olmadığını kontrol et"""
        try:
            doc = fitz.open(pdf_path)
            is_encrypted = doc.needs_pass
            doc.close()
            return is_encrypted
        except Exception:
            return False
