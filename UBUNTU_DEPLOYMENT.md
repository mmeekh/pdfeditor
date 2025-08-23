# Ubuntu Production Deployment Guide for PDF Tools API

Bu rehber, PDF Tools API'yi Ubuntu sunucularında Docker kullanarak production ortamında yayınlamak için hazırlanmıştır.

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Ubuntu 20.04 LTS veya üzeri
- En az 2GB RAM
- En az 10GB disk alanı
- Root olmayan kullanıcı hesabı
- İnternet bağlantısı

### Tek Komutla Kurulum

```bash
# Scripti çalıştırılabilir yap
chmod +x deploy-ubuntu.sh

# Production deployment'ı başlat
./deploy-ubuntu.sh
```

## 📋 Detaylı Kurulum Adımları

### 1. Sistem Güncellemeleri

```bash
# Sistem paketlerini güncelle
sudo apt update && sudo apt upgrade -y

# Gerekli paketleri kur
sudo apt install -y curl wget git unzip software-properties-common
```

### 2. Docker Kurulumu

```bash
# Docker GPG anahtarını ekle
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Docker repository'sini ekle
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker'ı kur
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Kullanıcıyı docker grubuna ekle
sudo usermod -aG docker $USER

# Docker servisini başlat ve etkinleştir
sudo systemctl start docker
sudo systemctl enable docker

# Yeni grup izinlerini uygula (logout/login gerekebilir)
newgrp docker
```

### 3. Docker Compose Kurulumu

```bash
# Docker Compose'u kur
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Çalıştırma izni ver
sudo chmod +x /usr/local/bin/docker-compose

# Symlink oluştur
sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
```

### 4. Proje Kurulumu

```bash
# Proje dizinine git
cd /path/to/pdfeditor

# Gerekli dizinleri oluştur
mkdir -p logs static backups

# Scriptleri çalıştırılabilir yap
chmod +x *.sh
```

### 5. Production Deployment

```bash
# Production deployment'ı başlat
./deploy-ubuntu.sh

# Veya temiz kurulum için
./deploy-ubuntu.sh --clean
```

## 🔧 Konfigürasyon

### Environment Variables

`env.production` dosyasındaki değişkenleri ihtiyacınıza göre düzenleyin:

```bash
# Uygulama ayarları
APP_MAX_UPLOAD_MB=50                    # Maksimum dosya boyutu
APP_RATE_LIMIT_PER_MINUTE=60            # Dakikada maksimum istek
APP_MAX_CONCURRENCY=8                   # Maksimum eşzamanlı işlem

# Performans ayarları
WORKER_PROCESSES=4                      # Gunicorn worker sayısı
WORKER_CONNECTIONS=1000                 # Worker bağlantı sayısı
```

### Nginx Konfigürasyonu

`nginx.conf` dosyası production için optimize edilmiştir:

- Gzip sıkıştırma
- Rate limiting
- Security headers
- Static file caching
- Load balancing

### Supervisor Konfigürasyonu

`supervisord.conf` ile process yönetimi:

- Otomatik restart
- Log yönetimi
- Process monitoring
- Graceful shutdown

## 📊 Monitoring ve Bakım

### Health Check

```bash
# Uygulama sağlığını kontrol et
curl http://localhost/health

# Metrikleri görüntüle
curl http://localhost/metrics
```

### Monitoring Script

```bash
# Tam monitoring raporu
./monitor-ubuntu.sh

# Sadece health check
./monitor-ubuntu.sh health

# Sadece metrikler
./monitor-ubuntu.sh metrics

# Sadece loglar
./monitor-ubuntu.sh logs

# Sistem bilgileri
./monitor-ubuntu.sh system

# Docker durumu
./monitor-ubuntu.sh docker
```

### Log Yönetimi

```bash
# Uygulama logları
tail -f logs/pdf-tools-api.log

# Nginx logları
tail -f logs/nginx.log

# Docker logları
docker-compose logs -f

# Supervisor logları
tail -f logs/supervisor.log
```

## 🚨 Troubleshooting

### Yaygın Sorunlar

#### 1. Port 80 Kullanımda
```bash
# Port 80'i kullanan servisleri bul
sudo netstat -tlnp | grep :80

# Servisi durdur
sudo fuser -k 80/tcp
```

#### 2. Docker Permission Hatası
```bash
# Docker grubunu kontrol et
groups $USER

# Gerekirse ekle
sudo usermod -aG docker $USER
newgrp docker
```

#### 3. Disk Alanı Yetersiz
```bash
# Disk kullanımını kontrol et
df -h

# Eski Docker image'larını temizle
docker system prune -a -f
```

#### 4. Memory Yetersiz
```bash
# Memory kullanımını kontrol et
free -h

# Swap alanı ekle
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Debug Komutları

```bash
# Container durumunu kontrol et
docker-compose ps

# Container loglarını görüntüle
docker-compose logs

# Container'a bağlan
docker-compose exec pdf-tools-api bash

# Nginx konfigürasyonunu test et
docker-compose exec pdf-tools-api nginx -t

# Process'leri kontrol et
docker-compose exec pdf-tools-api supervisorctl status
```

## 🔒 Güvenlik

### Firewall Konfigürasyonu

```bash
# UFW'yi etkinleştir
sudo ufw enable

# SSH'yi aç
sudo ufw allow ssh

# HTTP ve HTTPS'i aç
sudo ufw allow 80
sudo ufw allow 443

# Firewall durumunu kontrol et
sudo ufw status
```

### SSL/TLS Kurulumu (Let's Encrypt)

```bash
# Certbot kur
sudo apt install -y certbot python3-certbot-nginx

# SSL sertifikası al
sudo certbot --nginx -d yourdomain.com

# Otomatik yenileme
sudo crontab -e
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### Güvenlik Güncellemeleri

```bash
# Güvenlik güncellemelerini kur
sudo apt update
sudo apt upgrade -y

# Güvenlik açıklarını kontrol et
sudo apt audit
```

## 📈 Performans Optimizasyonu

### Resource Monitoring

```bash
# Container resource kullanımı
docker stats

# Sistem resource kullanımı
htop

# Disk I/O
iotop
```

### Performance Tuning

```bash
# Nginx worker sayısını artır
# nginx.conf dosyasında worker_processes auto;

# Gunicorn worker sayısını artır
# supervisord.conf dosyasında --workers 8

# Kernel parametrelerini optimize et
echo 'net.core.somaxconn = 65535' | sudo tee -a /etc/sysctl.conf
echo 'net.ipv4.tcp_max_syn_backlog = 65535' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 🔄 Backup ve Recovery

### Backup Script

```bash
# Backup oluştur
./backup.sh

# Backup'ları listele
ls -la backups/
```

### Recovery

```bash
# Backup'tan geri yükle
./backup.sh --restore backup_filename.tar.gz

# Veritabanı backup'ı (eğer varsa)
docker-compose exec pdf-tools-api pg_dump -U username database > backup.sql
```

## 📚 Faydalı Komutlar

### Docker Yönetimi

```bash
# Container'ları yeniden başlat
docker-compose restart

# Container'ları durdur
docker-compose down

# Container'ları güncelle
git pull
docker-compose build --no-cache
docker-compose up -d

# Container loglarını takip et
docker-compose logs -f --tail=100
```

### Sistem Yönetimi

```bash
# Sistem durumunu kontrol et
./monitor-ubuntu.sh system

# Disk kullanımını kontrol et
df -h

# Memory kullanımını kontrol et
free -h

# Load average'ı kontrol et
uptime

# Network bağlantılarını kontrol et
netstat -tlnp
```

## 🌐 Domain ve DNS

### Domain Konfigürasyonu

1. DNS provider'ınızda A record ekleyin
2. Sunucu IP adresini girin
3. TTL değerini 300 saniye olarak ayarlayın

### SSL Sertifikası

```bash
# Let's Encrypt ile SSL
sudo certbot --nginx -d yourdomain.com

# SSL durumunu kontrol et
sudo certbot certificates
```

## 📞 Destek

### Log Dosyaları

- **Uygulama Logları**: `logs/pdf-tools-api.log`
- **Nginx Logları**: `logs/nginx.log`
- **Supervisor Logları**: `logs/supervisor.log`
- **Docker Logları**: `docker-compose logs`

### Monitoring Endpoints

- **Health Check**: `http://yourdomain.com/health`
- **Metrics**: `http://yourdomain.com/metrics`
- **API Docs**: `http://yourdomain.com/docs`

### Troubleshooting Checklist

- [ ] Docker servisi çalışıyor mu?
- [ ] Port 80 ve 2000 açık mı?
- [ ] Disk alanı yeterli mi?
- [ ] Memory yeterli mi?
- [ ] Firewall ayarları doğru mu?
- [ ] SSL sertifikası geçerli mi?
- [ ] DNS ayarları doğru mu?

## 🎯 Production Checklist

- [ ] Environment variables ayarlandı
- [ ] SSL sertifikası kuruldu
- [ ] Firewall konfigürasyonu yapıldı
- [ ] Monitoring aktif
- [ ] Backup sistemi kuruldu
- [ ] Log rotation aktif
- [ ] Security updates otomatik
- [ ] Performance monitoring aktif
- [ ] Error pages hazır
- [ ] Health checks aktif

Bu rehber ile PDF Tools API'yi Ubuntu sunucunuzda güvenli ve performanslı bir şekilde yayınlayabilirsiniz.
