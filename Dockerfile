# Python 3.11 Alpine base image
FROM python:3.11-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev \
    && rm -rf /var/cache/apk/*

# Copy requirements first for better caching
COPY app/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ .

# Create temp directory
RUN mkdir -p /app/temp

# Create non-root user
RUN adduser -D -s /bin/sh appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 2000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:2000/health || exit 1

# Run the application
CMD ["python", "main.py"]
