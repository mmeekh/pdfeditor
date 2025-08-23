#!/bin/bash

# Debug script for manual testing if needed
echo "Starting PDF Tools API container..."

# Check if we can import the app
echo "Testing app import..."
cd /app
python -c "from app.main import app; print('App import successful')" || {
    echo "App import failed!"
    exit 1
}

# Start supervisor
echo "Starting supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf