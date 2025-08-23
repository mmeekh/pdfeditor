#!/bin/bash

# Ubuntu Production Monitoring Script for PDF Tools API
# This script provides comprehensive monitoring and health checks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
HEALTH_CHECK_URL="http://localhost/health"
METRICS_URL="http://localhost/metrics"
LOG_DIR="./logs"
BACKUP_DIR="./backups"
MAX_LOG_SIZE_MB=100
MAX_BACKUP_AGE_DAYS=7

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

success() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}"
}

# Check if script is run with arguments
case "${1:-}" in
    "health")
        check_health
        ;;
    "metrics")
        show_metrics
        ;;
    "logs")
        show_logs
        ;;
    "system")
        show_system_info
        ;;
    "docker")
        show_docker_status
        ;;
    "cleanup")
        cleanup_old_files
        ;;
    "full")
        full_monitoring
        ;;
    *)
        show_help
        ;;
esac

# Health check function
check_health() {
    log "🏥 Performing health check..."
    
    if command -v curl &> /dev/null; then
        if curl -f -s "$HEALTH_CHECK_URL" > /dev/null; then
            success "Application is healthy"
            
            # Get detailed health info
            HEALTH_INFO=$(curl -s "$HEALTH_CHECK_URL")
            echo "$HEALTH_INFO" | jq '.' 2>/dev/null || echo "$HEALTH_INFO"
        else
            error "Application health check failed"
            return 1
        fi
    else
        warn "curl not available, skipping health check"
    fi
}

# Show metrics function
show_metrics() {
    log "📊 Fetching application metrics..."
    
    if command -v curl &> /dev/null; then
        if curl -f -s "$METRICS_URL" > /dev/null; then
            success "Metrics endpoint is accessible"
            
            # Get metrics
            METRICS=$(curl -s "$METRICS_URL")
            echo "$METRICS" | jq '.' 2>/dev/null || echo "$METRICS"
        else
            error "Metrics endpoint is not accessible"
            return 1
        fi
    else
        warn "curl not available, skipping metrics check"
    fi
}

# Show logs function
show_logs() {
    log "📝 Showing recent logs..."
    
    if [ -d "$LOG_DIR" ]; then
        echo "📁 Log directory: $LOG_DIR"
        ls -la "$LOG_DIR"
        
        echo ""
        echo "📋 Recent application logs:"
        if [ -f "$LOG_DIR/pdf-tools-api.log" ]; then
            tail -20 "$LOG_DIR/pdf-tools-api.log"
        fi
        
        echo ""
        echo "🌐 Recent nginx logs:"
        if [ -f "$LOG_DIR/nginx.log" ]; then
            tail -20 "$LOG_DIR/nginx.log"
        fi
    else
        warn "Log directory not found: $LOG_DIR"
    fi
    
    echo ""
    echo "🐳 Recent Docker logs:"
    docker-compose logs --tail=20 2>/dev/null || warn "Docker Compose not available"
}

# Show system information function
show_system_info() {
    log "💻 System Information:"
    
    echo "🖥️  OS Information:"
    echo "  Distribution: $(lsb_release -d | cut -f2)"
    echo "  Version: $(lsb_release -rs)"
    echo "  Codename: $(lsb_release -cs)"
    echo "  Kernel: $(uname -r)"
    echo "  Architecture: $(uname -m)"
    
    echo ""
    echo "🔧 Hardware Information:"
    echo "  CPU: $(nproc) cores"
    echo "  CPU Model: $(grep 'model name' /proc/cpuinfo | head -1 | cut -d: -f2 | xargs)"
    
    echo ""
    echo "💾 Memory Information:"
    free -h
    
    echo ""
    echo "💿 Disk Information:"
    df -h /
    
    echo ""
    echo "🌐 Network Information:"
    echo "  Public IP: $(curl -s ifconfig.me 2>/dev/null || echo "Unknown")"
    echo "  Local IP: $(hostname -I | awk '{print $1}')"
    
    echo ""
    echo "📊 Load Average:"
    uptime
}

# Show Docker status function
show_docker_status() {
    log "🐳 Docker Status:"
    
    if command -v docker &> /dev/null; then
        echo "🐋 Docker Version:"
        docker --version
        
        echo ""
        echo "🔧 Docker Info:"
        docker info --format 'table {{.ServerVersion}}\t{{.OperatingSystem}}\t{{.KernelVersion}}' 2>/dev/null || echo "Docker not running"
        
        echo ""
        echo "📦 Running Containers:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Size}}"
        
        echo ""
        echo "💾 Docker System Usage:"
        docker system df
        
        echo ""
        echo "📊 Container Resource Usage:"
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
    else
        error "Docker is not installed"
    fi
}

# Cleanup old files function
cleanup_old_files() {
    log "🧹 Cleaning up old files..."
    
    # Clean up old logs
    if [ -d "$LOG_DIR" ]; then
        find "$LOG_DIR" -name "*.log" -size +${MAX_LOG_SIZE_MB}M -exec truncate -s ${MAX_LOG_SIZE_MB}M {} \;
        success "Truncated large log files"
    fi
    
    # Clean up old backups
    if [ -d "$BACKUP_DIR" ]; then
        find "$BACKUP_DIR" -type f -mtime +$MAX_BACKUP_AGE_DAYS -delete
        success "Removed backups older than $MAX_BACKUP_AGE_DAYS days"
    fi
    
    # Clean up Docker
    if command -v docker &> /dev/null; then
        docker system prune -f
        success "Cleaned up Docker system"
    fi
}

# Full monitoring function
full_monitoring() {
    log "🔍 Starting full monitoring..."
    
    echo "=========================================="
    echo "           FULL MONITORING REPORT"
    echo "=========================================="
    echo ""
    
    show_system_info
    echo ""
    echo "=========================================="
    echo ""
    
    show_docker_status
    echo ""
    echo "=========================================="
    echo ""
    
    check_health
    echo ""
    echo "=========================================="
    echo ""
    
    show_metrics
    echo ""
    echo "=========================================="
    echo ""
    
    show_logs
    echo ""
    echo "=========================================="
    echo ""
    
    cleanup_old_files
    echo ""
    echo "=========================================="
    
    success "Full monitoring completed"
}

# Show help function
show_help() {
    echo "🐳 PDF Tools API - Ubuntu Monitoring Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  health     - Check application health"
    echo "  metrics    - Show application metrics"
    echo "  logs       - Show recent logs"
    echo "  system     - Show system information"
    echo "  docker     - Show Docker status"
    echo "  cleanup    - Clean up old files"
    echo "  full       - Run full monitoring (default)"
    echo "  help       - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 health          # Check health only"
    echo "  $0 metrics         # Show metrics only"
    echo "  $0 full            # Run full monitoring"
    echo "  $0                 # Run full monitoring (default)"
    echo ""
    echo "Monitoring includes:"
    echo "  ✅ System health and resources"
    echo "  🐳 Docker container status"
    echo "  🏥 Application health checks"
    echo "  📊 Performance metrics"
    echo "  📝 Log analysis"
    echo "  🧹 Automatic cleanup"
    echo ""
    
    # Run full monitoring by default
    full_monitoring
}

# Main execution
if [ $# -eq 0 ]; then
    full_monitoring
fi
