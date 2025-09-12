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
- **CSS Yapısı**: Modülerleştirilmiş stil dosyaları (`base.css`, `components.css`, `theme.css`) ile daha düzenli ve ölçeklenebilir frontend geliştirme

## ⚙️ Environment

CORS için izin verilen alan adları `.env` dosyasındaki `ALLOW_ORIGINS` değeri ile yapılandırılır. Format olarak JSON dizisi kullanılmalıdır; örnek için `.env.example` dosyasına bakabilirsiniz.

## 📁 Proje Yapısı

C:.
│   .env
│   .gitignore
│   Caddyfile
│   deploy.sh
│   docker-compose.yml
│   env.example
│   README.md
│
├───.github
│   └───workflows
│           deploy.yml
│
├───app
│   │   compress.py
│   │   Dockerfile
│   │   Dockerfile.dev
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
│   ├───routers
│   │       compress.py
│   │       merge.py
│   │       organize.py
│   │       pdf_to_jpg.py
│   │       pdf_to_ppt.py
│   │       pdf_to_word.py
│   │       protect.py
│   │       rotate.py
│   │       session.py
│   │       split.py
│   │       unlock.py
│   │       watermark.py
│   │       word_to_pdf.py
│   │       __init__.py
│   │
│   └───temp
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
    ├───cardbgs
    │       Compression.webp
    │       merge.webp
    │       pdflock.webp
    │       pdforganize.webp
    │       pdfrotate.webp
    │       pdftoimage.webp
    │       pdftoppt.webp
    │       pdftoword_no_bg.webp
    │       pdfwatermark.webp
    │       split.webp
    │       unlock_no_bg.webp
    │       wordtopdf.webp
    │
    ├───css
    │       base.css
    │       components.css
    │       gradients.css
    │       theme.css
    │
    ├───icons
    │       apple-touch-icon.webp
    │       browserconfig.xml
    │       favicon.ico
    │       icon-512x512.webp
    │       logo.webp
    │       mstile-150x150.webp
    │       safari-pinned-tab.svg
    │       site.webmanifest
    │
    ├───images
    │       about-og.jpeg
    │       blog-og.jpeg
    │       catpdf.webp
    │       home-og.jpeg
    │       mobile-pdf-edit.webp
    │       pdcsec.webp
    │       pdf-compress.webp
    │       pdf-forms.webp
    │       pdf-merge.webp
    │       pdf-ocr.webp
    │       pdf-security.webp
    │       pdf-signature.webp
    │       pdfandoc.webp
    │       terms-og.webp
    │       word-to-pdf.webp
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
- **Rate Limiting & Fail2ban**: Brute force ve DDoS girişimlerine karşı ek güvenlik katmanı

