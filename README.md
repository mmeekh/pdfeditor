# PDFislemleri.com

PDF işlemleri için FastAPI tabanlı API + statik web arayüzü. Amaç: hızlı, tek API üzerinden çoklu PDF aracı sunmak.

## Özellikler
- PDF birleştir / ayır / sıkıştır / döndür / filigran / şifrele / şifre kaldır
- Dönüştürme: PDF → Word/JPG/PPT/Excel/TXT, Word → PDF
- OCR (metin çıkarma)
- Rate limiting + health endpoint

## Mimari
- `app/`: FastAPI API
- `site/`: statik frontend (HTML/CSS/JS)
- `Caddyfile`: reverse proxy (opsiyonel)
- `docker-compose.yml`: API servis tanımı

## Kurulum (local)
```bash
cd app
pip install -r requirements.txt
python main.py
```
API: `http://localhost:8000` (health: `/health`)

## Docker (önerilen)
```bash
docker compose up -d --build
```

## Konfigürasyon (.env)
`.env` dosyası `app/` içinde okunur.
- `SECRET_KEY`
- `TEMP_DIR`
- `MAX_FILE_SIZE`
- `MAX_FILES`
- `ALLOW_ORIGINS`
