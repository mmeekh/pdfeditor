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
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{base}_unlocked_{ts}.pdf"

    def unlock(self, src_pdf: str, password: str, out_path: Optional[str] = None) -> UnlockResult:
        """PDF'den şifre korumasını kaldır"""
        if not os.path.exists(src_pdf):
            raise PDFUnlockError("Kaynak PDF bulunamadı")
            
        if out_path is None:
            out_path = os.path.join(self.temp_dir, self._out_name(src_pdf))

        try:
            # PDF'i PyMuPDF ile aç
            doc = fitz.open(src_pdf)
            
            # PDF şifreli mi kontrol et
            was_encrypted = doc.needs_pass
            
            if was_encrypted:
                # Şifreyi dene
                try:
                    doc.authenticate(password)
                except Exception as e:
                    doc.close()
                    raise PDFUnlockError(f"Şifre yanlış: {str(e)}")
                
                # Şifreli PDF'i şifresiz olarak kaydet
                doc.save(out_path, encryption=fitz.PDF_ENCRYPT_NONE)
            else:
                # Şifresiz PDF'i kopyala
                doc.save(out_path)
            
            doc.close()

            # Dosyanın gerçekten oluşturulduğunu kontrol et
            if not os.path.exists(out_path):
                raise PDFUnlockError("Şifresi kaldırılmış PDF oluşturulamadı")

            return UnlockResult(
                output_path=out_path, 
                unlocked=True, 
                was_encrypted=was_encrypted
            )

        except PDFUnlockError:
            raise
        except Exception as e:
            logger.error(f"PDF şifre kaldırma hatası: {e}")
            raise PDFUnlockError(f"PDF şifre kaldırma sırasında hata oluştu: {str(e)}")

    def check_encryption(self, pdf_path: str) -> bool:
        """PDF'in şifreli olup olmadığını kontrol et"""
        try:
            doc = fitz.open(pdf_path)
            is_encrypted = doc.needs_pass
            doc.close()
            return is_encrypted
        except Exception:
            return False
