#!/bin/bash

# Production start script for PDF Tools API

# Set environment variables
export ENVIRONMENT=production
export APP_MAX_UPLOAD_MB=50
export APP_SUBPROCESS_TIMEOUT=900
export APP_MAX_CONCURRENCY=8
export APP_RATE_LIMIT_PER_MINUTE=60
export APP_RATE_LIMIT_PER_HOUR=500
export APP_ALLOWED_ORIGINS=*

# Create log directories with proper permissions (as root)
mkdir -p /var/log/pdf-tools-api /var/log/nginx /var/lib/nginx /var/run/nginx /var/log/supervisor
mkdir -p /var/lib/nginx/body /var/lib/nginx/proxy /var/lib/nginx/fastcgi /var/lib/nginx/scgi /var/lib/nginx/uwsgi
chmod 755 /var/log/pdf-tools-api /var/log/nginx /var/lib/nginx /var/run/nginx /var/log/supervisor
chown -R root:root /var/log/nginx /var/lib/nginx /var/run/nginx /var/log/supervisor
chown -R appuser:appuser /var/log/pdf-tools-api

# Copy nginx configuration if it doesn't exist
if [ ! -f /etc/nginx/nginx.conf ]; then
    cp /app/nginx.conf /etc/nginx/nginx.conf
fi

# Copy supervisor configuration
cp /app/supervisord.conf /etc/supervisor/conf.d/pdf-tools.conf

# Test nginx configuration
nginx -t

# Start supervisor to manage all processes
echo "Starting supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/pdf-tools.conf