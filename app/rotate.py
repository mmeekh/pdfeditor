import logging
from typing import Optional
from PyPDF2 import PdfReader, PdfWriter

logger = logging.getLogger(__name__)

class PDFRotator:
    """Rotate pages of a PDF document."""

    def __init__(self, temp_dir: Optional[str] = None):
        self.temp_dir = temp_dir

    def rotate(self, input_pdf: str, output_pdf: str, degrees: int = 90) -> str:
        """Rotate all pages of input_pdf by given degrees and save to output_pdf."""
        reader = PdfReader(input_pdf)
        writer = PdfWriter()
        for page in reader.pages:
            page.rotate(degrees)
            writer.add_page(page)
        with open(output_pdf, "wb") as f:
            writer.write(f)
        logger.info("PDF rotated by %s degrees: %s", degrees, output_pdf)
        return output_pdf
