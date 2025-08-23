# PDF Tools API - Production Deployment Guide

Bu kılavuz, PDF Tools API uygulamanızı VPS'de production ortamında nasıl kuracağınızı ve yöneteceğinizi açıklar.

## 🚀 Hızlı Başlangıç

### 1. VPS Gereksinimleri

- **İşletim Sistemi**: Ubuntu 20.04 LTS veya üzeri
- **RAM**: Minimum 2GB (Önerilen: 4GB+)
- **CPU**: Minimum 2 vCPU (Önerilen: 4 vCPU+)
- **Disk**: Minimum 20GB boş alan
- **Port**: 80 (HTTP) ve 443 (HTTPS) açık olmalı

### 2. Sistem Paketlerini Kurun

```bash
# Sistem güncellemelerini yapın
sudo apt update && sudo apt upgrade -y

# Gerekli paketleri kurun
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Docker kurulumu
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Docker Compose kurulumu
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Kullanıcınızı docker grubuna ekleyin
sudo usermod -aG docker $USER
newgrp docker
```

### 3. Proje Dosyalarını Yükleyin

```bash
# Proje dizinini oluşturun
mkdir -p ~/pdf-tools-api
cd ~/pdf-tools-api

# Proje dosyalarını yükleyin (SFTP, SCP veya Git ile)
# Örnek: Git ile
git clone https://github.com/your-username/pdf-tools-api.git .
# Veya dosyaları manuel olarak yükleyin

# Gerekli dizinleri oluşturun
mkdir -p logs static
```

### 4. Uygulamayı Başlatın

```bash
# Deployment script'ini çalıştırılabilir yapın
chmod +x deploy.sh

# Uygulamayı başlatın
./deploy.sh
```

## 🔧 Konfigürasyon

### Environment Variables

Production ortamı için `.env.production` dosyasını düzenleyin:

```bash
# .env.production dosyasını oluşturun
cp .env.production.example .env.production

# Dosyayı düzenleyin
nano .env.production
```

Önemli ayarlar:
- `SECRET_KEY`: Güçlü bir secret key belirleyin
- `ALLOWED_HOSTS`: Domain adresinizi ekleyin
- `APP_MAX_UPLOAD_MB`: Upload limitini ayarlayın

### Nginx Konfigürasyonu

`nginx.conf` dosyasını domain adresinize göre düzenleyin:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    # ... diğer ayarlar
}
```

### SSL Sertifikası (Let's Encrypt)

```bash
# Certbot kurulumu
sudo apt install -y certbot python3-certbot-nginx

# SSL sertifikası alın
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Otomatik yenileme için cron job ekleyin
sudo crontab -e
# Aşağıdaki satırı ekleyin:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoring ve Logs

### Health Check

```bash
# Uygulama durumunu kontrol edin
curl http://localhost/health

# Docker container durumunu kontrol edin
docker-compose ps
```

### Logları İzleyin

```bash
# Uygulama logları
docker-compose logs -f pdf-tools-api

# Nginx logları
tail -f logs/nginx/access.log
tail -f logs/nginx/error.log

# PDF Tools API logları
tail -f logs/pdf-tools-api/app.log
```

### Metrics

```bash
# Prometheus metrics
curl http://localhost/metrics

# Sistem kaynakları
docker stats
```

## 🚨 Güvenlik

### Firewall Ayarları

```bash
# UFW kurulumu
sudo apt install -y ufw

# Firewall kuralları
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Firewall'u etkinleştirin
sudo ufw enable
```

### Docker Güvenlik

```bash
# Docker daemon güvenlik ayarları
sudo nano /etc/docker/daemon.json

# Aşağıdaki ayarları ekleyin:
{
  "userns-remap": "default",
  "no-new-privileges": true,
  "live-restore": true,
  "userland-proxy": false
}

# Docker'ı yeniden başlatın
sudo systemctl restart docker
```

## 🔄 Güncelleme ve Bakım

### Uygulama Güncelleme

```bash
# Yeni versiyonu çekin
git pull origin main

# Uygulamayı yeniden başlatın
./deploy.sh
```

### Sistem Güncellemeleri

```bash
# Güvenlik güncellemeleri
sudo apt update && sudo apt upgrade -y

# Docker image'larını temizleyin
docker system prune -a

# Log dosyalarını temizleyin
sudo logrotate /etc/logrotate.conf
```

### Backup

```bash
# Uygulama verilerini yedekleyin
tar -czf pdf-tools-api-backup-$(date +%Y%m%d).tar.gz \
    --exclude=logs \
    --exclude=__pycache__ \
    --exclude=.git \
    .

# Docker volume'larını yedekleyin
docker run --rm -v pdf-tools-api_logs:/data -v $(pwd):/backup alpine tar czf /backup/logs-backup-$(date +%Y%m%d).tar.gz -C /data .
```

## 🆘 Sorun Giderme

### Yaygın Sorunlar

1. **Port 80 kullanımda hatası**
   ```bash
   sudo netstat -tlnp | grep :80
   sudo systemctl stop apache2  # Apache çalışıyorsa
   ```

2. **Docker permission hatası**
   ```bash
   sudo usermod -aG docker $USER
   newgrp docker
   ```

3. **Disk alanı yetersiz**
   ```bash
   df -h
   docker system prune -a
   ```

4. **Memory yetersiz**
   ```bash
   free -h
   # docker-compose.yml'da memory limitlerini düşürün
   ```

### Debug Modu

```bash
# Debug logları ile başlatın
docker-compose down
docker-compose up --build

# Detaylı logları görün
docker-compose logs -f --tail=100
```

## 📞 Destek

Sorun yaşadığınızda:

1. Logları kontrol edin
2. Docker container durumunu kontrol edin
3. Sistem kaynaklarını kontrol edin
4. GitHub Issues'da arama yapın

## 📚 Ek Kaynaklar

- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Ubuntu Server Guide](https://ubuntu.com/server/docs)
