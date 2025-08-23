# PDF Tools API Docker Setup

Bu doküman, PDF Tools API'nin Docker + Nginx + Supervisor + Gunicorn/FastAPI yığını ile nasıl kurulacağını ve çalıştırılacağını açıklar.

## Yapılan Düzeltmeler

### 1. Supervisor Konfigürasyonu
- `--preload` parametresi kaldırıldı (import crash sebebi)
- Çalışma dizini `/app` olarak sabitlendi
- `--chdir /app` parametresi eklendi
- stdout/stderr log dosyaları ayrıldı
- `stopasgroup` ve `killasgroup` ayarları eklendi
- Restart politikaları optimize edildi

### 2. Nginx Konfigürasyonu
- Upstream `127.0.0.1:2000` portuna yönlendirildi
- Proxy ayarları optimize edildi
- Client max body size 100MB olarak ayarlandı
- Timeout değerleri artırıldı

### 3. Dockerfile
- Çalışma dizini `/app` olarak sabitlendi
- Gerekli paketler: nginx, supervisor, curl
- Python dependencies kurulumu
- Supervisor config ve Nginx site config kopyalama
- PID 1: supervisord

### 4. Docker Compose
- Version satırı kaldırıldı
- Tek servis: pdf-tools-api (port 80)
- restart: unless-stopped
- Healthcheck optimize edildi

## Dosya Yapısı

```
pdfeditor/
├── docker/
│   ├── nginx/
│   │   └── pdf-tools.conf          # Nginx site config
│   └── supervisor/
│       └── supervisord.conf        # Supervisor config
├── app/
│   └── main.py                     # FastAPI uygulaması
├── Dockerfile                      # Container imajı
├── docker-compose.yml              # Compose konfigürasyonu
├── build-and-run.ps1              # Build ve run script (PowerShell)
├── debug-container.ps1             # Debug script (PowerShell)
└── start.sh                        # Container başlatma scripti
```

## Kurulum ve Çalıştırma

### PowerShell ile (Önerilen)

```powershell
# Build ve run script'ini çalıştır
.\build-and-run.ps1
```

### Manuel Komutlar

```powershell
# Mevcut container'ları durdur ve temizle
docker-compose down -v

# İmajı yeniden inşa et
docker-compose build --no-cache

# Servisi başlat
docker-compose up -d

# Logları izle
docker-compose logs -f
```

## Debug ve Sorun Giderme

### Container Durumu Kontrol

```powershell
# Container durumunu kontrol et
docker-compose ps

# Logları görüntüle
docker-compose logs -f
```

### Manuel Test

```powershell
# Debug script'ini çalıştır
.\debug-container.ps1
```

### Container İçinde Test

```bash
# Container'a gir
docker exec -it pdfeditor-pdf-tools-api-1 bash

# App import test et
cd /app
python -c "from app.main import app; print('App import successful')"

# Gunicorn'u manuel başlat
/usr/local/bin/gunicorn app.main:app --chdir /app --bind 0.0.0.0:2000 --workers 1 --worker-class uvicorn.workers.UvicornWorker --timeout 120 --log-level debug
```

## Health Check

- **Nginx**: `http://localhost/` (port 80)
- **API**: `http://localhost/health` (Nginx üzerinden proxy)
- **Container**: Docker healthcheck her 30 saniyede bir kontrol eder

## Log Dosyaları

### Supervisor Logları
- `/var/log/supervisor/supervisord.log` - Ana supervisor log
- `/var/log/supervisor/nginx.stdout.log` - Nginx stdout
- `/var/log/supervisor/nginx.stderr.log` - Nginx stderr
- `/var/log/supervisor/gunicorn.stdout.log` - Gunicorn stdout
- `/var/log/supervisor/gunicorn.stderr.log` - Gunicorn stderr

### Nginx Logları
- `/var/log/nginx/access.log` - Access log
- `/var/log/nginx/error.log` - Error log

## Beklenen Sonuç

Başarılı kurulum sonrası:

1. **Container durumu**: `Up` ve healthcheck yeşil
2. **Supervisor**: nginx ve pdf-tools-api RUNNING
3. **Nginx**: Port 80'de çalışıyor
4. **API**: Port 2000'de çalışıyor (Nginx üzerinden proxy)
5. **Loglar**: Crash/exit loop görülmüyor

## Sorun Giderme

### Import Hatası
```bash
# Container içinde test et
python -c "from app.main import app; print('OK')"
```

### Port Çakışması
```powershell
# Port 80 kullanımda mı kontrol et
netstat -an | findstr :80
```

### Permission Hatası
```bash
# Container içinde log klasörlerini kontrol et
ls -la /var/log/supervisor/
ls -la /var/log/nginx/
```

## Notlar

- Supervisor PID 1 olarak çalışır
- Nginx default site kapatıldı
- Gunicorn 2 worker ile çalışır
- Timeout: 120s, Graceful timeout: 30s
- Client max body size: 100MB
