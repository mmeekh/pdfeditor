"""Adds a visible author bio block before </article> in every blog post.

Idempotent: skips files that already contain the marker.
"""
from pathlib import Path

BLOG_DIR = Path(__file__).resolve().parent.parent / "site" / "blog"
MARKER = "author-bio-block"

BIO_HTML = '''<div class="author-bio-block bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6 my-8" id="author-bio-block">
<div class="flex flex-col sm:flex-row items-start gap-4">
<div class="flex-shrink-0">
<div class="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">EK</div>
</div>
<div class="flex-1">
<div class="flex items-center gap-2 mb-2">
<h3 class="text-lg font-bold text-gray-800">Emin Kılıç</h3>
<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">PDFişlemleri.com Kurucusu</span>
</div>
<p class="text-sm text-gray-700 leading-relaxed mb-3">Full-stack geliştirici. PDFişlemleri.com'u 2024'te KOBİ'lerin ve serbest çalışanların ücretsiz, KVKK uyumlu PDF araçlarına erişebilmesi için kurdu. FastAPI, Python ve Tesseract tabanlı altyapıyı tek başına geliştirdi. PDF dosya formatı, e-imza standartları (5070 Sayılı Kanun) ve KVKK uyumu konularında uygulamalı deneyim sahibi.</p>
<div class="flex flex-wrap gap-3 text-sm">
<a class="inline-flex items-center text-blue-700 hover:text-blue-900 font-medium" href="https://www.linkedin.com/in/eminnkilic/" rel="author noopener" target="_blank"><i class="fab fa-linkedin mr-1.5"></i>LinkedIn</a>
<a class="inline-flex items-center text-blue-700 hover:text-blue-900 font-medium" href="/about"><i class="fas fa-user mr-1.5"></i>Hakkımızda</a>
<a class="inline-flex items-center text-blue-700 hover:text-blue-900 font-medium" href="/contact"><i class="fas fa-envelope mr-1.5"></i>İletişim</a>
</div>
</div>
</div>
</div>
'''

def inject(path: Path) -> str:
    html = path.read_text(encoding="utf-8")
    if MARKER in html:
        return "skip"
    if "</article>" not in html:
        return "no-article"
    new = html.replace("</article>", BIO_HTML + "</article>", 1)
    path.write_text(new, encoding="utf-8")
    return "added"

def main():
    files = sorted(BLOG_DIR.glob("*.html"))
    counts = {"added": 0, "skip": 0, "no-article": 0}
    for f in files:
        result = inject(f)
        counts[result] += 1
        print(f"{result:12} {f.name}")
    print(f"\nTotal: {counts}")

if __name__ == "__main__":
    main()
