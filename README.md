# PDFişlemleri.com

> Tamamen ücretsiz, reklamsız, kayıt gerektirmeyen 16 aracı bir arada sunan Türkçe PDF işlemleri platformu.
> **Canlı:** [pdfislemleri.com](https://pdfislemleri.com)

[![Backend](https://img.shields.io/badge/backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Frontend](https://img.shields.io/badge/frontend-Vanilla%20JS%20%2B%20Tailwind-38b2ac?logo=tailwindcss)](https://tailwindcss.com)
[![Deploy](https://img.shields.io/badge/deploy-Docker%20%2B%20Caddy-2496ED?logo=docker)](https://www.docker.com)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## ⚡ Özellikler

### 16 PDF Aracı
- **Temel:** Birleştir · Ayır · Sıkıştır · Sırala · Döndür
- **Güvenlik:** Şifrele (AES-256) · Şifre Kaldır · Filigran · Dijital İmza
- **Dönüştürücü:** PDF → Word / PPT / Excel / JPG / TXT · Word → PDF
- **Gelişmiş:** OCR (Türkçe + 22 dil, Tesseract)

### UX
- **Sürükle-bırak her yere** — sayfada herhangi bir yere PDF düşürülür, overlay açılır
- **Anlık sayfa sayısı** — PDF.js ile client-side okuma, cache'li
- **Şifreli PDF oto-tespit** — istenmeyen upload'da modal ile unlock aracına yönlendirir
- **Akıllı çıktı adları** — `sozlesme.pdf` → `sozlesme_sikistirilmis.pdf` (timestamp yok)
- **Sayfa bazlı işlem** — rotate / sign için her sayfa ayrı açı / checkbox
- **Tam responsive** — desktop / tablet / mobile
- **Arama** — 16 tool Türkçe karakter tolerant fuzzy match

### SEO & Performans
- Her tool için ayrı SEO landing page (~1200-1500 kelime özgün içerik)
- `SoftwareApplication` + `HowTo` + `FAQPage` + `Person` schema (E-E-A-T)
- WebP görseller, preload + fetchpriority
- 301 redirect matrix (eski İngilizce slug → Türkçe slug)
- `sitemap.xml` + robots.txt, Google Search Console entegre
- Weekly otomatik SEO raporu (GA4 + Search Console API → JSON)

---

## 🏗 Mimari

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│   Caddy        │───▶│  Static site   │     │  FastAPI       │
│  (TLS + CSP)   │     │  HTML/JS/CSS   │     │  PDF backend   │
└───────┬────────┘     └────────────────┘     └───────┬────────┘
        │                                              │
        └──────────────── /api/* reverse proxy ────────┘
```

- **`app/`** — FastAPI + Python. 16 izole router. İşlem motorları: `pypdf`, `pdfplumber`, `PyMuPDF`, `pdf2docx`, `tabula`, `Tesseract`, `reportlab`.
- **`site/`** — Vanilla JS + Tailwind CSS. Modüler tool JS'leri, PDF.js ile client-side önizleme, SortableJS ile drag-sort.
- **`build.py`** — 16 tool page'i ortak partial'lardan üretir (header/footer/tool-ui/drag-overlay).
- **Caddy** — HTTPS + security header'ları + reverse proxy + SEO redirects.

---

## 🔒 Güvenlik

| Katman | Uygulama |
|---|---|
| TLS | Caddy otomatik Let's Encrypt |
| Security Headers | HSTS (preload), CSP, X-Frame-Options: DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP, CORP |
| Request Body Limit | Caddy 110 MB + FastAPI middleware 100 MB |
| Rate Limit | slowapi — 60 req/dakika/IP |
| CORS | Whitelist (production domain) |
| Input Validation | Pydantic + uzantı + **magic bytes** (PDF `%PDF-`, DOCX `PK\x03\x04`, DOC OLE imzaları) |
| Filename Sanitization | Path traversal, null byte, control char stripping |
| Path Traversal | `ensure_safe_path` her dosya işleminde |
| Secret Management | `.env` + `secrets/` gitignored, service account key chmod 600 |
| Sensitive Path Block | Caddy'de `.env`, `.git`, `secrets/`, `docker-compose`, `Dockerfile` → 404 |
| Docker | Non-root user, minimal Alpine image |
| Session | UUID, 5 dakika TTL, sunucuda otomatik temizlik |
| File Retention | İşlem sonrası 15 dakika içinde kalıcı silme |
| KVKK / GDPR | Dosya içeriği işlenmez, kişisel veri tutulmaz |

---

## 🚀 Kurulum (Docker)

```bash
git clone https://github.com/mmeekh/pdfislemleri.com.git
cd pdfislemleri.com
docker compose up -d --build
curl http://localhost:8000/health
```

### Geliştirme
```bash
cd app
pip install -r requirements.txt
python main.py
# http://localhost:8000
```

### Konfigürasyon (`.env`)
```
SECRET_KEY=...          # production'da random 32+ karakter
TEMP_DIR=/tmp/pdf...
MAX_FILE_SIZE=104857600  # 100 MB
MAX_FILES=20
ALLOW_ORIGINS=https://pdfislemleri.com,https://www.pdfislemleri.com
```

---

## 🧪 Testler

16 tool için end-to-end integration test paketi:

```bash
python3 tests/audit_all_tools.py
# → Real PDF/Word/şifreli PDF/imza ile upload+process+download
# → 16/16 PASS gerekli
```

Fixtures: `tests/fixtures/` (3-sayfa PDF, 10-sayfa PDF, şifreli PDF, tablo PDF, DOCX, base64 imza).

---

## 📊 SEO Otomasyonu

```bash
GA4_PROPERTY_ID=<id> python3 scripts/seo_report.py --days 30
```

Haftalık cron (Pazartesi 09:00) → `reports/seo-YYYY-MM-DD.json`
- Search Console: top queries, pages, clicks/impressions/CTR/position
- GA4: users, sessions, bounce rate, engagement rate per page

---

## 🎨 Tasarım Kararları

- **Neden 16 ayrı landing page?** Her tool için ayrı URL + özgün ~1300 kelime içerik → her biri ayrı keyword için ranks. Rakipler (iLovePDF, SmallPDF, PDF24) bu modeli kullanıyor.
- **Neden Vanilla JS?** Tool'lar hızlı yüklenmeli — React bundle overhead yok. Her sayfa sadece ihtiyacı olan tool modülünü yükler.
- **Neden Caddy?** Let's Encrypt otomatik, declarative security header'lar, minimal config.
- **Neden FastAPI?** Pydantic validation, async upload streams, OpenAPI doc otomatik.
- **Neden ayrı JS modülleri?** `js/tools/merge.js`, `split.js`… her tool bağımsız — biri kırılırsa diğerleri etkilenmez.

---

## 👨‍💻 Geliştirici

**Emin Kılıç** · Kurucu & Geliştirici
[LinkedIn](https://www.linkedin.com/in/emin-k%C4%B1l%C4%B1%C3%A7-250b14210/) · [Instagram](https://instagram.com/heremmkh)

Bu proje, Türkiye'de yüksek kaliteli + ücretsiz + reklamsız PDF araçlarına erişim sağlamak için geliştirildi. Rakipler ücretli abonelik ya da günlük kota dayatıyor; bu platform tamamen ücretsiz ve sınırsız.

---

## 📄 Lisans

MIT — ticari kullanım izinli. Fork atıp kendi siteniz için kullanabilirsiniz.
