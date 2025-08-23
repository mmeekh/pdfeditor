# PDF Tools API Docker Build and Run Script
# PowerShell script for Windows

Write-Host "=== PDF Tools API Docker Build and Run ===" -ForegroundColor Green

# Stop and remove existing containers
Write-Host "Stopping existing containers..." -ForegroundColor Yellow
docker-compose down -v

# Clean build
Write-Host "Building Docker image..." -ForegroundColor Yellow
docker-compose build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Start the service
Write-Host "Starting service..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "Service start failed!" -ForegroundColor Red
    exit 1
}

# Wait a moment for startup
Write-Host "Waiting for service to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check status
Write-Host "Checking service status..." -ForegroundColor Yellow
docker-compose ps

# Show logs
Write-Host "Showing logs (Ctrl+C to stop):" -ForegroundColor Yellow
docker-compose logs -f
