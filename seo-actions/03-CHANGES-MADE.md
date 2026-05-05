# Yapılan Değişiklikler — Özet

## 1. Author Bio Block (34 blog yazısı)
**Dosya:** `scripts/add_author_bio.py` (yeni)
**Etki:** Tüm blog yazılarında `</article>` öncesi görünür yazar kutusu:
- Avatar (EK monogram)
- "Emin Kılıç" + "PDFişlemleri.com Kurucusu" rozeti
- 3 cümle bio (FastAPI/Tesseract teknik özgeçmiş, 5070 sayılı kanun ve KVKK uzmanlığı)
- LinkedIn + Hakkımızda + İletişim linkleri
**Idempotent:** marker (`author-bio-block`) ile tekrar çalıştırılabilir.

## 2. Türkiye-Özel İçerik — 3 İnce Blog Yazısı Genişletildi

### `/blog/pdf-birlestirme.html`
Eklendi (~750 kelime): "Türkiye'de PDF Birleştirme: UYAP, e-Dava ve Resmi Belge Senaryoları"
- UYAP dosya paketi hazırlama (30 MB sınırı, bates numaralandırma)
- e-Arşiv fatura toplu birleştirme (GİB)
- Tapu + kadastro birleştirme (WebTapu)
- KEP gönderim 5-10 MB sınırı
- Üniversite başvurusu (transkript + diploma)

### `/blog/pdf-imzalama.html`
Eklendi (~850 kelime): "Türkiye'de E-İmza ve PDF: 5070 Sayılı Kanun ve Yasal Geçerlilik"
- Hangi belgede hangi imza türü (4 kategori)
- BTK onaylı sağlayıcılar 2026 (Kamu SM, E-Güven, E-Tugra, Türktrust, ESHS)
- KVKK uyumlu PDF imzalama
- Tapu/MERSİS/e-Devlet belgelerinde e-imza
- İmza doğrulama (zaman damgası, sertifika geçerliliği)

### `/blog/pdf-sikistirma.html`
Eklendi (~700 kelime): "Türkiye'de PDF Sıkıştırma: KEP, GİB ve E-Beyanname Senaryoları"
- KEP boyut limiti (5-10 MB)
- e-Beyanname GİB 5 MB sınırı
- Vergi levhası ve mali müşavir belgeleri
- Banka portalı yüklemeleri (2-5 MB)
- UYAP 30 MB tek belge limiti
- Ehliyet/kimlik fotokopisi gönderimi

## 3. 3 Tool Sayfasına TR Use-Case Bölümü

### `/pdf-birlestir.html`
6 kart eklendi (UYAP, e-Arşiv, Tapu+Kadastro, KEP, Üniversite, EKAP/İhale)
İlgili blog yazılarına internal link.

### `/pdf-sikistir.html`
6 kart eklendi (KEP, e-Beyanname, UYAP, Banka portalları, Ehliyet/Kimlik, SMMM)

### `/pdf-imzala.html`
4 kategori kartı + KVKK kutusu:
- Görüntü İmza Yeterli (yeşil)
- Nitelikli E-İmza Önerilen (mavi)
- Nitelikli E-İmza Zorunlu (sarı — e-Beyanname, MERSİS, KEP, e-Defter, ihale)
- E-İmza Geçersiz (kırmızı — tapu devri, evlilik, vasiyet)

## 4. Deliverable Dosyaları

`seo-actions/` dizini oluşturuldu:
- `01-USER-ACTION-PLAN.md` — senin yapacakların: build, GSC, GBP, dizin submit, outreach şablonları, Eksisozluk/Reddit taktikleri
- `02-CONTENT-CALENDAR.md` — 28 yazı 6 aylık içerik takvimi, öncelik sıralı
- `03-CHANGES-MADE.md` — bu dosya

## Toplam Etki Tahmini

**Eklenen kelime:** ~7.000+ Türkiye-spesifik benzersiz içerik
**Etkilenen sayfa:** 34 blog + 3 tool = 37 sayfa
**Yeni internal link:** ~50+
**E-E-A-T sinyali:** 34 görünür yazar bylinе (öncesi 0)
**Türkiye-özgü keyword angle:** UYAP, KEP, GİB, MERSİS, BTK, 5070 SK, KVKK 5. madde, WebTapu, e-Arşiv, e-Beyanname, e-Defter — yabancı rakipler yok

## Kontrol Listesi (Build öncesi)

```bash
cd /root/projects/pdfislemleri.com

# 1. Değişikliklere göz at
git diff --stat

# 2. Build
python build.py

# 3. Tek sayfa görsel check (yerel)
python -m http.server 8000 --directory site
# tarayıcıda: http://localhost:8000/blog/pdf-birlestirme

# 4. Schema validation
# https://validator.schema.org/ adresine /blog/pdf-imzalama URL'ini gir

# 5. Commit
git add -A
git commit -m "seo: TR-specific content (UYAP/KEP/GİB/5070/KVKK) + author bios"
```
