FROM python:3.11-slim

# Sistem paketleri
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx supervisor curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Çalışma dizini
WORKDIR /app

# Python bağımlılıkları
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt \
    && pip install --no-cache-dir gunicorn uvicorn

# Uygulama dosyaları
COPY app /app/app
# Statik dosyalar
COPY static /app/static
# (Varsa) templates
# COPY templates /app/templates

# Nginx & Supervisor konfigleri
COPY docker/nginx/pdf-tools.conf /etc/nginx/conf.d/pdf-tools.conf
COPY docker/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Nginx default site'ı kapat
RUN rm -f /etc/nginx/sites-enabled/default || true

# Log klasörleri
RUN mkdir -p /var/log/nginx /var/log/supervisor

EXPOSE 80
# Opsiyonel: API portunu debug/health için açabilirsiniz
EXPOSE 2000

# Healthcheck (Nginx üstünden)
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD curl -f http://localhost/ || exit 1

# Supervisor PID 1'de çalışsın
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]