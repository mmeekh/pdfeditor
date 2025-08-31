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

## �� Proje Yapısı

```
pdfeditor/
├── app/                     # FastAPI Backend
│   ├── main.py             # Ana uygulama dosyası
│   ├── requirements.txt    # Python bağımlılıkları
│   ├── Dockerfile          # Docker container
│   ├── compress.py         # PDF sıkıştırma modülü
│   ├── merge.py            # PDF birleştirme modülü
│   ├── organize.py         # PDF düzenleme modülü
│   ├── pdf_to_jpg.py       # PDF'den JPG dönüştürme
│   ├── pdf_to_ppt.py       # PDF'den PPT dönüştürme
│   ├── pdf_to_word.py      # PDF'den Word dönüştürme
│   ├── protect.py          # PDF koruma modülü
│   ├── rotate.py           # PDF döndürme modülü
│   ├── split.py            # PDF bölme modülü
│   ├── unlock.py           # PDF kilidini açma
│   ├── watermark.py        # PDF filigran ekleme
│   ├── word_to_pdf.py      # Word'den PDF dönüştürme
│   ├── core/               # Core modüller
│   │   ├── __init__.py
│   │   ├── config.py       # Konfigürasyon
│   │   ├── lifespan.py     # Uygulama yaşam döngüsü
│   │   ├── middleware.py   # Middleware'ler
│   │   └── utils.py        # Yardımcı fonksiyonlar
│   └── routers/            # API route'ları
│       ├── __init__.py
│       ├── compress.py      # Sıkıştırma endpoint'i
│       ├── merge.py         # Birleştirme endpoint'i
│       ├── organize.py      # Düzenleme endpoint'i
│       ├── pdf_to_jpg.py    # PDF-JPG dönüştürme endpoint'i
│       ├── pdf_to_ppt.py    # PDF-PPT dönüştürme endpoint'i
│       ├── pdf_to_word.py   # PDF-Word dönüştürme endpoint'i
│       ├── protect.py       # Koruma endpoint'i
│       ├── rotate.py        # Döndürme endpoint'i
│       ├── split.py         # Bölme endpoint'i
│       ├── session.py       # Oturum yönetimi
│       ├── unlock.py        # Kilidini açma endpoint'i
│       ├── watermark.py     # Filigran endpoint'i
│       └── word_to_pdf.py   # Word-PDF dönüştürme endpoint'i
├── site/                    # Frontend Dosyaları
│   ├── index.html           # Ana sayfa
│   ├── about.html           # Hakkımızda sayfası
│   ├── contact.html         # İletişim sayfası
│   ├── blog.html            # Blog ana sayfası
│   ├── cookies.html         # Çerez politikası
│   ├── kvkk.html            # KVKK sayfası
│   ├── privacy.html         # Gizlilik politikası
│   ├── terms.html           # Kullanım şartları
│   ├── style.css            # Ana stil dosyası
│   ├── tailwind.js          # Tailwind konfigürasyonu
│   ├── scroll-manager.js    # Scroll yönetimi
│   ├── theme-manager.js     # Tema yönetimi
│   ├── js/                  # JavaScript modülleri
│   │   ├── main.js          # Ana JavaScript dosyası
│   │   ├── modules/         # Core modüller
│   │   │   ├── api.js       # API işlemleri
│   │   │   ├── fileHandler.js # Dosya yönetimi
│   │   │   ├── loader.js    # Loading komponenti
│   │   │   ├── notifications.js # Bildirimler
│   │   │   └── toolManager.js # Araç yönetimi
│   │   └── tools/           # PDF araçları JavaScript'leri
│   │       ├── compress.js  # Sıkıştırma aracı
│   │       ├── merge.js     # Birleştirme aracı
│   │       ├── organize.js  # Düzenleme aracı
│   │       ├── pdf-to-jpg.js # PDF-JPG dönüştürme
│   │       ├── pdf-to-ppt.js # PDF-PPT dönüştürme
│   │       ├── pdf-to-word.js # PDF-Word dönüştürme
│   │       ├── protect.js   # Koruma aracı
│   │       ├── rotate.js    # Döndürme aracı
│   │       ├── split.js     # Bölme aracı
│   │       ├── unlock.js    # Kilidini açma aracı
│   │       ├── watermark.js # Filigran aracı
│   │       └── word-to-pdf.js # Word-PDF dönüştürme
│   ├── blog/                # Blog yazıları
│   │   ├── pdf-birlestirme.html
│   │   ├── pdf-boyut-kucultme.html
│   │   ├── pdf-formlari.html
│   │   ├── pdf-guvenlik.html
│   │   ├── pdf-imzalama.html
│   │   ├── pdf-ocr.html
│   │   ├── telefondan-pdf-duzenleme.html
│   │   └── word-pdf-donusturme.html
│   ├── fontawesome/         # FontAwesome ikonları
│   │   ├── css/
│   │   │   └── all.min.css # FontAwesome CSS
│   │   └── webfonts/       # Font dosyaları
│   │       ├── fa-brands-400.woff2
│   │       ├── fa-regular-400.woff2
│   │       ├── fa-solid-900.woff2
│   │       └── fa-v4compatibility.woff2
│   ├── icons/               # PWA ve site ikonları
│   │   ├── logo.png         # Ana logo
│   │   ├── favicon.ico      # Favicon
│   │   ├── android-chrome-512x512.png
│   │   ├── apple-touch-icon.png
│   │   ├── site.webmanifest # PWA manifest
│   │   └── ...              # Diğer ikonlar
│   ├── images/              # Site görselleri
│   │   ├── pdfandoc.png
│   │   └── pdfandoc.webp
│   ├── robots.txt           # SEO robots
│   ├── sitemap.xml          # SEO sitemap
│   └── security.txt         # Güvenlik bilgileri
├── Caddyfile                # Caddy web sunucusu konfigürasyonu
├── docker-compose.yml       # Docker container orchestration
├── deploy.sh                # Otomatik kurulum script'i
├── check_ssl.sh             # SSL sertifika kontrol script'i
├── env.example              # Environment değişkenleri örneği
├── fix.patch                # Düzeltme patch'i
└── README.md                # Bu dosya
```

## 🛠️ Kurulum

### Ön Gereksinimler

- Ubuntu 22.04+ VPS
- Root erişimi
- Domain (pdfislemleri.com) DNS ayarları


### Hızlı Kurulum

1. **Projeyi klonlayın:**
```bash
git clone <repo-url>
cd web
```

2. **Environment dosyasını hazırlayın:**
```bash
cp env.example .env
nano .env  # EMAIL, SECRET_KEY ve diğer değişkenleri düzenleyin
```

3. **Kurulumu başlatın:**
```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

4. **Kontrol edin:**
```bash
docker compose ps
docker compose logs -f caddy
```

## 🔧 Yönetim Komutları

```bash
# Servisleri durdur
docker compose down

# Logları görüntüle
docker compose logs -f

# Güncelleme
git pull
docker compose up -d --build

# Sadece belirli servisi yeniden başlat
docker compose restart caddy
docker compose restart api

# Disk kullanımı
docker system df
docker volume ls
```

## 🌐 Erişim

- **Ana Site**: https://pdfislemleri.com
- **API**: https://pdfislemleri.com/api
- **Caddy Admin**: http://localhost:2019 (sadece local)

## 🔒 Güvenlik

- **HTTPS**: Otomatik Let's Encrypt SSL
- **CSP**: Content Security Policy
- **HSTS**: HTTP Strict Transport Security
- **Headers**: Güvenlik başlıkları
- **Firewall**: UFW port açma

## 📊 Monitoring

```bash
# Caddy metrics
curl http://localhost:2019/metrics

# Container health
docker compose ps

# Log analizi
docker compose logs --tail=100 caddy | grep ERROR
```

## 🚨 Sorun Giderme

### SSL Sertifika Sorunu
```bash
# Caddy sertifika verilerini temizle
docker compose down
docker volume rm web_caddy_data
docker compose up -d
```

### Port Çakışması
```bash
# Port kullanımını kontrol et
netstat -tulpn | grep :80
netstat -tulpn | grep :443

# Servisleri durdur
sudo systemctl stop apache2 nginx
```

### Disk Alanı
```bash
# Docker temizliği
docker system prune -a
docker volume prune
```

## 🔄 Güncelleme

```bash
# Kod güncellemesi
git pull origin main

# Container yeniden build
docker compose down
docker compose up -d --build

# Sadece frontend güncellemesi
docker compose restart caddy
```

## 📝 Environment Değişkenleri

| Değişken | Açıklama | Örnek |
|----------|----------|-------|
| `DOMAIN` | Ana domain | `pdfislemleri.com` |
| `EMAIL` | SSL sertifika e-postası | `info@pdfislemleri.com` |

## 🎯 Performans Optimizasyonları

- **Sıkıştırma**: zstd + gzip
- **Cache**: Statik dosyalar için 1 hafta
- **CDN**: Tailwind CSS, Font Awesome
- **Lazy Loading**: Resimler için
- **Minification**: CSS/JS optimizasyonu

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 İletişim

- **Website**: https://pdfislemleri.com
- **E-posta**: info@pdfislemleri.com
- **Güvenlik**: security@pdfislemleri.com

---

**Not**: Bu proje eğitim ve geliştirme amaçlıdır. Production kullanımı için ek güvenlik önlemleri alınmalıdır.
