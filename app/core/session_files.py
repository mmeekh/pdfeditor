"""
Oturum dizinindeki dosya seçimi yardımcıları.

Kural (2026-08-04): yüklemeler save_upload_file tarafından oturumun
uploads.json manifestine yazılır; girdi/çıktı ayrımı bu kayıtla yapılır.
Manifest yoksa (eski oturumlar) kısa-rakam-önek sezgisine düşülür.
"""
import json
from pathlib import Path
from typing import List


def uploaded_pdfs(session_dir) -> List[Path]:
    """Oturumdaki KULLANICI YÜKLEMESİ pdf'leri, yükleme sırasına göre."""
    sd = Path(session_dir)
    manifest = sd / "uploads.json"
    if manifest.exists():
        try:
            names = json.loads(manifest.read_text(encoding="utf-8"))
            files = [sd / n for n in names if (sd / n).exists() and n.lower().endswith(".pdf")]
            if files:
                return files  # manifest sırası = yükleme sırası
        except Exception:
            pass
    # eski oturumlar için geriye dönük sezgi: 1-2 haneli rakam öneki
    files = []
    for p in sd.glob("*.pdf"):
        head = p.name.split("_", 1)[0]
        if head.isdigit() and len(head) <= 2:
            files.append(p)
    return sorted(files, key=lambda p: int(p.name.split("_", 1)[0]))
