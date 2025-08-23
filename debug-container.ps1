# PDF Tools API Container Debug Script
# PowerShell script for Windows

Write-Host "=== PDF Tools API Container Debug ===" -ForegroundColor Green

# Check if container is running
$containerName = "pdfeditor-pdf-tools-api-1"
$container = docker ps --filter "name=$containerName" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

if (-not $container -or $container -eq "") {
    Write-Host "Container $containerName is not running!" -ForegroundColor Red
    Write-Host "Starting container first..." -ForegroundColor Yellow
    docker-compose up -d
    Start-Sleep -Seconds 10
}

# Show container status
Write-Host "Container status:" -ForegroundColor Yellow
docker-compose ps

# Show recent logs
Write-Host "Recent logs:" -ForegroundColor Yellow
docker-compose logs --tail=50

# Interactive shell for debugging
Write-Host "`nStarting interactive shell in container..." -ForegroundColor Yellow
Write-Host "You can test the app manually:" -ForegroundColor Cyan
Write-Host "  cd /app" -ForegroundColor White
Write-Host "  python -c 'from app.main import app; print(\"App import successful\")'" -ForegroundColor White
Write-Host "  /usr/local/bin/gunicorn app.main:app --chdir /app --bind 0.0.0.0:2000 --workers 1 --worker-class uvicorn.workers.UvicornWorker --timeout 120 --log-level debug" -ForegroundColor White
Write-Host "`nPress Enter to continue..." -ForegroundColor Yellow
Read-Host

docker exec -it $containerName bash
