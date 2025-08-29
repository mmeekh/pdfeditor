import os
import logging
from typing import List, Optional
import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

class PDFToJPGConverter:
    """Convert PDF pages to JPG images."""

    def __init__(self, temp_dir: Optional[str] = None):
        self.temp_dir = temp_dir

    def convert(self, input_pdf: str, output_dir: str, dpi: int = 200) -> List[str]:
        doc = fitz.open(input_pdf)
        outputs: List[str] = []
        for i, page in enumerate(doc, start=1):
            pix = page.get_pixmap(dpi=dpi)
            out_path = os.path.join(output_dir, f"page_{i}.jpg")
            pix.save(out_path)
            outputs.append(out_path)
        logger.info("PDF converted to %d JPG images", len(outputs))
        return outputs
