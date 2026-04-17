"""
PDF Şifreleme ve Koruma Modülü.

PDF dosyalarına şifre koruması ve izin kısıtlamaları ekler.
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
class ProtectionOptions:
    user_password: str
    owner_password: Optional[str] = None
    can_print: bool = True
    can_modify: bool = False
    can_copy: bool = False
    can_annotate: bool = False
    can_fill_forms: bool = False
    can_accessibility: bool = False
    can_assemble: bool = False
    can_modify_contents: bool = False


@dataclass
class ProtectResult:
    output_path: str
    protected: bool


class PDFProtectError(Exception):
    pass


class PDFProtector:
    def __init__(self, temp_dir: str):
        self.temp_dir = temp_dir
        os.makedirs(self.temp_dir, exist_ok=True)

    def _out_name(self, src: str) -> str:
        base = Path(src).stem
        # Upload index prefix temizleme ("0_dosya" → "dosya")
        if "_" in base and base.split("_", 1)[0].isdigit():
            base = base.split("_", 1)[1]

        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{base}_sifreli.pdf"

    def _calculate_permissions(self, options: ProtectionOptions) -> int:
        """PDF izinlerini hesapla"""
        permissions = 0
        
        if options.can_print:
            permissions |= 0b00000000000000000000000000000001  # Print
        if options.can_modify:
            permissions |= 0b00000000000000000000000000000010  # Modify contents
        if options.can_copy:
            permissions |= 0b00000000000000000000000000000100  # Copy contents
        if options.can_annotate:
            permissions |= 0b00000000000000000000000000001000  # Modify annotations
        if options.can_fill_forms:
            permissions |= 0b00000000000000000000000000010000  # Fill forms
        if options.can_accessibility:
            permissions |= 0b00000000000000000000000000100000  # Accessibility
        if options.can_assemble:
            permissions |= 0b00000000000000000000000001000000  # Assemble
        if options.can_modify_contents:
            permissions |= 0b00000000000000000000000010000000  # Modify contents
            
        return permissions

    def protect(self, src_pdf: str, options: ProtectionOptions, out_path: Optional[str] = None) -> ProtectResult:
        """PDF'i şifrele ve koruma ekle"""
        if not os.path.exists(src_pdf):
            raise PDFProtectError("Kaynak PDF bulunamadı")
            
        if out_path is None:
            out_path = os.path.join(self.temp_dir, self._out_name(src_pdf))

        try:
            # PDF'i PyMuPDF ile aç
            doc = fitz.open(src_pdf)
            
            # Şifreleme ayarları
            owner_password = options.owner_password or options.user_password
            permissions = self._calculate_permissions(options)
            
            # PDF'i şifrele ve kaydet
            doc.save(
                out_path,
                encryption=fitz.PDF_ENCRYPT_AES_256,  # En güçlü şifreleme
                user_pw=options.user_password,
                owner_pw=owner_password,
                permissions=permissions
            )
            
            doc.close()

            # Dosyanın gerçekten oluşturulduğunu kontrol et
            if not os.path.exists(out_path):
                raise PDFProtectError("Şifrelenmiş PDF oluşturulamadı")

            return ProtectResult(output_path=out_path, protected=True)

        except Exception as e:
            logger.error(f"PDF şifreleme hatası: {e}")
            raise PDFProtectError(f"PDF şifreleme sırasında hata oluştu: {str(e)}")

    def verify_protection(self, pdf_path: str, password: str) -> bool:
        """PDF'in şifre korumasını doğrula"""
        try:
            doc = fitz.open(pdf_path)
            if doc.needs_pass:
                doc.authenticate(password)
                doc.close()
                return True
            doc.close()
            return False
        except Exception:
            return False
