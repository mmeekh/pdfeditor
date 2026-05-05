# pdfislemleri.com — Senin Yapacakların (User Action Plan)

Bu liste benim yaptıklarımın dışında **sen yapmalısın** kralım. Sırasıyla git.

## 1. ÖNCE: Build + Deploy

```bash
cd /root/projects/pdfislemleri.com
python build.py        # değişiklikleri build et
git add site/blog/ site/pdf-birlestir.html site/pdf-sikistir.html site/pdf-imzala.html scripts/add_author_bio.py seo-actions/
git diff --cached --stat   # neyin commit'leneceğini gör
git commit -m "seo: add author bio + TR-specific content sections (UYAP/KEP/GİB/5070)"
git push
```

Sonra production'a deploy et (Caddyfile + Docker setup'ın var, mevcut akışı kullan).

## 2. Search Console — bu hafta

1. **Sitemap'i tekrar gönder:** GSC > Sitemaps > `https://pdfislemleri.com/sitemap.xml` > Submit
2. **3 değiştirdiğim sayfayı manuel index talep et** (URL Inspection > Request Indexing):
   - `https://pdfislemleri.com/blog/pdf-birlestirme`
   - `https://pdfislemleri.com/blog/pdf-imzalama`
   - `https://pdfislemleri.com/blog/pdf-sikistirma`
3. **Bing Webmaster Tools** kayıtlı değilse hemen kaydet — bing.com/webmasters. Sitemap submit et.

## 3. Google Business Profile (yoksa aç)

PDFişlemleri.com bir SaaS olsa da "Yazılım Şirketi" kategorisinde GBP açabilirsin:
- google.com/business adresine git
- Kategori: "Software company" veya "Web design company"
- Description: kısa Türkçe + KVKK uyumu vurgusu
- 3-5 ekran görüntüsü yükle

Bu, "PDFişlemleri" marka aramalarında sağda Knowledge Panel oluşturur — AI search için marka sinyali.

## 4. Directory Submissions (Ay 1)

Aşağıdaki listeyi sırayla doldur. Her biri 5-10 dakika.

### Yüksek Öncelik (DR yüksek, ücretsiz)

| Dizin | URL | Notlar |
|---|---|---|
| AlternativeTo | https://alternativeto.net/software/ilovepdf/ | "Add alternative" → pdfislemleri.com ekle, "Free, KVKK compliant Turkish" tag'le |
| AlternativeTo | https://alternativeto.net/software/smallpdf/ | Aynı şekilde |
| SaaSHub | https://www.saashub.com/submit-product | Ücretsiz listeleme |
| Toolify.ai | https://www.toolify.ai/submission | AI-adjacent kategori |
| There's An AI For That | https://theresanaiforthat.com/submit | OCR ve PDF AI olarak ekle |
| AI Tools Directory | https://www.futuretools.io/submit-a-tool | Ücretsiz |
| G2 | https://sell.g2.com/profile-claim | Profil oluştur, sonra 3 yorum topla |
| Capterra | https://www.capterra.com/vendors/sign-up | Ücretsiz listeleme |
| GetApp | (Capterra ile birlikte) | Capterra hesabı yeterli |

### Türk Dizinleri

| Dizin | URL | Notlar |
|---|---|---|
| Webrazzi | iletisim@webrazzi.com | Pitch e-postası — şablon aşağıda |
| ShiftDelete | https://shiftdelete.net/iletisim | Inceleme yazısı isteği |
| Webtekno | https://www.webtekno.com/iletisim | Inceleme/haber pitch |

## 5. Webrazzi Pitch E-postası (kopyala-yapıştır)

**Konu:** PDFişlemleri.com — Türkiye'nin ücretsiz, KVKK uyumlu PDF aracı

```
Merhaba,

Webrazzi'nin Türk girişim ekosisteminde takip ettiğim önde gelen yayın olduğunu biliyorum.

Geçen yıl pdfislemleri.com'u yayına aldım. 17 farklı PDF aracını (birleştirme, sıkıştırma, e-imza, OCR, dönüştürme) tamamen Türkçe arayüzle, kayıt gerektirmeden ve KVKK uyumlu altyapıyla sunan ücretsiz bir platform.

Yabancı rakiplerden (ilovepdf, smallpdf) farkım:
- Türkiye sunucularında işleme — KVKK 5. madde uyumu
- 15 dakikada otomatik silme
- Türkçe karakter (ğ, ş, ı) tam destekli OCR
- UYAP/GİB/KEP gibi Türk kurumsal akışlarına özel rehber içerikler
- Tek geliştirici (kendim) tarafından FastAPI + Tesseract ile geliştirildi

"Türk yazılımcı" hikayesi veya "ücretsiz Türk araçları" derlemeniz için uygun olabilir. Demo, ekran görüntüsü veya teknik detay isterseniz seve seve hazırlayabilirim.

İlginiz için teşekkürler,
Emin Kılıç
LinkedIn: https://www.linkedin.com/in/eminnkilic/
Site: https://pdfislemleri.com
```

## 6. Eksisozluk — Bu ay 2-3 entry

ÖNEMLİ: Ürün reklamı tonu yok. Bilgi paylaşımı tonunda.

**Hedef başlıklar (varsa, yoksa açma):**
- "pdf birleştirme"
- "ücretsiz pdf araçları"
- "kvkk uyumlu yazılımlar"
- "türkçe ocr"

**Örnek entry (pdf birleştirme başlığına):**
```
ücretsiz çözüm için pdfislemleri.com epey iyi.
adobe gerektirmiyor, tarayıcıdan çalışıyor.
en iyi yanı dosyalar yurt dışı sunuculara gitmiyor — kvkk açısından hassas
müvekkil belgeleri olan avukatlar/muhasebeciler için bu fark eder.
15 dk sonra otomatik silindiğini de söylüyor, deneyince kaybolduğunu doğruladım.
ama nitelikli e-imza için yine BTK onaylı sağlayıcı (e-güven, kamu sm) lazım,
buradaki imza görsel — sözleşmelerde dikkat.
```

**Notlar:**
- Hesabın yeni olmamalı (en az 2-3 hafta yaş, 5+ entry)
- Ürün adını sadece 1 kez geç
- Eksilik/sınır da belirt (güvenilirlik için)

## 7. Reddit — r/KGBTR, r/Turkey, r/Turkiye

**Format: doğrudan link değil, soruya cevap olarak organik öneri**

r/KGBTR'de "kvkk uyumlu pdf aracı önerir misiniz" / "ücretsiz pdf birleştirme" / "ilovepdf alternatifi" arat. Yoksa:

**Yeni post (r/Turkey):**
```
Title: Free Turkish PDF tools — built one for myself, sharing it

I'm a Turkish dev. Got tired of using ilovepdf/smallpdf because:
1. They send my files to foreign servers
2. KVKK compliance is fuzzy for client documents
3. No Turkish OCR for ğ/ş/ı

Built pdfislemleri.com — 17 PDF tools, FastAPI backend, runs on Turkey servers, files auto-delete after 15min, full Turkish UI.

Free, no signup, no ads. Roast it / suggest features. Link: pdfislemleri.com
```

## 8. Forum — Donanimhaber, Technopat (2 ay vadeli)

Hesap aç, 2 ay aktif kullan (5-10 yararlı katkı), sonra "PDF birleştirme nasıl yapılır" / "Adobe alternatifi" sorularına cevap olarak öner.

- forum.donanimhaber.com → Yazılım > Ofis kategorisi
- forum.technopat.net → Yazılım > Genel Yazılım
- forum.shiftdelete.net → daha toleranslı, ilk 1 ay'da link paylaşılabilir

## 9. Linkable Asset Pitch — KVKK Blogları

Yazdığım `/blog/pdf-kvkk-guvenlik` ve genişlettiğim `/blog/pdf-imzalama` (5070 sayılı kanun bölümü) içeriklerini hukuk/KVKK bloglarına pitch yap:

- kvkkrehberi.com — iletişim
- uyumofisi.com — iletişim
- hukukistan.com — iletişim
- avukatlikofisi.com (varsa benzeri Türk hukuk siteleri)

**Pitch e-postası:**
```
Merhaba,

[Site adı]'nın KVKK uygulamaları konusunda Türkiye'nin önde gelen kaynaklarından olduğunu biliyorum.

PDF dosya işlemleri ve KVKK uyumu konusunda yayınladığım iki rehber okurlarınız için faydalı olabilir:

1. KVKK Uyumlu PDF Güvenliği:
   https://pdfislemleri.com/blog/pdf-kvkk-guvenlik
   (Kişisel veri içeren PDF'lerin yurtiçi sunucularda işlenmesi, 5070 sayılı Kanun, e-imza yasal geçerliliği)

2. PDF İmzalama Rehberi:
   https://pdfislemleri.com/blog/pdf-imzalama
   (Hangi belgede hangi imza türü, BTK onaylı sağlayıcılar, MERSİS/KEP/UYAP süreçleri)

Mevcut yazılarınıza referans olarak veya "ek kaynaklar" bölümünde yer verirseniz seviniriz. Karşılığında pdfislemleri.com'da [Site adı]'na bir kaynak linki ekleyebilirim.

İyi çalışmalar,
Emin Kılıç
```

## 10. Mali Müşavir / SMMM Blogger Pitch

İçeriklerimde SMMM, e-Beyanname, mali müşavir senaryoları ekledim. Bu blogger'lara pitch:

- Türk mali müşavir bloglarını LinkedIn'de "SMMM" araması ile bul
- "PDFişlemleri.com" + "SMMM" yazısı pitch et
- Hedef: 5 pitch → 1-2 link

## 11. Ölçüm — Aylık Kontrol

İlk ayın sonunda GSC'de:
- **Impressions:** baseline'a göre artış var mı?
- **Position 11-20** sayfaları: en hızlı kazanç hedefi
- **CTR < %2** olan top sayfalar: title/description iyileştir
- **Yeni sorgular:** UYAP/KEP/GİB/MERSİS varyantları görünüyor mu?

AI search testi (manuel):
1. ChatGPT'ye sor: "ücretsiz türkçe pdf birleştirme sitesi öner"
2. Perplexity'ye sor: "ilovepdf alternatifi kvkk uyumlu"
3. Google'da "ai overview" çıkıyorsa "kvkk uyumlu pdf imzalama" ara

İlk ay görünmeyebilir — 2-3. aydan itibaren brand mention biriktikçe artmalı.

---

**Bunları yaparsan 90 gün sonra:**
- Türkiye trafiği %9.4 → %30-50
- 15-25 yeni dofollow link
- 5-10 long-tail keyword'de ilk 10
- AI search'te marka tanınırlığı başlangıcı

Sorun olursa söyle kralım, yardım ederim.
