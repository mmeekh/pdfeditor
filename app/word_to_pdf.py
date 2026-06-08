"""
Word'den PDF'e dönüştürme modülü.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional
from pathlib import Path
import logging

import shutil
import subprocess


logger = logging.getLogger(__name__)

# Ghostscript PDFSettings for quality levels
_GS_QUALITY = {
    "screen": "/screen",    # 72 DPI
    "ebook": "/ebook",      # 150 DPI
    "print": "/printer",    # 300 DPI — default LibreOffice output, no re-compression needed
}

# Page dimensions in mm (width, height for portrait)
_PAGE_SIZES_MM = {
    "A4": (210.0, 297.0),
    "Letter": (215.9, 279.4),
    "A5": (148.0, 210.0),
}


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
        if "_" in base and base.split("_", 1)[0].isdigit():
            base = base.split("_", 1)[1]
        return f"{base}.pdf"

    def convert(
        self,
        src_doc: str,
        out_path: Optional[str] = None,
        page_size: str = "A4",
        pdf_a: bool = False,
        quality: str = "ebook",
    ) -> ConvertResult:
        if not os.path.exists(src_doc):
            raise WordToPDFError("Kaynak Word dosyası bulunamadı")
        if out_path is None:
            out_path = os.path.join(self.temp_dir, self._out_name(src_doc))

        # Optionally resize document before conversion
        src_to_convert = self._apply_page_size(src_doc, page_size)

        self._libreoffice_convert(src_to_convert, out_path)

        # Clean temp resized file
        if src_to_convert != src_doc:
            try:
                os.remove(src_to_convert)
            except OSError:
                pass

        if not os.path.exists(out_path):
            raise WordToPDFError("Çıktı oluşturulamadı")

        # Post-process with ghostscript if needed
        if pdf_a or quality in ("screen", "ebook"):
            self._gs_postprocess(out_path, pdf_a=pdf_a, quality=quality)

        return ConvertResult(output_path=out_path)

    def _apply_page_size(self, src_doc: str, page_size: str) -> str:
        """python-docx ile sayfa boyutunu değiştir (.docx only)."""
        if page_size not in _PAGE_SIZES_MM or not src_doc.lower().endswith(".docx"):
            return src_doc

        try:
            from docx import Document
            from docx.shared import Mm

            w_mm, h_mm = _PAGE_SIZES_MM[page_size]
            doc = Document(src_doc)
            for section in doc.sections:
                section.page_width = Mm(w_mm)
                section.page_height = Mm(h_mm)

            tmp_path = src_doc + ".sized.docx"
            doc.save(tmp_path)
            return tmp_path
        except Exception as e:
            logger.warning(f"Sayfa boyutu değiştirilemedi, orijinal kullanılacak: {e}")
            return src_doc

    def _libreoffice_convert(self, src_doc: str, out_path: str) -> None:
        soffice = shutil.which("soffice")
        if not soffice:
            raise WordToPDFError("LibreOffice (soffice) bulunamadı")

        out_dir = os.path.dirname(out_path)
        try:
            subprocess.run(
                [
                    soffice,
                    "--headless",
                    "--nologo",
                    "--nofirststartwizard",
                    "--convert-to", "pdf",
                    "--outdir", out_dir,
                    src_doc,
                ],
                check=True,
                timeout=180,
            )
            base_pdf = os.path.join(out_dir, f"{Path(src_doc).stem}.pdf")
            if base_pdf != out_path and os.path.exists(base_pdf):
                try:
                    os.replace(base_pdf, out_path)
                except Exception:
                    out_path = base_pdf
        except subprocess.TimeoutExpired as e:
            logger.error(f"LibreOffice timeout (>180s) for {src_doc}: {e}")
            raise WordToPDFError("Dönüştürme zaman aşımına uğradı (180sn)")
        except Exception as e:
            logger.error(f"Word→PDF dönüşüm hatası: {e}")
            raise WordToPDFError("Dönüştürme sırasında hata oluştu")

    def _gs_postprocess(self, pdf_path: str, pdf_a: bool, quality: str) -> None:
        """Ghostscript ile PDF/A dönüşümü ve/veya kalite sıkıştırması."""
        gs = shutil.which("gs")
        if not gs:
            logger.warning("Ghostscript bulunamadı, PDF/A ve kalite ayarları atlandı")
            return

        tmp_out = pdf_path + ".gs.pdf"
        cmd = [gs, "-dBATCH", "-dNOPAUSE", "-dQUIET", "-sDEVICE=pdfwrite"]

        if pdf_a:
            cmd.append("-dPDFA=1")

        gs_quality = _GS_QUALITY.get(quality)
        if gs_quality and quality != "print":
            cmd.append(f"-dPDFSETTINGS={gs_quality}")

        cmd += [f"-sOutputFile={tmp_out}", pdf_path]

        try:
            subprocess.run(cmd, check=True, timeout=120)
            if os.path.exists(tmp_out):
                os.replace(tmp_out, pdf_path)
        except subprocess.TimeoutExpired:
            logger.warning("Ghostscript zaman aşımına uğradı, orijinal PDF korunuyor")
            if os.path.exists(tmp_out):
                os.remove(tmp_out)
        except Exception as e:
            logger.warning(f"Ghostscript post-process hatası: {e}")
            if os.path.exists(tmp_out):
                os.remove(tmp_out)
