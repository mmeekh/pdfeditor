#!/usr/bin/env python3
"""
Image Cache-Bust Script
=======================
Tüm site/images/ altındaki dosyaların MD5 hash'ini hesaplar ve
HTML'lerdeki <img src="/images/X"> referanslarını ?v=<hash> ile günceller.

Kullanım: python3 scripts/bust-images.py
Çalıştırma: image değiştirdikten sonra, commit öncesi.

Neden: Caddy static asset cache-control max-age=31536000, immutable.
Browser 1 yıl revalidate etmez. Aynı URL ile yeni içerik gönderilirse
eski cache gelir. Query string değişimi = yeni URL = cache miss.
"""
import hashlib
import re
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
IMG_DIR = SITE / "images"


def main():
    if not IMG_DIR.exists():
        print(f"ERROR: {IMG_DIR} not found")
        sys.exit(1)

    # Hash every image
    hashes = {}
    for img in IMG_DIR.iterdir():
        if img.is_file() and img.suffix.lower() in [".webp", ".jpg", ".jpeg", ".png", ".svg"]:
            h = hashlib.md5(img.read_bytes()).hexdigest()[:8]
            hashes[img.name] = h

    print(f"Hashed {len(hashes)} images in {IMG_DIR}")

    # Update every HTML
    changed_pages = 0
    for f in sorted(SITE.glob("**/*.html")):
        txt = f.read_text(encoding="utf-8")
        orig = txt
        for name, h in hashes.items():
            name_re = re.escape(name)
            txt = re.sub(
                rf'/images/{name_re}(\?v=[a-f0-9]+)?(?=["\')\s&])',
                f"/images/{name}?v={h}",
                txt,
            )
        if txt != orig:
            f.write_text(txt, encoding="utf-8")
            changed_pages += 1

    print(f"Cache-bust applied in {changed_pages} pages")


if __name__ == "__main__":
    main()
