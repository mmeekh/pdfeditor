#!/bin/bash

# PDF Editor Backend Başlatma Script'i
# Bu script backend uygulamasını production modunda başlatır

echo "🚀 PDF Editor Backend başlatılıyor..."

# Proje dizinine git
cd /home/pdfuser/pdfeditor

# Virtual environment'ı aktif et (eğer yoksa oluştur)
if [ ! -d "venv" ]; then
    echo "📦 Virtual environment oluşturuluyor..."
    python3 -m venv venv
fi

# Virtual environment'ı aktif et
source venv/bin/activate

# Gerekli paketleri yükle
echo "📦 Gerekli paketler yükleniyor..."
pip install -r requirements.txt

# Environment variables
export ENVIRONMENT=production
export APP_RATE_LIMIT_PER_MINUTE=60
export APP_RATE_LIMIT_PER_HOUR=500
export APP_MAX_UPLOAD_MB=50
export APP_SUBPROCESS_TIMEOUT=900
export APP_MAX_CONCURRENCY=8

# Backend uygulamasını başlat
echo "🔥 FastAPI uygulaması başlatılıyor (Port 8000)..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2 --log-level info
