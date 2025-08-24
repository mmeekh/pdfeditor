# PDF Tools Frontend Build Script
# PowerShell script for building Tailwind CSS and managing dependencies

Write-Host "🚀 PDF Tools Frontend Build Script" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found. Please install npm first." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Build Tailwind CSS for production
Write-Host "🎨 Building Tailwind CSS..." -ForegroundColor Blue
npm run build:css:prod

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build Tailwind CSS" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build completed successfully!" -ForegroundColor Green
Write-Host "📁 Generated files:" -ForegroundColor Blue
Write-Host "   - static/css/tailwind.css" -ForegroundColor White
Write-Host "   - static/js/jszip.min.js" -ForegroundColor White
Write-Host "   - static/fontawesome/all.min.css" -ForegroundColor White
Write-Host "   - static/webfonts/*.woff2" -ForegroundColor White

Write-Host "🌐 You can now run the application with:" -ForegroundColor Yellow
Write-Host "   python -m uvicorn app.main:app --reload" -ForegroundColor White
