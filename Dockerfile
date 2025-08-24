FROM python:3.11-slim

# Sistem paketleri - PDF işleme için gerekli tüm araçlar
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx supervisor curl ca-certificates \
    ghostscript poppler-utils tesseract-ocr tesseract-ocr-tur \
    libreoffice-writer libreoffice-common \
    && rm -rf /var/lib/apt/lists/*

# Çalışma dizini
WORKDIR /app

# Python bağımlılıkları
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt \
    && pip install --no-cache-dir gunicorn uvicorn

# Uygulama dosyalarını kopyala
COPY app /app/app
COPY static /app/static
COPY *.html /app/

# Nginx & Supervisor konfigleri
COPY docker/nginx/pdf-tools.conf /etc/nginx/conf.d/pdf-tools.conf
COPY docker/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Nginx default site'ı kapat
RUN rm -f /etc/nginx/sites-enabled/default || true

# Log klasörleri ve izinler
RUN mkdir -p /var/log/nginx /var/log/supervisor /var/log/pdf-tools \
    && chown -R root:root /app \
    && chmod -R 755 /app \
    && chmod 644 /app/static/css/* /app/static/js/* /app/static/icons/* \
    && chmod 600 /app/static/webfonts/*

# Güvenlik: Gereksiz dosyaları temizle
RUN find /app -name "*.pyc" -delete \
    && find /app -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

EXPOSE 80 443 2000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD curl -f http://localhost/ || exit 1

# Root user ile çalıştır (production için)
USER root

# Supervisor PID 1'de çalışsın
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]