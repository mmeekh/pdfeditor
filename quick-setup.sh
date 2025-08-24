#!/bin/bash

# Hızlı PDF Editor Backend Kurulum Script'i
# Supervisor konfigürasyon sorununu çözer

echo "🚀 Hızlı PDF Editor Backend Kurulum Script'i"
echo "============================================="

# Root kontrolü
if [ "$EUID" -ne 0 ]; then
    echo "❌ Bu script root yetkisi gerektirir"
    echo "sudo ./quick-setup.sh komutunu kullanın"
    exit 1
fi

# Proje dizinine git
cd /home/pdfuser/pdfeditor

echo "📦 Gerekli sistem paketleri kontrol ediliyor..."
apt update
apt install -y python3-venv python3-pip

echo "🐍 Python virtual environment oluşturuluyor..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Virtual environment oluşturuldu"
else
    echo "✅ Virtual environment zaten mevcut"
fi

echo "📚 Gerekli Python paketleri yükleniyor..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "📁 Gerekli dizinler oluşturuluyor..."
mkdir -p temp
mkdir -p logs
chown -R pdfuser:pdfuser temp logs

echo "🔧 Supervisor konfigürasyonu düzeltiliyor..."
# Mevcut supervisor konfigürasyonunu yedekle
if [ -f "/etc/supervisor/supervisord.conf" ]; then
    cp /etc/supervisor/supervisord.conf /etc/supervisor/supervisord.conf.backup
fi

# Yeni konfigürasyonu kopyala
cp supervisord.conf /etc/supervisor/supervisord.conf

# Supervisor'ı yeniden başlat
systemctl restart supervisor

echo "⏳ Supervisor durumu kontrol ediliyor..."
sleep 3

echo "🚀 Backend servisi başlatılıyor..."
supervisorctl reread
supervisorctl update
supervisorctl start pdf-editor-backend

echo "⏳ Servis durumu kontrol ediliyor..."
sleep 3
supervisorctl status pdf-editor-backend

echo "🌐 Nginx yeniden başlatılıyor..."
systemctl restart nginx

echo "✅ Kurulum tamamlandı!"
echo ""
echo "📋 Durum kontrolü:"
echo "   Backend: supervisorctl status pdf-editor-backend"
echo "   Nginx:  systemctl status nginx"
echo "   Loglar: tail -f /var/log/pdf-editor-backend.log"
echo ""
echo "🌍 Test etmek için: https://pdfislemleri.com"
