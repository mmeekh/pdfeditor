# PDF Tools API Test Script
# PowerShell script for testing API endpoints

Write-Host "=== PDF Tools API Test ===" -ForegroundColor Green

# Wait for service to be ready
Write-Host "Waiting for service to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Test health endpoint
Write-Host "Testing health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost/health" -Method GET -TimeoutSec 10
    Write-Host "Health check: SUCCESS" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Cyan
} catch {
    Write-Host "Health check: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test root endpoint
Write-Host "`nTesting root endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost/" -Method GET -TimeoutSec 10
    Write-Host "Root endpoint: SUCCESS (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "Root endpoint: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test static files
Write-Host "`nTesting static files..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost/static/pdfandoc.png" -Method GET -TimeoutSec 10
    Write-Host "Static file: SUCCESS (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "Static file: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest completed!" -ForegroundColor Green
