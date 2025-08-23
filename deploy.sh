#!/bin/bash

# Production deployment script for PDF Tools API
# Run this script on your VPS after uploading the project files

set -e

echo "🚀 Starting PDF Tools API production deployment..."

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ This script should not be run as root"
   exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install it first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p static

# Set proper permissions
echo "🔐 Setting proper permissions..."
chmod +x start.sh
chmod +x deploy.sh

# Copy static files if they exist
if [ -d "static" ] && [ "$(ls -A static)" ]; then
    echo "📋 Static files directory exists and contains files"
else
    echo "⚠️  Static files directory is empty or doesn't exist"
fi

# Stop any existing containers
echo "🛑 Stopping any existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Build and start the application
echo "🔨 Building and starting the application..."
docker-compose build --no-cache

# Start the application
echo "🚀 Starting the application..."
docker-compose up -d

# Wait for the application to start
echo "⏳ Waiting for the application to start..."
sleep 45

# Check if the application is running
echo "🔍 Checking application status..."
max_attempts=10
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -f http://localhost/health > /dev/null 2>&1; then
        echo "✅ Application is running successfully!"
        break
    else
        echo "⏳ Attempt $attempt/$max_attempts: Application not ready yet..."
        if [ $attempt -eq $max_attempts ]; then
            echo "❌ Application failed to start after $max_attempts attempts"
            echo "📝 Checking logs..."
            docker-compose logs --tail=50
            exit 1
        fi
        sleep 10
        ((attempt++))
    fi
done

# Get public IP
echo "🌐 Getting public IP address..."
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "localhost")

echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Application Information:"
echo "  🌐 Public URL: http://$PUBLIC_IP"
echo "  📊 Health Check: http://$PUBLIC_IP/health"
echo "  📈 Metrics: http://$PUBLIC_IP/metrics"
echo "  📝 API Docs: http://$PUBLIC_IP/docs"
echo ""

# Show running containers
echo "🐳 Running containers:"
docker-compose ps

# Show recent logs
echo "📝 Recent logs:"
docker-compose logs --tail=20

echo ""
echo "📋 Useful commands:"
echo "  View logs: docker-compose logs -f"
echo "  Stop app: docker-compose down"
echo "  Restart app: docker-compose restart"
echo "  Update app: git pull && ./deploy.sh"
echo "  Check status: docker-compose ps"
echo ""
echo "🔧 Configuration files:"
echo "  - nginx.conf: Nginx configuration (built into container)"
echo "  - start.sh: Application startup script"
echo "  - docker-compose.yml: Container orchestration"
echo ""
echo "📊 Monitoring:"
echo "  - Health: http://$PUBLIC_IP/health"
echo "  - Metrics: http://$PUBLIC_IP/metrics"
echo "  - Container logs: docker-compose logs -f"
echo ""
echo "🚨 Troubleshooting:"
echo "  If the application doesn't start:"
echo "  1. Check logs: docker-compose logs"
echo "  2. Check Docker status: docker info"
echo "  3. Check port availability: netstat -tlnp | grep :80"
echo "  4. Restart Docker: sudo systemctl restart docker"
