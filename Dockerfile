FROM python:3.11-slim

# Sistem paketleri
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx supervisor curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Güvenlik: Non-root user oluştur
RUN useradd --create-home --shell /bin/bash appuser \
    && chown -R appuser:appuser /app

# Çalışma dizini
WORKDIR /app

# Python bağımlılıkları
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt \
    && pip install --no-cache-dir gunicorn uvicorn

# Sadece gerekli uygulama dosyaları
COPY app /app/app
# Sadece gerekli statik dosyalar (HTML dosyaları hariç)
COPY static /app/static

# Nginx & Supervisor konfigleri
COPY docker/nginx/pdf-tools.conf /etc/nginx/conf.d/pdf-tools.conf
COPY docker/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Nginx default site'ı kapat
RUN rm -f /etc/nginx/sites-enabled/default || true

# Log klasörleri
RUN mkdir -p /var/log/nginx /var/log/supervisor

# Güvenlik: Dosya izinlerini ayarla
RUN chown -R appuser:appuser /app \
    && chmod -R 755 /app \
    && chmod 644 /app/static/css/* /app/static/js/* /app/static/icons/* \
    && chmod 600 /app/static/webfonts/*

# Güvenlik: Gereksiz dosyaları temizle
RUN find /app -name "*.pyc" -delete \
    && find /app -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

EXPOSE 80
# Opsiyonel: API portunu debug/health için açabilirsiniz
EXPOSE 2000

# Healthcheck (Nginx üstünden)
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD curl -f http://localhost/ || exit 1

# Güvenlik: Non-root user ile çalıştır
USER appuser

# Supervisor PID 1'de çalışsın
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]