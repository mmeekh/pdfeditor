#!/bin/bash

# Production monitoring script for PDF Tools API

set -e

echo "📊 PDF Tools API - Production Monitoring"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "OK" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "WARNING" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    elif [ "$status" = "ERROR" ]; then
        echo -e "${RED}❌ $message${NC}"
    else
        echo -e "${BLUE}ℹ️  $message${NC}"
    fi
}

# Check if Docker is running
echo ""
echo "🐳 Docker Status:"
if docker info > /dev/null 2>&1; then
    print_status "OK" "Docker is running"
else
    print_status "ERROR" "Docker is not running"
    exit 1
fi

# Check container status
echo ""
echo "📦 Container Status:"
if command -v docker-compose &> /dev/null; then
    cd "$(dirname "$0")"
    if [ -f "docker-compose.yml" ]; then
        containers=$(docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}")
        if [ -n "$containers" ]; then
            echo "$containers"
        else
            print_status "WARNING" "No containers found"
        fi
    else
        print_status "ERROR" "docker-compose.yml not found"
    fi
else
    print_status "ERROR" "docker-compose not found"
fi

# Check application health
echo ""
echo "🏥 Application Health:"
if curl -f http://localhost/health > /dev/null 2>&1; then
    health_data=$(curl -s http://localhost/health)
    status=$(echo "$health_data" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    uptime=$(echo "$health_data" | grep -o '"uptime":[0-9.]*' | cut -d':' -f2)
    environment=$(echo "$health_data" | grep -o '"environment":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$status" = "healthy" ]; then
        print_status "OK" "Application is healthy"
        print_status "OK" "Environment: $environment"
        print_status "OK" "Uptime: $(printf "%.0f" "$uptime") seconds"
    else
        print_status "WARNING" "Application status: $status"
    fi
else
    print_status "ERROR" "Application health check failed"
fi

# Check system resources
echo ""
echo "💻 System Resources:"
if command -v free &> /dev/null; then
    memory=$(free -h | grep Mem | awk '{print $3 "/" $2}')
    print_status "OK" "Memory usage: $memory"
fi

if command -v df &> /dev/null; then
    disk=$(df -h / | tail -1 | awk '{print $5}')
    print_status "OK" "Disk usage: $disk"
fi

if command -v nproc &> /dev/null; then
    cpu_cores=$(nproc)
    print_status "OK" "CPU cores: $cpu_cores"
fi

# Check port availability
echo ""
echo "🔌 Port Status:"
if netstat -tlnp 2>/dev/null | grep -q ":80 "; then
    print_status "OK" "Port 80 (HTTP) is listening"
else
    print_status "ERROR" "Port 80 (HTTP) is not listening"
fi

if netstat -tlnp 2>/dev/null | grep -q ":2000 "; then
    print_status "OK" "Port 2000 (API) is listening"
else
    print_status "ERROR" "Port 2000 (API) is not listening"
fi

# Check recent logs
echo ""
echo "📝 Recent Logs (last 10 lines):"
if [ -f "logs/pdf-tools-api/error.log" ]; then
    echo "Error logs:"
    tail -10 logs/pdf-tools-api/error.log 2>/dev/null || echo "No error logs found"
else
    echo "No error log file found"
fi

# Check Docker logs
echo ""
echo "🐳 Recent Docker Logs:"
if command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then
    docker-compose logs --tail=5 2>/dev/null || echo "No Docker logs found"
fi

# Performance metrics
echo ""
echo "📈 Performance Metrics:"
if curl -f http://localhost/metrics > /dev/null 2>&1; then
    metrics=$(curl -s http://localhost/metrics)
    echo "$metrics" | grep -E "(memory|uptime|disk)" | head -5
else
    print_status "WARNING" "Metrics endpoint not accessible"
fi

# Network connectivity
echo ""
echo "🌐 Network Connectivity:"
if curl -f http://localhost > /dev/null 2>&1; then
    print_status "OK" "Local access: http://localhost"
    
    # Try to get public IP
    public_ip=$(curl -s ifconfig.me 2>/dev/null || echo "Unknown")
    if [ "$public_ip" != "Unknown" ]; then
        print_status "OK" "Public IP: $public_ip"
        print_status "OK" "Public access: http://$public_ip"
    else
        print_status "WARNING" "Could not determine public IP"
    fi
else
    print_status "ERROR" "Local access failed"
fi

echo ""
echo "🎯 Quick Actions:"
echo "  📊 View live logs: docker-compose logs -f"
echo "  🔄 Restart app: docker-compose restart"
echo "  🛑 Stop app: docker-compose down"
echo "  🚀 Start app: docker-compose up -d"
echo "  📋 Container status: docker-compose ps"
echo "  💾 System resources: docker stats"

echo ""
echo "📅 Last updated: $(date)"
echo "========================================"
