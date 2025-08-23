#!/bin/bash

# Ubuntu Production Deployment Script for PDF Tools API
# This script is optimized for Ubuntu 20.04+ and Docker deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

log "🚀 Starting PDF Tools API production deployment on Ubuntu..."

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root"
   exit 1
fi

# Check Ubuntu version
UBUNTU_VERSION=$(lsb_release -rs)
log "Detected Ubuntu version: $UBUNTU_VERSION"

if [[ $(echo "$UBUNTU_VERSION < 20.04" | bc -l) -eq 1 ]]; then
    warn "Ubuntu version $UBUNTU_VERSION is older than 20.04. Some features may not work properly."
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    error "Docker is not installed. Installing Docker..."
    
    # Update package list
    sudo apt-get update
    
    # Install prerequisites
    sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    log "Docker installed successfully. Please log out and log back in, then run this script again."
    exit 0
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    error "Docker is not running. Starting Docker..."
    sudo systemctl start docker
    sudo systemctl enable docker
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed. Installing Docker Compose..."
    
    # Install Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    # Create symlink
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
fi

# Check Docker Compose version
COMPOSE_VERSION=$(docker-compose --version | grep -oP '\d+\.\d+\.\d+')
log "Docker Compose version: $COMPOSE_VERSION"

# Create necessary directories
log "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p static
mkdir -p backups

# Set proper permissions
log "🔐 Setting proper permissions..."
chmod +x start.sh
chmod +x deploy-ubuntu.sh
chmod +x deploy.sh

# Check system resources
log "💻 Checking system resources..."
TOTAL_MEMORY=$(free -m | awk 'NR==2{printf "%.0f", $2}')
TOTAL_DISK=$(df -BG / | awk 'NR==2{printf "%.0f", $2}' | sed 's/G//')

if [ $TOTAL_MEMORY -lt 2048 ]; then
    warn "System has less than 2GB RAM ($TOTAL_MEMORY MB). Performance may be limited."
fi

if [ $TOTAL_DISK -lt 10 ]; then
    warn "System has less than 10GB disk space ($TOTAL_DISK GB). Ensure sufficient space."
fi

# Check if ports are available
log "🔌 Checking port availability..."
if netstat -tlnp | grep -q ":80 "; then
    warn "Port 80 is already in use. Stopping conflicting service..."
    sudo fuser -k 80/tcp 2>/dev/null || true
fi

if netstat -tlnp | grep -q ":2000 "; then
    warn "Port 2000 is already in use. Stopping conflicting service..."
    sudo fuser -k 2000/tcp 2>/dev/null || true
fi

# Stop any existing containers
log "🛑 Stopping any existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Clean up old images (optional)
if [ "$1" = "--clean" ]; then
    log "🧹 Cleaning up old Docker images..."
    docker system prune -f
fi

# Build and start the application
log "🔨 Building and starting the application..."
docker-compose build --no-cache

# Start the application
log "🚀 Starting the application..."
docker-compose up -d

# Wait for the application to start
log "⏳ Waiting for the application to start..."
sleep 45

# Check if the application is running
log "🔍 Checking application status..."
max_attempts=15
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -f http://localhost/health > /dev/null 2>&1; then
        log "✅ Application is running successfully!"
        break
    else
        log "⏳ Attempt $attempt/$max_attempts: Application not ready yet..."
        if [ $attempt -eq $max_attempts ]; then
            error "Application failed to start after $max_attempts attempts"
            log "📝 Checking logs..."
            docker-compose logs --tail=50
            exit 1
        fi
        sleep 10
        ((attempt++))
    fi
done

# Get public IP
log "🌐 Getting public IP address..."
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "localhost")

# Show system information
log "💻 System Information:"
echo "  OS: Ubuntu $(lsb_release -rs) ($(lsb_release -cs))"
echo "  Kernel: $(uname -r)"
echo "  Architecture: $(uname -m)"
echo "  CPU: $(nproc) cores"
echo "  Memory: $TOTAL_MEMORY MB"
echo "  Disk: $TOTAL_DISK GB"

log "🎉 Deployment completed successfully!"
echo ""
log "📊 Application Information:"
echo "  🌐 Public URL: http://$PUBLIC_IP"
echo "  📊 Health Check: http://$PUBLIC_IP/health"
echo "  📈 Metrics: http://$PUBLIC_IP/metrics"
echo "  📝 API Docs: http://$PUBLIC_IP/docs"
echo ""

# Show running containers
log "🐳 Running containers:"
docker-compose ps

# Show recent logs
log "📝 Recent logs:"
docker-compose logs --tail=20

echo ""
log "📋 Useful commands:"
echo "  View logs: docker-compose logs -f"
echo "  Stop app: docker-compose down"
echo "  Restart app: docker-compose restart"
echo "  Update app: git pull && ./deploy-ubuntu.sh"
echo "  Check status: docker-compose ps"
echo "  Monitor resources: docker stats"
echo ""
log "🔧 Configuration files:"
echo "  - nginx.conf: Nginx configuration"
echo "  - supervisord.conf: Process management"
echo "  - start.sh: Application startup script"
echo "  - docker-compose.yml: Container orchestration"
echo "  - env.production: Production environment variables"
echo ""
log "📊 Monitoring:"
echo "  - Health: http://$PUBLIC_IP/health"
echo "  - Metrics: http://$PUBLIC_IP/metrics"
echo "  - Container logs: docker-compose logs -f"
echo "  - System logs: journalctl -u docker"
echo ""
log "🚨 Troubleshooting:"
echo "  If the application doesn't start:"
echo "  1. Check logs: docker-compose logs"
echo "  2. Check Docker status: sudo systemctl status docker"
echo "  3. Check port availability: sudo netstat -tlnp | grep :80"
echo "  4. Restart Docker: sudo systemctl restart docker"
echo "  5. Check disk space: df -h"
echo "  6. Check memory: free -h"
echo ""
log "🔒 Security recommendations:"
echo "  - Configure firewall: sudo ufw enable"
echo "  - Set up SSL/TLS with Let's Encrypt"
echo "  - Regular security updates: sudo apt update && sudo apt upgrade"
echo "  - Monitor logs for suspicious activity"
echo ""
log "📈 Performance optimization:"
echo "  - Monitor resource usage: docker stats"
echo "  - Adjust worker processes in supervisord.conf"
echo "  - Optimize nginx settings in nginx.conf"
echo "  - Use reverse proxy for load balancing"
