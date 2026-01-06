# PDFişlemleri.com - Multi-Project DevOps Setup

Modern PDF işlemleri platformu, Caddy + Docker Compose ile multi-project yapıda canlıya alınmış.

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
- **Multi-Project**: Caddy ile birden fazla proje yönetimi
- **Güvenlik**: SSL, CSP, HSTS, güvenlik başlıkları
- **SEO**: PWA, manifest, sitemap, robots.txt
- **Performans**: zstd/gzip sıkıştırma, cache politikaları
- **Dynamic Config**: Backend'den frontend'e dinamik konfigürasyon

## 🏗️ Multi-Project Yapısı

```
root/
├── caddy/
│   ├── Caddyfile                    # Ana Caddy konfigürasyonu
│   └── sites/
│       ├── pdfislemleri.com.Caddyfile
│       └── yakinimdakideprem.com.Caddyfile
├── projects/
│   ├── pdfislemleri.com/
│   │   ├── .env
│   │   ├── app/                     # FastAPI backend
│   │   └── site/                    # Frontend files
│   └── yakinimdakideprem.com/
│       ├── .env
│       ├── app/
│       └── site/
└── docker-compose.yml               # Root orchestration
```

## 🔌 API Endpoints

### Genel Endpoints
- `GET /api/config` - Dinamik konfigürasyon (dosya limitleri, boyut limitleri)
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

## ⚙️ Konfigürasyon

### Environment Variables
Her proje kendi `.env` dosyasına sahiptir:

```env
# projects/pdfislemleri.com/.env
ALLOW_ORIGINS=["https://pdfislemleri.com", "https://www.pdfislemleri.com"]
MAX_FILES=20
MAX_FILE_SIZE=104857600
SESSION_LIFETIME_MINUTES=5
FILE_CLEANUP_HOURS=24
```

### Dynamic Configuration
Frontend, backend'den dinamik olarak konfigürasyon alır:
- Dosya limitleri (`MAX_FILES`)
- Boyut limitleri (`MAX_FILE_SIZE`)
- Session süreleri (`SESSION_LIFETIME_MINUTES`)

## 🛠️ Kurulum

### Ön Gereksinimler
- Ubuntu 22.04+ VPS
- Root erişimi
- Domain DNS ayarları
- Docker & Docker Compose

## 🧪 Testler (Pytest)

Pytest testleri PDF araçlarının upload/process uçlarını doğrular.

```bash
# Sanal ortam (opsiyonel)
python -m venv .venv
source .venv/bin/activate

# Backend bağımlılıkları + pytest
pip install -r app/requirements.txt

# Testleri çalıştır
pytest
```

### 1. Proje Yapısını Oluştur

```bash
# Root dizininde
mkdir -p caddy/sites
mkdir -p projects/pdfislemleri.com
mkdir -p projects/yakinimdakideprem.com

# Projeyi kopyala
cp -r pdfislemleri.com/* projects/pdfislemleri.com/
```

### 2. Caddy Konfigürasyonu

```bash
# Ana Caddyfile
cat > caddy/Caddyfile << 'EOF'
{
  email your-email@example.com
}

import sites/*.Caddyfile
EOF

# PDFişlemleri.com Caddyfile
cat > caddy/sites/pdfislemleri.com.Caddyfile << 'EOF'
pdfislemleri.com {
    reverse_proxy /api/* pdfislemleri-api:2000
    reverse_proxy /* pdfislemleri-frontend:80
}

www.pdfislemleri.com {
    reverse_proxy /api/* pdfislemleri-api:2000
    reverse_proxy /* pdfislemleri-frontend:80
}
EOF
```

### 3. Docker Compose

```bash
# Root docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: "3.9"

services:
  caddy:
    image: caddy:2.8
    container_name: root-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    environment:
      - EMAIL=your-email@example.com
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - ./caddy/sites:/etc/caddy/sites:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - caddy_network
      - pdfislemleri_network

  pdfislemleri-api:
    build:
      context: ./projects/pdfislemleri.com/app
    container_name: pdfislemleri-api
    restart: unless-stopped
    expose:
      - "2000"
    env_file:
      - ./projects/pdfislemleri.com/.env
    volumes:
      - api_temp:/app/temp
    networks:
      - caddy_network
      - pdfislemleri_network

  pdfislemleri-frontend:
    image: nginx:alpine
    container_name: pdfislemleri-frontend
    restart: unless-stopped
    volumes:
      - ./projects/pdfislemleri.com/site:/usr/share/nginx/html:ro
    networks:
      - caddy_network
      - pdfislemleri_network

volumes:
  caddy_data:
  caddy_config:
  api_temp:

networks:
  caddy_network:
    driver: bridge
  pdfislemleri_network:
    driver: bridge
EOF
```

### 4. Servisleri Başlat

```bash
# Servisleri başlat
docker-compose up -d

# Logları kontrol et
docker-compose logs -f caddy
```

## 🔒 Güvenlik

- **HTTPS**: Otomatik Let's Encrypt SSL
- **CSP**: Content Security Policy
- **HSTS**: HTTP Strict Transport Security
- **Headers**: Güvenlik başlıkları
- **Rate Limiting**: API rate limiting
- **File Cleanup**: Otomatik dosya temizleme
- **Session Management**: Güvenli session yönetimi

## 📊 Monitoring

```bash
# Container durumları
docker-compose ps

# Logları izle
docker-compose logs -f

# API sağlık kontrolü
curl https://pdfislemleri.com/api/health

# Konfigürasyon kontrolü
curl https://pdfislemleri.com/api/config
```

## 🚀 Deployment

### Yeni Proje Ekleme

1. **Proje klasörünü oluştur**:
   ```bash
   mkdir -p projects/yeni-proje.com
   ```

2. **Caddyfile oluştur**:
   ```bash
   cat > caddy/sites/yeni-proje.com.Caddyfile << 'EOF'
   yeni-proje.com {
       reverse_proxy /api/* yeni-proje-api:2000
       reverse_proxy /* yeni-proje-frontend:80
   }
   EOF
   ```

3. **Docker Compose'a servis ekle**:
   ```yaml
   yeni-proje-api:
     build:
       context: ./projects/yeni-proje.com/app
     container_name: yeni-proje-api
     restart: unless-stopped
     expose:
       - "2000"
     env_file:
       - ./projects/yeni-proje.com/.env
     networks:
       - caddy_network
       - yeni_proje_network
   ```

4. **Caddy'yi yeniden başlat**:
   ```bash
   docker-compose restart caddy
   ```

## 🔧 Geliştirme

### Frontend Geliştirme
```bash
# Tailwind CSS derleme
npx tailwindcss -i ./site/css/base.css -o ./site/style.css --watch

# Vite geliştirme sunucusu
npm run dev
```

### Backend Geliştirme
```bash
# Geliştirme modunda çalıştır
docker-compose -f docker-compose.dev.yml up -d

# API logları
docker-compose logs -f pdfislemleri-api
```

## 📝 Notlar

- Her proje kendi `.env` dosyasına sahiptir
- Caddy otomatik SSL sertifikası alır
- Dosyalar işlem sonrası otomatik silinir
- Multi-project yapı sayesinde kolayca yeni projeler eklenebilir
- Dynamic configuration ile frontend-backend senkronizasyonu

## 🆘 Troubleshooting

### Port Çakışması
```bash
# Port kullanımını kontrol et
netstat -tlnp | grep :80

# Eski container'ları durdur
docker-compose down
```

### SSL Sorunları
```bash
# Caddy logları
docker-compose logs caddy

# SSL sertifikalarını yenile
docker-compose restart caddy
```

### API Bağlantı Sorunları
```bash
# API sağlık kontrolü
curl http://localhost/api/health

# Container durumları
docker-compose ps
```
