#!/bin/bash

# Production backup script for PDF Tools API

set -e

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="pdf-tools-api-backup-$DATE"
MAX_BACKUPS=10

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 PDF Tools API - Production Backup${NC}"
echo "=========================================="

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}📁 Creating backup: $BACKUP_NAME${NC}"

# Create temporary directory for backup
TEMP_BACKUP_DIR="/tmp/$BACKUP_NAME"
mkdir -p "$TEMP_BACKUP_DIR"

# Function to backup files
backup_files() {
    echo "📋 Backing up application files..."
    
    # Copy application files (excluding unnecessary files)
    rsync -av --exclude='__pycache__' \
              --exclude='*.pyc' \
              --exclude='.git' \
              --exclude='logs' \
              --exclude='backups' \
              --exclude='.env.production' \
              --exclude='*.log' \
              --exclude='node_modules' \
              --exclude='.pytest_cache' \
              --exclude='.coverage' \
              . "$TEMP_BACKUP_DIR/app/" 2>/dev/null || true
    
    echo "✅ Application files backed up"
}

# Function to backup logs
backup_logs() {
    echo "📝 Backing up logs..."
    
    if [ -d "logs" ]; then
        mkdir -p "$TEMP_BACKUP_DIR/logs"
        cp -r logs/* "$TEMP_BACKUP_DIR/logs/" 2>/dev/null || true
        echo "✅ Logs backed up"
    else
        echo "⚠️  No logs directory found"
    fi
}

# Function to backup Docker volumes
backup_docker_volumes() {
    echo "🐳 Backing up Docker volumes..."
    
    if command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then
        # Get volume names
        volumes=$(docker-compose config --volumes 2>/dev/null || echo "")
        
        if [ -n "$volumes" ]; then
            mkdir -p "$TEMP_BACKUP_DIR/docker-volumes"
            
            for volume in $volumes; do
                echo "  Backing up volume: $volume"
                docker run --rm \
                    -v "$volume:/data" \
                    -v "$TEMP_BACKUP_DIR/docker-volumes:/backup" \
                    alpine tar czf "/backup/$volume-backup.tar.gz" -C /data . 2>/dev/null || true
            done
            
            echo "✅ Docker volumes backed up"
        else
            echo "ℹ️  No Docker volumes found"
        fi
    else
        echo "ℹ️  Docker Compose not available"
    fi
}

# Function to backup environment configuration
backup_env_config() {
    echo "⚙️  Backing up environment configuration..."
    
    mkdir -p "$TEMP_BACKUP_DIR/config"
    
    # Copy configuration files
    if [ -f ".env.production" ]; then
        cp .env.production "$TEMP_BACKUP_DIR/config/" 2>/dev/null || true
        echo "✅ Environment configuration backed up"
    fi
    
    if [ -f "nginx.conf" ]; then
        cp nginx.conf "$TEMP_BACKUP_DIR/config/" 2>/dev/null || true
        echo "✅ Nginx configuration backed up"
    fi
    
    if [ -f "docker-compose.yml" ]; then
        cp docker-compose.yml "$TEMP_BACKUP_DIR/config/" 2>/dev/null || true
        echo "✅ Docker Compose configuration backed up"
    fi
}

# Function to backup system information
backup_system_info() {
    echo "💻 Backing up system information..."
    
    mkdir -p "$TEMP_BACKUP_DIR/system"
    
    # System information
    {
        echo "=== System Information ==="
        echo "Date: $(date)"
        echo "Hostname: $(hostname)"
        echo "OS: $(lsb_release -d 2>/dev/null | cut -f2 || echo 'Unknown')"
        echo "Kernel: $(uname -r)"
        echo "Architecture: $(uname -m)"
        echo ""
        echo "=== Docker Information ==="
        docker --version 2>/dev/null || echo "Docker not available"
        docker-compose --version 2>/dev/null || echo "Docker Compose not available"
        echo ""
        echo "=== Disk Usage ==="
        df -h 2>/dev/null || echo "Disk usage not available"
        echo ""
        echo "=== Memory Usage ==="
        free -h 2>/dev/null || echo "Memory usage not available"
    } > "$TEMP_BACKUP_DIR/system/system-info.txt"
    
    echo "✅ System information backed up"
}

# Function to create backup archive
create_backup_archive() {
    echo "📦 Creating backup archive..."
    
    cd /tmp
    tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" "$BACKUP_NAME"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backup archive created: $BACKUP_DIR/$BACKUP_NAME.tar.gz${NC}"
        
        # Get backup size
        BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_NAME.tar.gz" | cut -f1)
        echo "📏 Backup size: $BACKUP_SIZE"
    else
        echo -e "${YELLOW}⚠️  Failed to create backup archive${NC}"
        return 1
    fi
    
    # Clean up temporary directory
    rm -rf "$TEMP_BACKUP_DIR"
}

# Function to clean old backups
cleanup_old_backups() {
    echo "🧹 Cleaning up old backups..."
    
    # Count current backups
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.tar.gz 2>/dev/null | wc -l)
    
    if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
        echo "Found $BACKUP_COUNT backups, keeping only $MAX_BACKUPS"
        
        # Remove oldest backups
        ls -t "$BACKUP_DIR"/*.tar.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
        
        echo "✅ Old backups cleaned up"
    else
        echo "ℹ️  No cleanup needed ($BACKUP_COUNT backups)"
    fi
}

# Function to verify backup
verify_backup() {
    echo "🔍 Verifying backup..."
    
    BACKUP_FILE="$BACKUP_DIR/$BACKUP_NAME.tar.gz"
    
    if [ -f "$BACKUP_FILE" ]; then
        # Test archive integrity
        if tar -tzf "$BACKUP_FILE" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Backup verification successful${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  Backup verification failed${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  Backup file not found${NC}"
        return 1
    fi
}

# Main backup process
main() {
    echo "🚀 Starting backup process..."
    
    # Check if backup directory is writable
    if [ ! -w "$BACKUP_DIR" ]; then
        echo -e "${YELLOW}⚠️  Backup directory is not writable${NC}"
        exit 1
    fi
    
    # Perform backup operations
    backup_files
    backup_logs
    backup_docker_volumes
    backup_env_config
    backup_system_info
    
    # Create backup archive
    create_backup_archive
    
    # Verify backup
    if verify_backup; then
        # Clean up old backups
        cleanup_old_backups
        
        echo ""
        echo -e "${GREEN}🎉 Backup completed successfully!${NC}"
        echo "📁 Backup location: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
        echo "📏 Backup size: $BACKUP_SIZE"
        echo ""
        echo "📋 Available backups:"
        ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null | tail -5 || echo "No backups found"
    else
        echo -e "${YELLOW}⚠️  Backup verification failed${NC}"
        exit 1
    fi
}

# Run backup
main

echo ""
echo "📅 Backup completed at: $(date)"
echo "=========================================="
