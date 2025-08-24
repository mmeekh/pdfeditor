# 🔒 PDF İşlemleri SSL Sertifikası Kurulum Kılavuzu

[pdfislemleri.com](http://pdfislemleri.com/) için Let's Encrypt ile ücretsiz SSL sertifikası kurulumu.

## 📋 Ön Gereksinimler

### ✅ Mevcut Durum
- **Domain**: pdfislemleri.com ✅
- **DNS A Record**: 69.62.119.135 ✅
- **CAA Records**: SSL sertifika yetkilileri tanımlanmış ✅
- **Port 80 & 443**: Açık olmalı

### 🔧 Gerekli Yazılımlar
- **Linux**: certbot, nginx/apache
- **Windows**: Win-Acme, IIS
- **Docker**: certbot container

## 🚀 Kurulum Yöntemleri

### 1. Linux Ubuntu/Debian (Önerilen)

```bash
# Script'i çalıştırılabilir yap
chmod +x setup-ssl.sh

# SSL kurulumu
sudo ./setup-ssl.sh
```

**Manuel Kurulum:**
```bash
# Certbot kurulumu
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# SSL sertifikası al
sudo certbot --nginx -d pdfislemleri.com -d www.pdfislemleri.com \
    --email info@pdfislemleri.com \
    --agree-tos \
    --non-interactive

# Otomatik yenileme
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### 2. Windows Server

```powershell
# PowerShell'i Administrator olarak çalıştır
# SSL kurulum script'ini çalıştır
.\setup-ssl.ps1 -Domain "pdfislemleri.com" -Email "info@pdfislemleri.com"
```

**Manuel Kurulum:**
```powershell
# Chocolatey kurulumu
Set-ExecutionPolicy Bypass -Scope Process -Force
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Win-Acme kurulumu
choco install win-acme -y

# SSL sertifikası al
wacs --target iis --siteid 1 --installation iis --accepttos --emailaddress info@pdfislemleri.com --hostname pdfislemleri.com --hostname www.pdfislemleri.com
```

### 3. Docker ile Kurulum

```bash
# Certbot container ile SSL al
docker run -it --rm \
    -v "$(pwd)/letsencrypt:/etc/letsencrypt" \
    -v "$(pwd)/webroot:/var/www/html" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/html \
    --email info@pdfislemleri.com \
    --agree-tos \
    --no-eff-email \
    -d pdfislemleri.com \
    -d www.pdfislemleri.com
```

## 🌐 Web Server Konfigürasyonu

### Nginx (Linux)

```nginx
server {
    listen 80;
    server_name pdfislemleri.com www.pdfislemleri.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pdfislemleri.com www.pdfislemleri.com;
    
    ssl_certificate /etc/letsencrypt/live/pdfislemleri.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pdfislemleri.com/privkey.pem;
    
    # SSL güvenlik ayarları
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    
    root /var/www/pdfislemleri.com;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### IIS (Windows)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="HTTP to HTTPS" stopProcessing="true">
                    <match url="(.*)" />
                    <conditions>
                        <add input="{HTTPS}" pattern="^OFF$" />
                    </conditions>
                    <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
                </rule>
            </rules>
        </rewrite>
        
        <httpProtocol>
            <customHeaders>
                <add name="Strict-Transport-Security" value="max-age=31536000; includeSubDomains" />
                <add name="X-Frame-Options" value="DENY" />
                <add name="X-Content-Type-Options" value="nosniff" />
            </customHeaders>
        </httpProtocol>
    </system.webServer>
</configuration>
```

## 🔒 Güvenlik Ayarları

### SSL/TLS Konfigürasyonu
- **Minimum TLS Version**: 1.2
- **Preferred Ciphers**: ECDHE-RSA-AES128-GCM-SHA256
- **HSTS**: max-age=31536000; includeSubDomains
- **OCSP Stapling**: Enabled

### Security Headers
```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
```

## 🧪 Test ve Doğrulama

### SSL Test Araçları
1. **SSL Labs**: https://www.ssllabs.com/ssltest/analyze.html?d=pdfislemleri.com
2. **Mozilla Observatory**: https://observatory.mozilla.org/
3. **Security Headers**: https://securityheaders.com/

### Manuel Test
```bash
# SSL sertifika bilgileri
openssl s_client -connect pdfislemleri.com:443 -servername pdfislemleri.com

# HTTP to HTTPS yönlendirme
curl -I http://pdfislemleri.com
# 301 Moved Permanently beklenir

# HTTPS bağlantı
curl -I https://pdfislemleri.com
# 200 OK beklenir
```

### Browser Test
1. **HTTP**: http://pdfislemleri.com → HTTPS'e yönlendirilmeli
2. **HTTPS**: https://pdfislemleri.com → Güvenli bağlantı
3. **Mixed Content**: Console'da hata olmamalı

## 🔄 Otomatik Yenileme

### Linux (Cron)
```bash
# Günlük yenileme kontrolü
0 12 * * * /usr/bin/certbot renew --quiet --deploy-hook "systemctl reload nginx"
```

### Windows (Task Scheduler)
```powershell
# Görev zamanlayıcısı ile günlük yenileme
schtasks /create /tn "SSL Renewal" /tr "wacs --renew" /sc daily /st 12:00
```

### Docker (Container)
```bash
# Docker Compose ile otomatik yenileme
version: '3.8'
services:
  certbot:
    image: certbot/certbot
    volumes:
      - ./letsencrypt:/etc/letsencrypt
      - ./webroot:/var/www/html
    command: renew --webroot --webroot-path=/var/www/html
    restart: unless-stopped
```

## 🚨 Sorun Giderme

### Yaygın Hatalar

#### 1. DNS Propagation
```bash
# DNS kayıtlarını kontrol et
nslookup pdfislemleri.com
dig pdfislemleri.com
```

#### 2. Port Açık Değil
```bash
# Port 80 ve 443'ü kontrol et
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# Firewall ayarları
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443
```

#### 3. Sertifika Yenileme Hatası
```bash
# Sertifika durumunu kontrol et
sudo certbot certificates

# Manuel yenileme
sudo certbot renew --force-renewal
```

#### 4. Mixed Content Hatası
- HTTP kaynakları HTTPS'e yönlendir
- Relative URL'ler kullan
- CSP header'ı ekle

### Log Dosyaları
```bash
# Certbot logları
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Nginx logları
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# System logları
sudo journalctl -u nginx -f
```

## 📊 SSL Sertifika Bilgileri

### Let's Encrypt
- **Sertifika Türü**: Domain Validation (DV)
- **Geçerlilik**: 90 gün
- **Yenileme**: Otomatik (60 gün önce)
- **Ücret**: Ücretsiz
- **Limit**: 50 sertifika/domain/hafta

### Sertifika Yolu
```
/etc/letsencrypt/live/pdfislemleri.com/
├── cert.pem          # Sertifika
├── chain.pem         # Ara sertifika
├── fullchain.pem     # Tam zincir
└── privkey.pem       # Özel anahtar
```

## 🔐 Alternatif SSL Sağlayıcıları

### Ücretsiz
- **Let's Encrypt**: Önerilen, otomatik yenileme
- **ZeroSSL**: 90 gün ücretsiz
- **Cloudflare**: Pro plan gerekli

### Ücretli
- **DigiCert**: Enterprise SSL
- **Sectigo**: Wildcard SSL
- **GlobalSign**: Extended Validation

## 📝 Sonraki Adımlar

1. **SSL Kurulumu**: Yukarıdaki yöntemlerden birini seçin
2. **Test**: SSL Labs ve browser testleri yapın
3. **Monitoring**: Sertifika yenileme loglarını takip edin
4. **Security**: Güvenlik header'larını kontrol edin
5. **Performance**: HTTPS performansını optimize edin

## 📞 Destek

- **Email**: info@pdfislemleri.com
- **GitHub Issues**: Repository'de issue açın
- **Documentation**: Bu kılavuzu takip edin

---

**Not**: Bu kılavuz [pdfislemleri.com](http://pdfislemleri.com/) için özel olarak hazırlanmıştır. Diğer domain'ler için uyarlanması gerekebilir.
