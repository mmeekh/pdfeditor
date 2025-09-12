# PDFişlemleri.com - DevOps + Frontend Projesi

PDF işlemleri için modern web uygulaması, Caddy + Docker Compose ile canlıya alınmış.

## 🚀 Özellikler

### PDF İşlem Araçları
- **PDF Birleştir**: Birden fazla PDF'i tek dosyada birleştir
- **PDF Ayır**: PDF sayfalarını ayır veya çıkar
- **PDF Sıkıştır**: PDF boyutunu küçült
- **PDF Döndür**: PDF sayfalarını döndür
- **PDF Düzenle**: PDF sayfalarını yeniden düzenle
- **PDF Filigranla**: PDF'e metin/resim filigranı ekle
- **PDF Şifrele**: PDF'e şifre koruması ekle
- **PDF Şifre Kaldır**: PDF şifre korumasını kaldır
- **PDF İmzala**: PDF dosyalarını dijital olarak imzalayın

### Dönüştürme Araçları
- **PDF'den Word'e**: PDF'i düzenlenebilir Word'e dönüştür
- **Word'den PDF'e**: Word'ü PDF'e dönüştür
- **PDF'den PPT'ye**: PDF'i PowerPoint'e dönüştür
- **PDF'den JPG'ye**: PDF sayfalarını resme dönüştür
- **PDF'den Excel'e**: PDF tablolarını Excel'e dönüştürün
- **PDF OCR**: PDF'den metin çıkarın ve düzenlenebilir hale getirin

### Teknik Özellikler
- **Frontend**: Modern, responsive HTML/CSS/JS (Tailwind CSS)
- **Web Sunucusu**: Caddy v2.8 (otomatik HTTPS)
- **API**: FastAPI (Python 3.11)
- **Container**: Docker + Docker Compose
- **Güvenlik**: CSP, HSTS, güvenlik başlıkları
- **SEO**: PWA, manifest, sitemap, robots.txt
- **Performans**: zstd/gzip sıkıştırma, cache politikaları
- **CSS Yapısı**: Modülerleştirilmiş stil dosyaları (`base.css`, `components.css`, `theme.css`) ile daha düzenli ve ölçeklenebilir frontend geliştirme

## 🔌 API Endpoints

### Genel Endpoints
- `GET /api/tools` - Mevcut tüm PDF araçlarını listeler
- `GET /api/status` - API durumunu kontrol eder
- `GET /health` - Sağlık kontrolü

### PDF İşlem Araçları
- `POST /api/merge` - PDF birleştirme
- `POST /api/split` - PDF ayırma
- `POST /api/compress` - PDF sıkıştırma
- `POST /api/rotate` - PDF döndürme
- `POST /api/organize` - PDF düzenleme
- `POST /api/watermark` - PDF filigranlama
- `POST /api/protect` - PDF şifreleme
- `POST /api/unlock` - PDF şifre kaldırma
- `POST /api/sign` - PDF imzalama

### Dönüştürme Araçları
- `POST /api/pdf-to-word` - PDF'den Word'e dönüştürme
- `POST /api/word-to-pdf` - Word'den PDF'e dönüştürme
- `POST /api/pdf-to-ppt` - PDF'den PPT'ye dönüştürme
- `POST /api/pdf-to-jpg` - PDF'den JPG'ye dönüştürme
- `POST /api/pdf-to-excel` - PDF'den Excel'e dönüştürme
- `POST /api/pdf-ocr` - PDF OCR işlemi

## ⚙️ Environment

CORS için izin verilen alan adları `.env` dosyasındaki `ALLOW_ORIGINS` değeri ile yapılandırılır. Format olarak JSON dizisi kullanılmalıdır; örnek için `.env.example` dosyasına bakabilirsiniz.

## 📁 Proje Yapısı

C:.
│   .env
│   .gitignore
│   Caddyfile
│   caddy-sites
│   deploy.sh
│   docker-compose.yml
│   env.example
│   package.json
│   README.md
│   tailwind.config.js
│   vite.config.js
│
├───.github
│   └───workflows
│           deploy.yml
│
├───caddy-sites
│       pdfislemleri.com.Caddyfile
│
├───app
│   │   compress.py
│   │   Dockerfile
│   │   Dockerfile.dev
│   │   main.py
│   │   merge.py
│   │   organize.py
│   │   pdf_ocr.py
│   │   pdf_to_jpg.py
│   │   pdf_to_ppt.py
│   │   pdf_to_word.py
│   │   protect.py
│   │   requirements.txt
│   │   rotate.py
│   │   sign.py
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
│   │       pdf_ocr.py
│   │       pdf_to_excel.py
│   │       pdf_to_jpg.py
│   │       pdf_to_ppt.py
│   │       pdf_to_word.py
│   │       protect.py
│   │       rotate.py
│   │       session.py
│   │       sign.py
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
    │       pdf-filigran.html
    │       pdf-formlari.html
    │       pdf-guvenlik.html
    │       pdf-imzalama.html
    │       pdf-ocr.html
    │       pdf-sifre-kaldirma.html
    │       telefondan-pdf-duzenleme.html
    │       word-pdf-donusturme.html
    │
    ├───cardbgs
    │       Compression.webp
    │       merge.webp
    │       pdflock.webp
    │       pdfocr.webp
    │       pdforganize.webp
    │       pdfrotate.webp
    │       pdftoexcel.webp
    │       pdftoimage.webp
    │       pdftoppt.webp
    │       pdftoword_no_bg.webp
    │       pdfwatermark.webp
    │       signature.webp
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
    │       icon-192x192.webp
    │       icon-512x512.webp
    │       icon-96x96.webp
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
        │       app.js
        │       buttonListeners.js
        │       cookieManager.js
        │       fileHandler.js
        │       lazyLoader.js
        │       loader.js
        │       mobileNavigationManager.js
        │       notifications.js
        │       performanceMonitor.js
        │       toolManager.js
        │
        ├───structured-data
        │       faq.json
        │       organization.json
        │       service-merge.json
        │       service-sign.json
        │       webapp.json
        │
        └───tools
                compress.js
                merge.js
                organize.js
                pdf-ocr.js
                pdf-to-excel.js
                pdf-to-jpg.js
                pdf-to-ppt.js
                pdf-to-word.js
                protect.js
                rotate.js
                sign.js
                split.js
                unlock.js
                watermark.js
                word-to-pdf.js


## 🛠️ Kurulum

### Ön Gereksinimler

- Ubuntu 22.04+ VPS
- Root erişimi
- Domain (pdfislemleri.com) DNS ayarları

### Geliştirme Ortamı

```bash
# Projeyi klonlayın
git clone <repository-url>
cd pdfislemleri.com

# Docker Compose ile çalıştırın
docker-compose up -d

# Geliştirme modunda çalıştırın
docker-compose -f docker-compose.dev.yml up -d
```

### Üretim Ortamı

```bash
# Üretim ortamında çalıştırın
docker-compose up -d

# Logları kontrol edin
docker-compose logs -f
```

### Frontend Geliştirme

```bash
# Bağımlılıkları yükleyin
npm install

# Tailwind CSS'i derleyin
npx tailwindcss -i ./site/css/base.css -o ./site/style.css --watch

# Vite ile geliştirme sunucusunu başlatın
npm run dev
```



## 🔒 Güvenlik

- **HTTPS**: Otomatik Let's Encrypt SSL
- **CSP**: Content Security Policy
- **HSTS**: HTTP Strict Transport Security
- **Headers**: Güvenlik başlıkları
- **Firewall**: UFW port açma
- **Rate Limiting & Fail2ban**: Brute force ve DDoS girişimlerine karşı ek güvenlik katmanı

