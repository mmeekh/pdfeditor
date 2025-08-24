#!/bin/bash

# PDF Editor Backend Test Script'i
# Bu script backend'in çalışıp çalışmadığını test eder

echo "🧪 PDF Editor Backend Test Script'i"
echo "==================================="

# Backend servis durumu
echo "📊 Backend servis durumu:"
supervisorctl status pdf-editor-backend

# Port 8000 kontrolü
echo ""
echo "🔌 Port 8000 kontrolü:"
if netstat -tlnp | grep :8000; then
    echo "✅ Backend port 8000'de çalışıyor"
else
    echo "❌ Backend port 8000'de çalışmıyor"
fi

# Nginx durumu
echo ""
echo "🌐 Nginx durumu:"
systemctl status nginx --no-pager -l

# SSL sertifikası kontrolü
echo ""
echo "🔒 SSL sertifikası kontrolü:"
if [ -f "/etc/letsencrypt/live/pdfislemleri.com/fullchain.pem" ]; then
    echo "✅ SSL sertifikası mevcut"
    openssl x509 -in /etc/letsencrypt/live/pdfislemleri.com/cert.pem -text -noout | grep -E "(Subject:|Not After:)"
else
    echo "❌ SSL sertifikası bulunamadı"
fi

# Local test
echo ""
echo "🏠 Local test (Port 8000):"
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Backend localhost:8000'de yanıt veriyor"
else
    echo "❌ Backend localhost:8000'de yanıt vermiyor"
fi

# Domain test
echo ""
echo "🌍 Domain test:"
if curl -s -k https://pdfislemleri.com > /dev/null; then
    echo "✅ Domain erişilebilir"
else
    echo "❌ Domain erişilemiyor"
fi

echo ""
echo "📋 Manuel test komutları:"
echo "   Backend logları: tail -f /var/log/pdf-editor-backend.log"
echo "   Nginx logları:  tail -f /var/log/nginx/error.log"
echo "   Backend restart: supervisorctl restart pdf-editor-backend"
echo "   Nginx restart:  systemctl restart nginx"
