#!/bin/bash

# PDF Editor Backend Kurulum Script'i
# Bu script backend uygulamasını tamamen kurar ve başlatır

echo "🔧 PDF Editor Backend Kurulum Script'i"
echo "======================================"

# Root kontrolü
if [ "$EUID" -ne 0 ]; then
    echo "❌ Bu script root yetkisi gerektirir"
    echo "sudo ./install-backend.sh komutunu kullanın"
    exit 1
fi

# Proje dizinine git
cd /home/pdfuser/pdfeditor

echo "📦 Gerekli sistem paketleri yükleniyor..."
apt update
apt install -y python3-venv python3-pip supervisor

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

echo "🔧 Supervisor konfigürasyonu kuruluyor..."
cp supervisor-pdf-editor.conf /etc/supervisor/conf.d/
supervisorctl reread
supervisorctl update

echo "🚀 Backend servisi başlatılıyor..."
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
