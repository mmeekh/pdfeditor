FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    ghostscript \
    libgl1 \
    libglib2.0-0 \
    libreoffice \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user and temp dir
RUN useradd --create-home --shell /bin/bash app && \
    mkdir -p /app/temp && \
    chown -R app:app /app
USER app

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:2000/health')" || exit 1

# Expose port
EXPOSE 2000

# Run with Gunicorn
CMD ["gunicorn", "main:app", "--bind", "0.0.0.0:2000", "--workers", "1", "--worker-class", "uvicorn.workers.UvicornWorker", "--timeout", "120"]
