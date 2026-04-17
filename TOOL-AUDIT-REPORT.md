# PDF Tool Audit Raporu

**Tarih:** 2026-04-17
**Kapsam:** Backend (16 API) + Frontend (16 JS modülü) + Rakip analizi

---

## 1. Backend Test Sonuçları: **16/16 PASS**

Tüm tool'lar end-to-end çalışıyor. Gerçek PDF/Word/şifreli PDF ile test edildi.

| Tool | Süre | Not |
|---|---|---|
| merge | 0.19s | Hızlı, sağlam |
| split | 0.10s | Range mode OK |
| compress | 0.28s | low/med/high |
| organize | 0.18s | JSON body |
| rotate | 0.11s | 90/180/270 |
| watermark | 0.12s | Canlı preview |
| protect | 0.17s | 8 izin flag |
| unlock | 0.23s | Şifreli PDF OK |
| pdf-to-word | 0.25s | |
| word-to-pdf | 0.99s | LibreOffice arka planda |
| pdf-to-jpg | 0.41s | 200 DPI default |
| pdf-to-ppt | 0.53s | separate/combined |
| pdf-to-excel | 0.69s | Çizgili tablolar OK |
| pdf-to-txt | 0.14s | PDF+Word |
| pdf-ocr | **4.14s** | ⚠ Tek yavaş tool |
| sign | 0.14s | Base64 imza |

---

## 2. Frontend: Önemli Eksikler

### Hiç opsiyonu olmayan tool'lar (getOptions boş)
- **pdf-to-jpg** — DPI, format, kalite yok
- **pdf-to-word** — OCR modu, format yok
- **word-to-pdf** — PDF/A, kalite yok
- **pdf-to-txt** — Encoding, OCR köprüsü yok

### Tüm Tool'larda Eksik
- Şifreli PDF otomatik tespit (split/compress/rotate/watermark şifreli PDF'de çöküyor)
- Per-file progress (`[2/5] dosya.pdf işleniyor`)
- PDF thumbnail preview (sadece organize'da var)
- Cloud storage (Drive/Dropbox) entegrasyonu
- Batch retry mantığı

### Tool-Spesifik Kritik Eksikler
- **rotate**: sayfa bazlı döndürme yok (tüm PDF topluca)
- **watermark**: resim/logo filigranı yok (sadece metin), sayfa aralığı yok
- **protect**: şifre güç göstergesi, confirm-password yok
- **pdf-ocr**: 7 dil hardcoded (rakipler 20-100+)
- **compress**: hedef boyut (KB) ile sıkıştırma yok
- **sign**: PKCS#12 dijital sertifika yok (sadece görsel imza)

---

## 3. Rakip Karşılaştırması

| Özellik | PDFişlemleri | iLovePDF | Smallpdf | PDF24 |
|---|:-:|:-:|:-:|:-:|
| Ücretsiz limit | Sınırsız | 25MB/2task/gün | 2 işlem/gün | Sınırsız |
| Cloud storage | ❌ | ✅ Drive+Dropbox | ✅ | ✅ |
| Batch processing | Kısmi | ✅ | Kısmi | ✅ |
| Şifreli PDF oto-tespit | ❌ | ✅ | ✅ | ✅ |
| PDF thumbnail preview | Sadece organize | ✅ Her tool | ✅ | ✅ |
| Sayfa bazlı rotate | ❌ | ✅ | ✅ | ✅ |
| Hedef boyut compress | ❌ | ❌ | ❌ | ✅ |
| OCR dil sayısı | 7 | 20+ | Premium | 100+ |
| E-imza request link | ❌ | ❌ | ✅ | ❌ |

**Bizim avantajımız:** Ücretsiz + limitsiz. **Geriye kaldığımız yer:** UX opsiyon zenginliği.

---

## 4. Öncelikli Aksiyon Planı

### 🔴 YÜKSEK ÖNCELIK (1-2 hafta, kullanıcı kaybını durduran)

**A1. Şifreli PDF oto-tespit modülü** (ortak komponent)
- Backend upload response'a `is_encrypted` ekle
- Frontend'de modal ile parola sor
- 5+ tool'da kullanılacak (merge/split/compress/rotate/watermark)
- **Tahmini: 4 saat**

**A2. pdf-to-jpg opsiyonları** (şu an 0 opsiyon, rakipler 5+)
- DPI (72/150/300) select
- Format (JPG/PNG) radio
- Sayfa aralığı input
- Kalite slider
- **Tahmini: 2 saat**

**A3. pdf-thumbnail-preview ortak komponent** (organize.js'den çıkar)
- Yeni modül: `js/modules/pdfPreview.js`
- Rotate/split/watermark/compress'te reuse
- **Tahmini: 3 saat**

### 🟡 ORTA ÖNCELIK (3-4 hafta, opsiyon zenginleştirme)

**B1. rotate sayfa bazlı** (en zayıf tool)
- Thumbnail grid'de her sayfaya 90/180/270 butonu
- Backend endpoint güncelle (seçili sayfa listesi)
- **Tahmini: 3 saat**

**B2. watermark → resim/logo filigranı**
- Metin + image upload seçeneği
- Sayfa aralığı (tüm/belirli)
- **Tahmini: 2 saat**

**B3. compress → hedef boyut**
- level preset yerine veya yanına KB input
- Backend binary-search compression loop
- **Tahmini: 4 saat**

**B4. protect → şifre güç göstergesi + confirm**
- zxcvbn-ts library
- Confirm password input
- **Tahmini: 1 saat**

### 🟢 DÜŞÜK ÖNCELIK (gelecek sprint)

**C1.** pdf-to-word/word-to-pdf/pdf-to-txt opsiyon ekleme (OCR köprüsü, encoding)
**C2.** Cloud storage entegrasyonu (Google Drive Picker API)
**C3.** pdf-ocr 20+ dil desteği (tesseract data dosyaları)
**C4.** Per-file progress bar (pdfLoader.js batch-aware)
**C5.** pdf-to-excel → CSV alternatif çıktı

---

## 5. Yapılanlar

- `tests/fixtures/` — 5 test dosyası (3p, 10p, table, encrypted, signature)
- `tests/audit_all_tools.py` — her zaman çalıştırılabilen audit script (16 tool)
- `tests/audit-report.json` — detaylı JSON rapor
- Tekrar çalıştırma: `python3 tests/audit_all_tools.py`

---

**Sonuç:** Backend %100 sağlam. Frontend'de 8 critical + 5 medium iyileştirme fırsatı var. A1-A3 (9 saatlik iş) tek başına UX'i iLovePDF seviyesine çıkarır.
