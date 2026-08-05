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
            'extreme': '/screen',   # en agresif (target_kb merdiveninin son basamağı)
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
            # 180 saniye (3 dk) timeout: hung gs süreçleri worker'ı bloklamasın.
            subprocess.run(cmd, check=True, timeout=180)
            return os.path.exists(out_path)
        except subprocess.TimeoutExpired as e:
            logger.error(f"Ghostscript timeout (>180s) for {src_pdf}: {e}")
            # Üst katman (router) HTTP 504 ile dönüştürebilsin diye yeniden fırlat.
            raise
        except subprocess.CalledProcessError as e:
            logger.error(f"Ghostscript failed: {e}")
            return False

    def _rasterize(self, src_pdf: str, out_path: str, dpi: int, quality: int) -> bool:
        """Sayfaları JPEG'e çevirip yeni PDF kurar.

        2026-08-05: gs preset'lerinin İŞLEMEDİĞİ dosya sınıfı için (ör. Canva/
        iLovePDF çıkışı, yazıları eğriye çevrilmiş saf-vektör PDF'ler — gs bunları
        BÜYÜTÜYOR). Bedeli: metin seçilebilirliği gider; bu yüzden yalnızca preset
        kazanç sağlayamadığında devreye girer ve yanıtta 'raster' olarak işaretlenir.
        """
        try:
            import fitz  # PyMuPDF
            src = fitz.open(src_pdf)
            out = fitz.open()
            for page in src:
                pix = page.get_pixmap(dpi=dpi, colorspace=fitz.csRGB)
                jpg = pix.tobytes('jpeg', jpg_quality=quality)
                np = out.new_page(width=page.rect.width, height=page.rect.height)
                np.insert_image(np.rect, stream=jpg)
            out.save(out_path, garbage=4, deflate=True)
            out.close(); src.close()
            return os.path.exists(out_path)
        except Exception as e:
            logger.warning(f"rasterize başarısız ({src_pdf}): {e}")
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

    def compress(self, src_pdf: str, level: str = "medium",
                 target_kb: Optional[int] = None) -> tuple[str, CompressMetrics]:
        if not os.path.exists(src_pdf):
            raise FileNotFoundError("Kaynak PDF bulunamadı")

        input_size = os.path.getsize(src_pdf)
        out_name = self._out_name(src_pdf, level)
        out_path = os.path.join(self.temp_dir, out_name)

        # Önce Ghostscript ile dene, yoksa PyPDF2 fallback
        success = self._compress_with_gs(src_pdf, level, out_path)
        if not success:
            self._compress_with_pypdf(src_pdf, out_path)

        output_size = os.path.getsize(out_path) if os.path.exists(out_path) else 0
        used_level = level

        # 2026-08-03: OTOMATİK KADEME YÜKSELTME.
        # /ebook zaten-optimize PDF'lerde ~%0 kazandırıp kullanıcıya "0% daha
        # küçük" gösteriyordu. İstenen seviye <%3 kazandırdıysa (veya target_kb
        # tutturulamadıysa) bir üst kademeyi dene; anlamlı fark varsa onu kullan.
        LADDER = ['low', 'medium', 'high', 'extreme']
        def _saved_pct(sz: int) -> float:
            return (input_size - sz) * 100.0 / input_size if input_size else 0.0

        needs_more = (
            (output_size and _saved_pct(output_size) < 3.0) or
            (target_kb and output_size > target_kb * 1024)
        )
        # 2026-08-05: bilinmeyen seviye merdiveni ValueError ile patlatıyordu
        # ('extreme' is not in list) ve o dosya sessizce atlanıyordu.
        ladder_pos = LADDER.index(level) if level in LADDER else len(LADDER) - 1
        if success and needs_more and ladder_pos < len(LADDER) - 1:
            for next_level in LADDER[ladder_pos + 1:]:
                alt_path = out_path + f'.{next_level}.tmp'
                try:
                    if not self._compress_with_gs(src_pdf, next_level, alt_path):
                        break
                    alt_size = os.path.getsize(alt_path)
                    # Bir üst kademe en az %10 kazandırıyorsa ve mevcut sonuçtan
                    # küçükse onu benimse; değilse çöpe at.
                    if alt_size < output_size and _saved_pct(alt_size) >= 10.0:
                        os.replace(alt_path, out_path)
                        output_size = alt_size
                        used_level = next_level
                    else:
                        os.remove(alt_path)
                        break
                    if not (target_kb and output_size > target_kb * 1024):
                        break
                except Exception as e:
                    logger.debug(f"kademe yükseltme atlandı ({next_level}): {e}")
                    try:
                        os.path.exists(alt_path) and os.remove(alt_path)
                    except Exception:
                        pass
                    break

        # 2026-08-05 SON ÇARE — RASTERİZASYON:
        # gs hiçbir kademede kazanç sağlayamadıysa (saf-vektör/eğrili PDF'ler)
        # sayfaları görüntüye çevir. 'low' asla rasterize etmez (kalite sözü).
        method = 'gs' if success else 'pypdf'
        RASTER = {'medium': (150, 78), 'high': (130, 70), 'extreme': (110, 60)}
        still_stuck = (
            _saved_pct(output_size) < 3.0 or
            (target_kb and output_size > target_kb * 1024)
        )
        if still_stuck and level in RASTER:
            dpi, q = RASTER[level]
            r_path = out_path + '.raster.tmp'
            if self._rasterize(src_pdf, r_path, dpi, q):
                r_size = os.path.getsize(r_path)
                # rasterin bedeli var; en az %15 kazandırıyorsa değer
                if r_size < min(output_size or input_size, input_size) * 0.85:
                    os.replace(r_path, out_path)
                    output_size = r_size
                    used_level = level
                    method = 'raster'
                else:
                    try:
                        os.remove(r_path)
                    except Exception:
                        pass

        # Eğer hâlâ büyümüşse orijinali kullan
        if output_size and output_size >= input_size:
            try:
                import shutil as _sh
                _sh.copy2(src_pdf, out_path)
                output_size = os.path.getsize(out_path)
                used_level = 'none'
                method = 'none'
            except Exception:
                pass

        metrics = CompressMetrics(input_size_bytes=input_size, output_size_bytes=output_size)
        metrics.used_level = used_level  # type: ignore[attr-defined]
        metrics.method = method  # type: ignore[attr-defined]
        return out_path, metrics


