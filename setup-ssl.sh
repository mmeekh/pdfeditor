#!/bin/bash

# PDF İşlemleri SSL Sertifikası Kurulum Script'i
# Bu script Let's Encrypt ile ücretsiz SSL sertifikası kurar

set -e

echo "🔒 PDF İşlemleri SSL Sertifikası Kurulum Script'i"
echo "=================================================="

# Gerekli paketleri kontrol et
check_packages() {
    echo "📦 Gerekli paketler kontrol ediliyor..."
    
    if ! command -v certbot &> /dev/null; then
        echo "❌ Certbot bulunamadı. Kuruluyor..."
        sudo apt update
        sudo apt install -y certbot python3-certbot-nginx
    else
        echo "✅ Certbot mevcut"
    fi
    
    if ! command -v nginx &> /dev/null; then
        echo "❌ Nginx bulunamadı. Kuruluyor..."
        sudo apt install -y nginx
    else
        echo "✅ Nginx mevcut"
    fi
}

# Nginx konfigürasyonu oluştur
setup_nginx() {
    echo "🌐 Nginx konfigürasyonu oluşturuluyor..."
    
    sudo tee /etc/nginx/sites-available/pdfislemleri.com << EOF
server {
    listen 80;
    server_name pdfislemleri.com www.pdfislemleri.com;
    
    # HTTP'den HTTPS'e yönlendirme
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pdfislemleri.com www.pdfislemleri.com;
    
    # SSL sertifikaları (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/pdfislemleri.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pdfislemleri.com/privkey.pem;
    
    # SSL güvenlik ayarları
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Content Security Policy
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';" always;
    
    # Root directory
    root /var/www/pdfislemleri.com;
    index index.html index.htm;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Static files
    location /static/ {
        alias /var/www/pdfislemleri.com/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Main location
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Health check
    location /health {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
    }
    
    # Security: Hide server info
    server_tokens off;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

    # Site'ı aktif et
    sudo ln -sf /etc/nginx/sites-available/pdfislemleri.com /etc/nginx/sites-enabled/
    
    # Nginx syntax kontrolü
    sudo nginx -t
    
    # Nginx restart
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    echo "✅ Nginx konfigürasyonu tamamlandı"
}

# Let's Encrypt sertifikası al
get_ssl_certificate() {
    echo "🔐 Let's Encrypt SSL sertifikası alınıyor..."
    
    # Standalone mode ile sertifika al
    sudo certbot certonly --standalone \
        --email info@pdfislemleri.com \
        --agree-tos \
        --no-eff-email \
        --domains pdfislemleri.com,www.pdfislemleri.com \
        --pre-hook "systemctl stop nginx" \
        --post-hook "systemctl start nginx"
    
    echo "✅ SSL sertifikası alındı"
}

# Auto-renewal kurulumu
setup_auto_renewal() {
    echo "🔄 Otomatik yenileme kuruluyor..."
    
    # Cron job ekle
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    # Systemd timer kurulumu (alternatif)
    sudo tee /etc/systemd/system/certbot-renew.timer << EOF
[Unit]
Description=Certbot Renewal Timer

[Timer]
OnCalendar=*-*-* 12:00:00
RandomizedDelaySec=3600
Persistent=true

[Install]
WantedBy=timers.target
EOF

    sudo tee /etc/systemd/system/certbot-renew.service << EOF
[Unit]
Description=Certbot Renewal Service
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/certbot renew --quiet --deploy-hook "systemctl reload nginx"
User=root

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl enable certbot-renew.timer
    sudo systemctl start certbot-renew.timer
    
    echo "✅ Otomatik yenileme kuruldu"
}

# SSL test
test_ssl() {
    echo "🧪 SSL sertifikası test ediliyor..."
    
    # Sertifika bilgileri
    echo "📋 Sertifika Detayları:"
    sudo openssl x509 -in /etc/letsencrypt/live/pdfislemleri.com/cert.pem -text -noout | grep -E "(Subject:|Not Before:|Not After:|DNS:)"
    
    # SSL Labs test
    echo "🌐 SSL Labs test için: https://www.ssllabs.com/ssltest/analyze.html?d=pdfislemleri.com"
    
    # Browser test
    echo "🔍 Browser'da test edin: https://pdfislemleri.com"
}

# Ana fonksiyon
main() {
    echo "🚀 SSL kurulumu başlatılıyor..."
    
    # Root kontrolü
    if [[ $EUID -ne 0 ]]; then
        echo "❌ Bu script root yetkisi gerektirir"
        exit 1
    fi
    
    # Paket kontrolü
    check_packages
    
    # Nginx kurulumu
    setup_nginx
    
    # SSL sertifikası
    get_ssl_certificate
    
    # Otomatik yenileme
    setup_auto_renewal
    
    # Test
    test_ssl
    
    echo "🎉 SSL kurulumu tamamlandı!"
    echo "📝 Sonraki adımlar:"
    echo "   1. DNS A record'u sunucu IP'sine güncelleyin"
    echo "   2. Firewall'da 80 ve 443 portlarını açın"
    echo "   3. https://pdfislemleri.com adresini test edin"
}

# Script çalıştır
main "$@"
