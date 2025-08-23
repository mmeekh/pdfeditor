# Multi-stage build for production
FROM python:3.11-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy and install requirements
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Production image
FROM python:3.11-slim

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    ENVIRONMENT=production \
    APP_MAX_UPLOAD_MB=50 \
    APP_SUBPROCESS_TIMEOUT=900 \
    APP_MAX_CONCURRENCY=8 \
    APP_RATE_LIMIT_PER_MINUTE=60 \
    APP_RATE_LIMIT_PER_HOUR=500 \
    APP_ALLOWED_ORIGINS=* \
    PYTHONHASHSEED=random \
    PYTHONOPTIMIZE=1 \
    PYTHONPATH=/app \
    DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ghostscript \
        poppler-utils \
        tesseract-ocr \
        tesseract-ocr-tur \
        libreoffice \
        fonts-dejavu \
        locales \
        ca-certificates \
        procps \
        curl \
        nginx \
        gosu \
        supervisor \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && apt-get autoremove -y

# Locale setup
RUN sed -i 's/# tr_TR.UTF-8 UTF-8/tr_TR.UTF-8 UTF-8/' /etc/locale.gen \
    && locale-gen
ENV LANG=tr_TR.UTF-8 \
    LANGUAGE=tr_TR:tr \
    LC_ALL=tr_TR.UTF-8

# Create necessary directories with proper ownership for nginx
RUN mkdir -p /app /var/log /var/cache/nginx /var/run/nginx /var/lib/nginx \
    && mkdir -p /var/log/pdf-tools-api /var/log/nginx \
    && mkdir -p /var/lib/nginx/body /var/lib/nginx/proxy /var/lib/nginx/fastcgi /var/lib/nginx/scgi /var/lib/nginx/uwsgi \
    && chown -R root:root /var/log /var/cache/nginx /var/run/nginx /var/lib/nginx \
    && chown -R appuser:appuser /app /var/log/pdf-tools-api \
    && chmod 755 /var/log/pdf-tools-api \
    && chmod 755 /var/log/nginx \
    && chmod 755 /var/lib/nginx \
    && chmod 755 /var/run/nginx \
    && chmod 755 /var/cache/nginx

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Copy source code
COPY . .

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy supervisor configuration
COPY supervisord.conf /etc/supervisor/conf.d/pdf-tools.conf

# Set proper permissions for start script
RUN chmod +x /app/start.sh

# Keep root user for nginx to work properly
# USER appuser

# Expose ports
EXPOSE 2000 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:2000/health || exit 1

# Start script
CMD ["/app/start.sh"]