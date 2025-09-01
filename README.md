# PDFişlemleri.com - DevOps + Frontend Projesi

PDF işlemleri için modern web uygulaması, Caddy + Docker Compose ile canlıya alınmış.

## 🚀 Özellikler

- **Frontend**: Modern, responsive HTML/CSS/JS (Tailwind CSS)
- **Web Sunucusu**: Caddy v2.8 (otomatik HTTPS)
- **API**: FastAPI (Python 3.11)
- **Container**: Docker + Docker Compose
- **Güvenlik**: CSP, HSTS, güvenlik başlıkları
- **SEO**: PWA, manifest, sitemap, robots.txt
- **Performans**: zstd/gzip sıkıştırma, cache politikaları

## 📁 Proje Yapısı

```
repo-root/
│   .gitignore
│   Caddyfile
│   deploy.sh
│   docker-compose.yml
│   env.example
│   exit
│   git.patch
│   README.md
│
├───.github
│   └───workflows
│           deploy.yml
│
├───app
│   │   compress.py
│   │   Dockerfile
│   │   main.py
│   │   merge.py
│   │   organize.py
│   │   pdf_to_jpg.py
│   │   pdf_to_ppt.py
│   │   pdf_to_word.py
│   │   protect.py
│   │   requirements.txt
│   │   rotate.py
│   │   split.py
│   │   unlock.py
│   │   watermark.py
│   │   word_to_pdf.py
│   │
│   ├───core
│   │       config.py
│   │       lifespan.py
│   │       middleware.py
│   │       utils.py
│   │       __init__.py
│   │
│   └───routers
│           compress.py
│           merge.py
│           organize.py
│           pdf_to_jpg.py
│           pdf_to_ppt.py
│           pdf_to_word.py
│           protect.py
│           rotate.py
│           session.py
│           split.py
│           unlock.py
│           watermark.py
│           word_to_pdf.py
│           __init__.py
│
└───site
    │   about.html
    │   blog.html
    │   contact.html
    │   cookies.html
    │   index.html
    │   kvkk.html
    │   privacy.html
    │   robots.txt
    │   scroll-manager.js
    │   security.txt
    │   sitemap.xml
    │   style.css
    │   terms.html
    │
    ├───blog
    │       pdf-birlestirme.html
    │       pdf-boyut-kucultme.html
    │       pdf-formlari.html
    │       pdf-guvenlik.html
    │       pdf-imzalama.html
    │       pdf-ocr.html
    │       telefondan-pdf-duzenleme.html
    │       word-pdf-donusturme.html
    │
    ├───icons
    │       about-og.png
    │       android-chrome-512x512.png
    │       apple-touch-icon.png
    │       blog-og.png
    │       browserconfig.xml
    │       favicon.ico
    │       home-og.png
    │       icon-512x512.png
    │       logo.png
    │       mobile-pdf-edit.png
    │       mstile-150x150.png
    │       pdf-compress.png
    │       pdf-forms.png
    │       pdf-merge.png
    │       pdf-ocr.png
    │       pdf-security.png
    │       pdf-signature.png
    │       safari-pinned-tab.svg
    │       site.webmanifest
    │       terms-og.png
    │       word-to-pdf.png
    │
    ├───images
    │       pdfandoc.png
    │
    └───js
        │   main.js
        │   theme-manager.js
        │
        ├───modules
        │       api.js
        │       fileHandler.js
        │       loader.js
        │       notifications.js
        │       toolManager.js
        │       toolManager.js.rej
        │
        └───tools
                compress.js
                merge.js
                organize.js
                pdf-to-jpg.js
                pdf-to-ppt.js
                pdf-to-word.js
                protect.js
                rotate.js
                split.js
                unlock.js
                watermark.js
                word-to-pdf.js

## 🛠️ Kurulum

### Ön Gereksinimler

- Ubuntu 22.04+ VPS
- Root erişimi
- Domain (pdfislemleri.com) DNS ayarları



## 🔒 Güvenlik

- **HTTPS**: Otomatik Let's Encrypt SSL
- **CSP**: Content Security Policy
- **HSTS**: HTTP Strict Transport Security
- **Headers**: Güvenlik başlıkları
- **Firewall**: UFW port açma


