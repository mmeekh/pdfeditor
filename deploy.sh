#!/usr/bin/env bash
set -euo pipefail

# Root gerekli
if [ "$EUID" -ne 0 ]; then
  echo "Lütfen: sudo ./deploy.sh"
  exit 1
fi

echo "🚀 PDFişlemleri.com VPS Kurulumu Başlıyor..."

# Docker & compose plugin
echo "📦 Docker kuruluyor..."
apt-get update -y
apt-get install -y ca-certificates curl gnupg wget

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Güvenlik duvarı (varsayılan ufw etkinse)
if command -v ufw >/dev/null 2>&1; then
  echo "🔥 Güvenlik duvarı ayarlanıyor..."
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true
  echo "✅ Port 80 ve 443 açıldı"
fi

# Environment dosyası kontrolü
if [ ! -f .env ]; then
  echo "⚠️  .env dosyası bulunamadı. env.example'dan kopyalanıyor..."
  cp env.example .env
  echo "📝 Lütfen .env dosyasındaki EMAIL adresini düzenleyin!"
  echo "   nano .env"
  echo "   Sonra tekrar çalıştırın: sudo ./deploy.sh"
  exit 1
fi

# Build & up
echo "🐳 Docker Compose başlatılıyor..."
docker compose pull || true
docker compose up -d --build

echo ""
echo "✅ Dağıtım tamamlandı!"
echo ""
echo "📊 Log için: docker compose logs -f caddy"
echo "🌐 Site: https://pdfislemleri.com"
echo "🔧 API: https://pdfislemleri.com/api"
echo ""
echo "📝 Önemli komutlar:"
echo "   - Servisleri durdur: docker compose down"
echo "   - Logları gör: docker compose logs -f"
echo "   - Güncelle: git pull && docker compose up -d --build"
echo ""
echo "🎉 PDFişlemleri.com başarıyla canlıya alındı!"
