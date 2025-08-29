"""
PDF Ayırma Modülü
PDFişlemleri.com için PDF ayırma işlemlerini yönetir.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import List, Tuple, Optional
from pathlib import Path
from datetime import datetime
import logging
from PyPDF2 import PdfReader, PdfWriter

logger = logging.getLogger(__name__)


class PDFSplitError(Exception):
    pass


@dataclass
class SplitResult:
    output_files: List[str]
    zip_path: Optional[str]


class PDFSplitter:
    def __init__(self, temp_dir: str):
        self.temp_dir = temp_dir
        os.makedirs(self.temp_dir, exist_ok=True)

    def _parse_page_ranges(self, pages_str: str) -> List[Tuple[int, int]]:
        """"1-3,5,8-10" biçimini [(1,3),(5,5),(8,10)]'a çevirir."""
        ranges: List[Tuple[int, int]] = []
        if not pages_str:
            return ranges
        parts = pages_str.replace(' ', '').split(',')
        for part in parts:
            if not part:
                continue
            if '-' in part:
                start, end = part.split('-')
                start_i = int(start)
                end_i = int(end)
                if end_i < start_i:
                    start_i, end_i = end_i, start_i
                ranges.append((start_i, end_i))
            else:
                page = int(part)
                ranges.append((page, page))
        return ranges

    def _generate_filename(self, base_name: str, index: int) -> str:
        root = Path(base_name).stem
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        return f"{root}_parca_{index:03d}_{ts}.pdf"

    def split_by_ranges(self, pdf_path: str, ranges_str: str) -> SplitResult:
        if not os.path.exists(pdf_path):
            raise PDFSplitError('PDF bulunamadı')
        reader = PdfReader(pdf_path)
        page_ranges = self._parse_page_ranges(ranges_str)
        if not page_ranges:
            raise PDFSplitError('Geçerli sayfa aralığı belirtilmedi')

        outputs: List[str] = []
        for idx, (start, end) in enumerate(page_ranges, start=1):
            # PyPDF2: 0-based, end exclusive
            start_i = max(1, start) - 1
            end_i = min(len(reader.pages), end)
            writer = PdfWriter()
            for p in range(start_i, end_i):
                writer.add_page(reader.pages[p])
            out_name = self._generate_filename(pdf_path, idx)
            out_path = os.path.join(self.temp_dir, out_name)
            with open(out_path, 'wb') as f:
                writer.write(f)
            outputs.append(out_path)

        zip_path = self._zip_outputs(outputs, pdf_path)
        return SplitResult(output_files=outputs, zip_path=zip_path)

    def split_every_n(self, pdf_path: str, interval: int) -> SplitResult:
        if not os.path.exists(pdf_path):
            raise PDFSplitError('PDF bulunamadı')
        if interval <= 0:
            raise PDFSplitError('Geçersiz aralık değeri')

        reader = PdfReader(pdf_path)
        total = len(reader.pages)
        outputs: List[str] = []
        index = 1
        for start in range(0, total, interval):
            end = min(start + interval, total)
            writer = PdfWriter()
            for p in range(start, end):
                writer.add_page(reader.pages[p])
            out_name = self._generate_filename(pdf_path, index)
            out_path = os.path.join(self.temp_dir, out_name)
            with open(out_path, 'wb') as f:
                writer.write(f)
            outputs.append(out_path)
            index += 1

        zip_path = self._zip_outputs(outputs, pdf_path)
        return SplitResult(output_files=outputs, zip_path=zip_path)

    def _zip_outputs(self, files: List[str], pdf_path: str) -> str:
        import zipfile
        root = Path(pdf_path).stem
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        zip_name = f"{root}_ayrilmis_{ts}.zip"
        zip_path = os.path.join(self.temp_dir, zip_name)
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for f in files:
                zf.write(f, arcname=Path(f).name)
        return zip_path


