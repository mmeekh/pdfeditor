import io
import logging
import os
from typing import Optional
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

logger = logging.getLogger(__name__)

class PDFWatermarker:
    """Apply text watermark to PDF pages."""

    def __init__(self, temp_dir: Optional[str] = None):
        self.temp_dir = temp_dir

    def add_text_watermark(
        self,
        input_pdf: str,
        output_pdf: str,
        text: str,
        position: str = "center",
        font_size: int = 36,
        color: str = "#000000",
        opacity: float = 0.5,
    ) -> str:
        reader = PdfReader(input_pdf)
        writer = PdfWriter()

        for page in reader.pages:
            packet = io.BytesIO()
            width = float(page.mediabox.width)
            height = float(page.mediabox.height)
            c = canvas.Canvas(packet, pagesize=(width, height))
            c.setFont("Helvetica", font_size)
            c.setFillColor(HexColor(color))
            c.setFillAlpha(opacity)

            if position == "topleft":
                x = 40
                y = height - font_size - 40
                c.drawString(x, y, text)
            elif position == "topright":
                text_width = c.stringWidth(text, "Helvetica", font_size)
                x = width - text_width - 40
                y = height - font_size - 40
                c.drawString(x, y, text)
            elif position == "fill":
                step_x = c.stringWidth(text, "Helvetica", font_size) + 40
                step_y = font_size * 3
                y = 0
                while y < height:
                    x = 0
                    while x < width:
                        c.drawString(x, y, text)
                        x += step_x
                    y += step_y
            else:  # center
                text_width = c.stringWidth(text, "Helvetica", font_size)
                x = (width - text_width) / 2
                y = (height - font_size) / 2
                c.drawString(x, y, text)

            c.save()
            packet.seek(0)
            watermark_pdf = PdfReader(packet)
            page.merge_page(watermark_pdf.pages[0])
            writer.add_page(page)

        with open(output_pdf, "wb") as f:
            writer.write(f)

        # 2026-08-05: PyPDF2 yazımı vektör-yoğun PDF'lerde dosyayı 5x şişirebiliyor
        # (952KB CV → 5.3MB görüldü). fitz ile yeniden sıkıştır; küçülürse onu kullan.
        try:
            import fitz as _fitz
            _tmp = output_pdf + '.deflate.tmp'
            _d = _fitz.open(output_pdf)
            _d.save(_tmp, garbage=4, deflate=True, clean=True)
            _d.close()
            if os.path.getsize(_tmp) < os.path.getsize(output_pdf):
                os.replace(_tmp, output_pdf)
            else:
                os.remove(_tmp)
        except Exception as e:
            logger.warning("deflate pası atlandı: %s", e)
        logger.info("Watermark applied: %s", output_pdf)
        return output_pdf
