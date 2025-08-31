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
├── site/                    # Frontend dosyaları
│   ├── index.html          # Ana sayfa
│   ├── style.css           # Stil dosyası
│   ├── js/                 # Modüler JavaScript
│   │   ├── main.js         # Ana uygulama
│   │   ├── modules/        # Core modüller
│   │   │   ├── api.js      # API işlemleri
│   │   │   ├── fileHandler.js  # Dosya yönetimi
│   │   │   ├── toolManager.js  # Araç yönetimi
│   │   │   ├── notifications.js # Bildirimler
│   │   │   └── loader.js   # Loading komponenti
│   │   └── tools/          # PDF araçları
│   │       └── merge.js    # PDF birleştirme
│   ├── icons/              # PWA ikonları
│   ├── images/             # Görseller
│   ├── robots.txt          # SEO
│   ├── sitemap.xml         # SEO
│   └── security.txt        # Güvenlik
├── app/                     # FastAPI backend
│   ├── main.py             # API ana dosyası
│   ├── requirements.txt    # Python paketleri
│   └── Dockerfile          # Container
├── Caddyfile               # Caddy konfigürasyonu
├── docker-compose.yml      # Container orchestration
├── deploy.sh               # Tek komut kurulum
├── env.example             # Environment örneği
└── README.md               # Bu dosya
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
