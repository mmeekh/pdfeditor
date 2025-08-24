# PDF İşlemleri SSL Sertifikası Kurulum Script'i (Windows)
# Bu script Windows sunucuda Let's Encrypt SSL sertifikası kurar

param(
    [string]$Domain = "pdfislemleri.com",
    [string]$Email = "info@pdfislemleri.com"
)

Write-Host "🔒 PDF İşlemleri SSL Sertifikası Kurulum Script'i (Windows)" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green

# Admin yetkisi kontrolü
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Administrator)) {
    Write-Host "❌ Bu script Administrator yetkisi gerektirir!" -ForegroundColor Red
    Write-Host "PowerShell'i 'Run as Administrator' olarak çalıştırın." -ForegroundColor Yellow
    exit 1
}

# Chocolatey kurulumu
function Install-Chocolatey {
    Write-Host "🍫 Chocolatey kurulumu kontrol ediliyor..." -ForegroundColor Blue
    
    if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
        Write-Host "Chocolatey kuruluyor..." -ForegroundColor Yellow
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        
        # PATH'i güncelle
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } else {
        Write-Host "✅ Chocolatey mevcut" -ForegroundColor Green
    }
}

# Win-Acme kurulumu
function Install-WinAcme {
    Write-Host "🔐 Win-Acme kurulumu kontrol ediliyor..." -ForegroundColor Blue
    
    if (-not (Get-Command wacs -ErrorAction SilentlyContinue)) {
        Write-Host "Win-Acme kuruluyor..." -ForegroundColor Yellow
        choco install win-acme -y
        
        # PATH'i güncelle
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } else {
        Write-Host "✅ Win-Acme mevcut" -ForegroundColor Green
    }
}

# IIS kurulumu
function Install-IIS {
    Write-Host "🌐 IIS kurulumu kontrol ediliyor..." -ForegroundColor Blue
    
    $iisFeature = Get-WindowsFeature -Name "Web-Server"
    if (-not $iisFeature.Installed) {
        Write-Host "IIS kuruluyor..." -ForegroundColor Yellow
        Install-WindowsFeature -Name "Web-Server" -IncludeManagementTools
    } else {
        Write-Host "✅ IIS mevcut" -ForegroundColor Green
    }
    
    # URL Rewrite Module kurulumu
    if (-not (Test-Path "C:\Program Files\IIS\UrlRewrite\rewrite.dll")) {
        Write-Host "URL Rewrite Module kuruluyor..." -ForegroundColor Yellow
        choco install urlrewrite -y
    }
}

# SSL sertifikası al
function Get-SSLCertificate {
    Write-Host "🔐 Let's Encrypt SSL sertifikası alınıyor..." -ForegroundColor Blue
    
    # Win-Acme ile sertifika al
    $wacsArgs = @(
        "--target", "iis",
        "--siteid", "1",
        "--installation", "iis",
        "--accepttos",
        "--emailaddress", $Email,
        "--hostname", $Domain,
        "--hostname", "www.$Domain"
    )
    
    try {
        & wacs @wacsArgs
        Write-Host "✅ SSL sertifikası başarıyla alındı!" -ForegroundColor Green
    } catch {
        Write-Host "❌ SSL sertifikası alınamadı: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# IIS konfigürasyonu
function Setup-IIS {
    Write-Host "⚙️ IIS konfigürasyonu yapılıyor..." -ForegroundColor Blue
    
    # Web.config oluştur
    $webConfig = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="HTTP to HTTPS" stopProcessing="true">
                    <match url="(.*)" />
                    <conditions>
                        <add input="{HTTPS}" pattern="^OFF$" />
                    </conditions>
                    <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
                </rule>
            </rules>
        </rewrite>
        
        <httpProtocol>
            <customHeaders>
                <add name="Strict-Transport-Security" value="max-age=31536000; includeSubDomains" />
                <add name="X-Frame-Options" value="DENY" />
                <add name="X-Content-Type-Options" value="nosniff" />
                <add name="X-XSS-Protection" value="1; mode=block" />
                <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
                <add name="Content-Security-Policy" value="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';" />
            </customHeaders>
        </httpProtocol>
        
        <staticContent>
            <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
            <mimeMap fileExtension=".woff" mimeType="font/woff" />
            <mimeMap fileExtension=".ttf" mimeType="font/ttf" />
        </staticContent>
        
        <httpCompression>
            <dynamicTypes>
                <add mimeType="text/*" enabled="true" />
                <add mimeType="application/javascript" enabled="true" />
                <add mimeType="application/json" enabled="true" />
                <add mimeType="application/xml" enabled="true" />
            </dynamicTypes>
        </httpCompression>
    </system.webServer>
</configuration>
"@
    
    # Web.config'i kaydet
    $webConfigPath = "C:\inetpub\wwwroot\web.config"
    $webConfig | Out-File -FilePath $webConfigPath -Encoding UTF8
    
    Write-Host "✅ IIS konfigürasyonu tamamlandı" -ForegroundColor Green
}

# Firewall ayarları
function Setup-Firewall {
    Write-Host "🔥 Firewall ayarları yapılıyor..." -ForegroundColor Blue
    
    # HTTP (80) port
    New-NetFirewallRule -DisplayName "HTTP (80)" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -Profile Any
    
    # HTTPS (443) port
    New-NetFirewallRule -DisplayName "HTTPS (443)" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow -Profile Any
    
    Write-Host "✅ Firewall ayarları tamamlandı" -ForegroundColor Green
}

# SSL test
function Test-SSL {
    Write-Host "🧪 SSL sertifikası test ediliyor..." -ForegroundColor Blue
    
    try {
        $request = [System.Net.WebRequest]::Create("https://$Domain")
        $request.Timeout = 10000
        $response = $request.GetResponse()
        
        Write-Host "✅ HTTPS bağlantısı başarılı!" -ForegroundColor Green
        Write-Host "📋 Response Status: $($response.StatusCode)" -ForegroundColor White
        
        $response.Close()
    } catch {
        Write-Host "❌ HTTPS bağlantısı başarısız: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # SSL Labs test
    Write-Host "🌐 SSL Labs test için: https://www.ssllabs.com/ssltest/analyze.html?d=$Domain" -ForegroundColor Yellow
    
    # Browser test
    Write-Host "🔍 Browser'da test edin: https://$Domain" -ForegroundColor Yellow
}

# Ana fonksiyon
function Main {
    Write-Host "🚀 SSL kurulumu başlatılıyor..." -ForegroundColor Green
    Write-Host "Domain: $Domain" -ForegroundColor Cyan
    Write-Host "Email: $Email" -ForegroundColor Cyan
    
    # Gerekli paketleri kur
    Install-Chocolatey
    Install-WinAcme
    Install-IIS
    
    # IIS konfigürasyonu
    Setup-IIS
    
    # SSL sertifikası al
    Get-SSLCertificate
    
    # Firewall ayarları
    Setup-Firewall
    
    # Test
    Test-SSL
    
    Write-Host "🎉 SSL kurulumu tamamlandı!" -ForegroundColor Green
    Write-Host "📝 Sonraki adımlar:" -ForegroundColor Yellow
    Write-Host "   1. DNS A record'u sunucu IP'sine güncelleyin" -ForegroundColor White
    Write-Host "   2. https://$Domain adresini test edin" -ForegroundColor White
    Write-Host "   3. SSL Labs test sonuçlarını kontrol edin" -ForegroundColor White
}

# Script çalıştır
Main
