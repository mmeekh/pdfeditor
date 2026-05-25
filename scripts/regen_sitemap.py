#!/usr/bin/env python3
"""
One-shot sitemap regenerator.

Walks site/*.html and site/blog/*.html, maps URL paths back to filesystem,
and updates <lastmod> for every <url> entry to the file's real mtime.
Image/title/caption blocks are preserved verbatim.

URL -> file mapping rules (matches Caddy try_files {path}.html):
    https://pdfislemleri.com/                       -> site/index.html
    https://pdfislemleri.com/foo                    -> site/foo.html
    https://pdfislemleri.com/blog/foo               -> site/blog/foo.html
    https://pdfislemleri.com/blog                   -> site/blog.html

Priority normalization (per task):
    /              -> 1.0
    tool pages     -> 0.9   (everything under root that is a tool/converter)
    blog pages     -> 0.7
    legal/about/contact left as-is unless missing
"""
from __future__ import annotations

import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
SITEMAP = SITE / "sitemap.xml"
BASE = "https://pdfislemleri.com"

# Tool/converter slugs (priority 0.9)
TOOL_SLUGS = {
    "pdf-birlestir", "pdf-ayir", "pdf-sikistir", "pdf-sirala", "pdf-dondur",
    "pdf-imzala", "pdf-sifrele", "pdf-sifre-kaldir", "pdf-filigran", "pdf-ocr",
    "pdf-to-word", "word-to-pdf", "pdf-to-ppt", "pdf-to-excel",
    "pdf-to-jpg", "pdf-to-txt",
}

URL_RE = re.compile(
    r"(<url\b[^>]*>)(.*?)(</url>)",
    re.DOTALL,
)
LOC_RE = re.compile(r"<loc>([^<]+)</loc>")
LASTMOD_RE = re.compile(r"<lastmod>[^<]*</lastmod>")
PRIORITY_RE = re.compile(r"<priority>[^<]*</priority>")


def url_to_file(url: str) -> Path | None:
    """Map sitemap URL to local HTML file. Return None if not found."""
    if not url.startswith(BASE):
        return None
    path = url[len(BASE):].strip("/")
    if not path:
        return SITE / "index.html"

    # Try direct .html append (Caddy try_files {path}.html)
    candidate = SITE / f"{path}.html"
    if candidate.exists():
        return candidate

    # Try as directory with index.html (unlikely but safe)
    candidate2 = SITE / path / "index.html"
    if candidate2.exists():
        return candidate2

    return None


def fmt_date(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")


def desired_priority(url: str) -> str | None:
    """Return priority string we want for this URL, or None to leave alone."""
    if url == f"{BASE}/" or url == BASE:
        return "1.0"
    path = url[len(BASE):].strip("/")
    if path.startswith("blog/"):
        return "0.7"
    if path == "blog":
        return "0.7"
    if path in TOOL_SLUGS:
        return "0.9"
    return None  # leave existing priority untouched


def process_url_block(block: str) -> tuple[str, str | None, str | None]:
    """Return (new_block, url, new_lastmod) where new_lastmod is None if unchanged."""
    loc_m = LOC_RE.search(block)
    if not loc_m:
        return block, None, None
    url = loc_m.group(1).strip()
    f = url_to_file(url)
    if f is None:
        return block, url, None

    mtime = fmt_date(f.stat().st_mtime)
    new_lastmod_tag = f"<lastmod>{mtime}</lastmod>"

    if LASTMOD_RE.search(block):
        new_block = LASTMOD_RE.sub(new_lastmod_tag, block, count=1)
    else:
        # Insert right after </loc>
        new_block = block.replace(
            f"<loc>{url}</loc>",
            f"<loc>{url}</loc>\n    {new_lastmod_tag}",
            1,
        )

    # Optionally adjust priority
    p = desired_priority(url)
    if p and PRIORITY_RE.search(new_block):
        new_block = PRIORITY_RE.sub(f"<priority>{p}</priority>", new_block, count=1)

    return new_block, url, mtime


def main() -> int:
    if not SITEMAP.exists():
        print(f"ERROR: {SITEMAP} not found", file=sys.stderr)
        return 1

    src = SITEMAP.read_text(encoding="utf-8")

    updated_dates: list[str] = []
    missing: list[str] = []

    def repl(match: re.Match) -> str:
        open_tag, inner, close_tag = match.group(1), match.group(2), match.group(3)
        new_inner, url, new_lastmod = process_url_block(inner)
        if url and new_lastmod is None:
            missing.append(url)
        elif new_lastmod:
            updated_dates.append(new_lastmod)
        return f"{open_tag}{new_inner}{close_tag}"

    new_src = URL_RE.sub(repl, src)
    SITEMAP.write_text(new_src, encoding="utf-8")

    url_count = len(re.findall(r"<url\b", new_src))
    print(f"[regen_sitemap] URLs in sitemap : {url_count}")
    print(f"[regen_sitemap] lastmod updated : {len(updated_dates)}")
    if updated_dates:
        print(f"[regen_sitemap] date range     : {min(updated_dates)} .. {max(updated_dates)}")
    if missing:
        print(f"[regen_sitemap] NO file for {len(missing)} URL(s):", file=sys.stderr)
        for u in missing:
            print(f"  - {u}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
