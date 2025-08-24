# PDF Tools - Professional PDF Processing API

Modern, hızlı ve güvenli PDF işleme araçları. PDF birleştirme, bölme, sıkıştırma, dönüştürme, OCR ve şifreleme işlemleri.

## 🚀 Özellikler

- **PDF İşlemleri**: Birleştir, böl, sıkıştır
- **Dönüştürme**: PDF ↔ Word, PDF ↔ Images, Images → PDF
- **OCR**: Türkçe ve İngilizce dil desteği
- **Güvenlik**: PDF şifreleme ve şifre çözme
- **Modern UI**: Tailwind CSS ile responsive tasarım
- **Local Resources**: CDN bağımlılığı yok, tamamen local

## 🛠️ Teknoloji Stack

- **Backend**: FastAPI (Python)
- **Frontend**: HTML + Tailwind CSS + JavaScript
- **PDF Processing**: PyPDF, pikepdf, pdf2image
- **Image Processing**: Pillow, img2pdf
- **Build Tools**: Node.js + Tailwind CSS

## 📋 Gereksinimler

### Sistem Gereksinimleri
- Python 3.8+
- Node.js 16+
- npm veya yarn
- Ghostscript (PDF sıkıştırma için)
- LibreOffice (DOCX dönüştürme için)
- Tesseract (OCR için)
- Poppler-utils (PDF işlemleri için)

### Python Dependencies
```bash
pip install -r requirements.txt
```

### Node.js Dependencies
```bash
npm install
```

## 🚀 Kurulum

### 1. Repository'yi klonlayın
```bash
git clone <repository-url>
cd pdfeditor
```

### 2. Python dependencies'leri kurun
```bash
pip install -r requirements.txt
```

### 3. Node.js dependencies'leri kurun ve build edin
```bash
npm install
npm run build:css:prod
```

### 4. Uygulamayı çalıştırın
```bash
python -m uvicorn app.main:app --reload
```

## 🔧 Build Script

PowerShell kullanarak otomatik build:
```powershell
.\build.ps1
```

## 📁 Proje Yapısı

```
pdfeditor/
├── app/
│   └── main.py              # FastAPI ana uygulama
├── static/
│   ├── css/
│   │   └── tailwind.css     # Local Tailwind CSS
│   ├── js/
│   │   └── jszip.min.js     # Local JSZip
│   ├── fontawesome/
│   │   └── all.min.css      # Local Font Awesome CSS
│   ├── webfonts/            # Font Awesome webfonts
│   └── icons/               # Favicon ve app icons
├── src/
│   └── input.css            # Tailwind CSS input
├── *.html                    # HTML sayfaları
├── package.json              # Node.js dependencies
├── tailwind.config.js        # Tailwind konfigürasyonu
├── postcss.config.js         # PostCSS konfigürasyonu
├── requirements.txt          # Python dependencies
└── build.ps1                 # PowerShell build script
```

## 🌐 API Endpoints

### PDF İşlemleri
- `POST /api/merge` - PDF birleştirme
- `POST /api/split` - PDF bölme
- `POST /api/compress` - PDF sıkıştırma
- `POST /api/compress-bulk` - Toplu PDF sıkıştırma

### Dönüştürme
- `POST /api/convert/auto` - Otomatik format dönüştürme
- `POST /api/convert/pdf-to-images` - PDF → Images
- `POST /api/convert/images-to-pdf` - Images → PDF
- `POST /api/convert/pdf-to-docx` - PDF → Word
- `POST /api/convert/docx-to-pdf` - Word → PDF

### OCR
- `POST /api/ocr` - Tek dosya OCR
- `POST /api/ocr-bulk` - Toplu OCR

### Güvenlik
- `POST /api/encrypt` - PDF şifreleme
- `POST /api/decrypt` - PDF şifre çözme
- `POST /api/decrypt-bulk` - Toplu şifre çözme

### Monitoring
- `GET /health` - Sağlık kontrolü
- `GET /metrics` - Metrikler
- `GET /health/ready` - Hazırlık kontrolü
- `GET /health/live` - Canlılık kontrolü

## 🔒 Güvenlik

- **CSP Policy**: Content Security Policy ile güvenlik
- **Rate Limiting**: API rate limiting
- **File Validation**: Dosya türü ve boyut kontrolü
- **Input Sanitization**: Güvenli input işleme

## 📱 Responsive Tasarım

- Mobile-first yaklaşım
- Tailwind CSS ile modern UI
- Dark/Light mode desteği
- Touch-friendly interface

## 🚀 Production Deployment

### Docker
```bash
docker-compose up -d
```

### Ubuntu Server
```bash
chmod +x deploy-ubuntu.sh
./deploy-ubuntu.sh
```

### Environment Variables
```bash
ENVIRONMENT=production
APP_MAX_UPLOAD_MB=50
APP_RATE_LIMIT_PER_MINUTE=60
APP_RATE_LIMIT_PER_HOUR=500
```

## 🧪 Test

### API Test
```bash
.\test-api.ps1
```

### Manual Test
1. Uygulamayı başlatın
2. Browser'da `http://localhost:8000` açın
3. PDF dosyası yükleyin ve işlemleri test edin

## 📊 Performance

- **File Size Limit**: 50MB (production)
- **Concurrent Processing**: 8 (production)
- **Timeout**: 900s (production)
- **Memory Optimization**: Large PDF handling

## 🔧 Troubleshooting

### Font Awesome Icons Görünmüyor
1. `static/webfonts/` klasörünü kontrol edin
2. CSS dosyasında font path'leri doğru mu?
3. Browser console'da hata var mı?

### Tailwind CSS Yüklenmiyor
1. `npm run build:css:prod` çalıştırın
2. `static/css/tailwind.css` dosyası var mı?
3. HTML'de local path kullanılıyor mu?

### JSZip Hata Veriyor
1. `static/js/jszip.min.js` dosyası var mı?
2. HTML'de local path kullanılıyor mu?
3. Browser console'da hata var mı?

## 📝 License

MIT License - Detaylar için LICENSE dosyasına bakın.

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📞 İletişim

- Website: [pdfislemleri.com](https://pdfislemleri.com)
- Email: info@pdfislemleri.com
- GitHub: [Repository Link]

## 🙏 Teşekkürler

- [Font Awesome](https://fontawesome.com/) - Icons
- [Tailwind CSS](https://tailwindcss.com/) - CSS Framework
- [FastAPI](https://fastapi.tiangolo.com/) - Web Framework
- [PyPDF](https://pypdf.readthedocs.io/) - PDF Processing
