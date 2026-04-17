# PDF Araç Sayfaları — Görsel Üretim Promptları

> **Amaç:** Her PDF aracının landing sayfasına **2-3 adet** 3D karikatür tarzında, tatlı ve marka kimliğine uygun illüstrasyon üretmek. Bu dosya Midjourney v6 / DALL·E 3 / Leonardo.ai / Flux / ChatGPT Image / Google Imagen için hazır promptları içerir.

**Tarih:** 2026-04-16
**Toplam görsel:** 16 tool × 2-3 = **32-48 adet**

---

## 1. Genel Stil Rehberi (Tüm Promptlara Eklenecek Suffix)

### Stil Anahtar Kelimeleri
```
cute 3D cartoon illustration, Pixar-style, soft lighting, rounded shapes,
friendly expressive faces, big eyes, smooth render, subsurface scattering,
pastel color palette with vibrant accents, isolated subject,
transparent background, no background, cutout style,
professional illustration, children's book aesthetic, Disney-inspired,
octane render, high detail, floating in empty space
```

### ⚠ ÖNEMLİ: Arkaplan Yok
Tüm görseller **şeffaf arkaplan (PNG alpha channel)** olacak. Karakterler/objeler
sahne içinde değil, **izole** biçimde — sayfanın içine doğrudan yapıştırıldığında
etrafında beyaz kutu olmayacak, sayfa arkaplanıyla doğal biçimde birleşecek.

Prompt'lara ekle: `isolated on transparent background, cutout, no background,
floating composition, no environment, no ground shadow` (yumuşak gölge istersen
`soft contact shadow only`).

### Marka Kırmızısı (PDF İkonografisi)
Karakterler veya objeler **PDF dosyası** ile etkileşiyorsa dosya rengi **parlak kırmızı (#E53935 / red-600)** ve üzerinde beyaz "PDF" yazısı olmalı — mevcut sitedeki logo ile uyumlu.

### Ton
- Çocuksu değil, **güvenilir + sıcak**
- Aşırı karmaşık değil — **minimal sahne + 1-2 karakter + 1-2 nesne**
- Drama yok, **günlük iş yaşamı** sahneleri

### Karakterler (Opsiyonel tutarlılık için)
İstersen tüm sayfalarda aynı 2-3 karakter ailesi kullanılabilir (örn. "PDF takımı"):
- **Meow** — turuncu-beyaz kedi maskot (şu anki `catpdf.webp` ile uyumlu)
- **Doc** — gözlüklü, profesyonel erkek/kadın karakter
- **Bits** — küçük robot asistan (teknik işler için)

İstersen her tool'da farklı karakterler olabilir — marka tutarlılığı için benim önerim tek aile.

---

## 2. Teknik Özellikler

| Slot | Format | Boyut | Kullanım |
|---|---|---|---|
| **Hero** | **PNG (alpha) → WebP** | yaklaşık 1000-1200px geniş, yükseklik esnek | Sayfanın en üstündeki hero görsel (şeffaf, sayfa bg'si ile kaynaşır) |
| **How-to / Maskot** | **PNG (alpha) → WebP** | yaklaşık 500-700px, yükseklik esnek | "Nasıl yapılır" bölümünün yanındaki izole illüstrasyon |
| **Use-case** | **PNG (alpha) → WebP** | yaklaşık 700-900px, yükseklik esnek | Kullanıcı senaryoları — isole karakter/obje grubu |

**Aspect ratio NOT:** Kare / dikdörtgen takıntısı yok. Kompozisyon "portre", "yatay",
"dinamik açı" olabilir — önemli olan karakterin/objenin şeffaf zeminde rahat
nefes alması. Boyut rehberi sadece yaklaşık — şeffaf alanı HTML/CSS ile istediğiniz
gibi konumlandırıyoruz.

### Negative Prompts (Hepsine Ekle)
```
text artifacts, blurry, low quality, distorted faces, extra limbs,
uncanny valley, photorealistic, stock photo, watermark, signature,
logo overlay, realistic humans, gore, violence,
solid background, white box, gray background, sky, floor, wall,
room, scene, environment, ground, frame, border, rectangle crop
```

### Dosya Adlandırma Kuralı
```
images/pdf-<tool>-hero.webp          → Slot 1 (Hero)
images/pdf-<tool>-nasil-yapilir.webp → Slot 2 (Maskot)
images/pdf-<tool>-kullanim.webp      → Slot 3 (Use-case, ops.)
```

Örnekler: `pdf-ayir-hero.webp`, `pdf-birlestir-nasil-yapilir.webp`, `pdf-sirala-kullanim.webp`

### Önemli — Alt Text (SEO)
Her görseli siteye eklerken `alt` attribute'una şu kalıpta yaz:
```html
alt="[Tool adı] arayüzünde [kısa eylem açıklaması] gösteren 3D illüstrasyon"
```
Örn: `alt="PDF Ayır arayüzünde sayfa aralığı seçimi gösteren 3D illüstrasyon"`

---

## 3. `cardbgs/` Klasöründeki Mevcut Görseller — Nereye Gidecek?

`site/cardbgs/` altında zaten **16 kırmızı PDF ikonlu kompozit görsel** var (Compression, merge, pdflock, pdfocr, pdforganize, pdfrotate, pdftoexcel, pdftoimage, pdftoppt, pdftoword_no_bg, pdfwatermark, signature, split, unlock_no_bg, wordpdftotxt, wordtopdf).

**Plan (implement aşamasında):**
- Her tool sayfasının **header'ının hemen altına** (breadcrumb ile hero arasına) küçük bir "brand visual" band eklenecek
- Bu band'da ilgili `cardbgs/*.webp` görseli **decorative** olarak kullanılacak (opacity: 0.4, parallax efekti opsiyonel)
- Mobilde gizlenebilir (`hidden md:block`) — CLS'i etkilememesi için

**Eşleştirme tablosu:**

| Tool Sayfası | cardbgs Dosyası |
|---|---|
| `/pdf-birlestir` | `merge.webp` |
| `/pdf-ayir` | `split.webp` |
| `/pdf-sikistir` | `Compression.webp` |
| `/pdf-sirala` | `pdforganize.webp` |
| `/pdf-imzala` | `signature.webp` |
| `/pdf-sifrele` | `pdflock.webp` |
| `/pdf-sifre-kaldir` | `unlock_no_bg.webp` |
| `/pdf-dondur` | `pdfrotate.webp` |
| `/pdf-filigran` | `pdfwatermark.webp` |
| `/pdf-ocr` | `pdfocr.webp` |
| `/pdf-to-word` | `pdftoword_no_bg.webp` |
| `/word-to-pdf` | `wordtopdf.webp` |
| `/pdf-to-ppt` | `pdftoppt.webp` |
| `/pdf-to-excel` | `pdftoexcel.webp` |
| `/pdf-to-jpg` | `pdftoimage.webp` |
| `/pdf-to-txt` | `wordpdftotxt.webp` |

---

## 4. Promptlar (Her Tool İçin 2-3 Adet)

> **Kullanım:** Her prompt sonuna §1'deki "Genel Stil Rehberi" metnini ekle, §2'deki aspect ratio + negative prompts ile birlikte image generator'a ver. Midjourney için sonuna `--ar 3:2 --style raw --v 6.1` ekle.

---

PDF Araç Sayfaları — Görsel Üretim Promptları (v2 - Arka Plansız / Oyun Sanatı)

Amaç: Her PDF aracının landing sayfasına 3D Karakter Render (Mobile Game Art) tarzında, epik, arka plansız ve izole illüstrasyonlar üretmek.

1. Genel Stil Rehberi (Tüm Promptlara Eklenecek Suffix)

Stil Anahtar Kelimeleri (The Style Core)

Stylized 3D character render, mobile game art style, high-fidelity 3D model, 
dramatic rim lighting, soft subsurface scattering, clean sharp silhouettes, 
vibrant professional colors, high-quality material textures, 
isolated on white background, no background, cutout style, 
octane render, Unreal Engine 5 aesthetic, 4k, high detail, masterpiece, 
floating composition, no floor, no environment, no horizon line, 
zero background, white backdrop for easy cutout


⚠ ÖNEMLİ: Arka Plan Yok (Strict Rules)

Komutlar: isolated on white background, cutout, no environment, no ground, no shadow, no room, no floor.

Neden Beyaz?: AI modelleri (DALL-E, Flux) "beyaz arka plan" üzerine karakteri çizdiğinde, sonrasında arka planı temizlemek (rembg) çok daha keskin sonuç verir.

Negative Prompts (Hepsine Ekle)

(text artifacts, blurry, low quality, photorealistic, stock photo look, 
human eyes, realistic skin, messy lines, solid background scenery, 
wall, floor, sky, environment, room, ground, shadow, 2D flat vector, 
sketch, grainy, low resolution, uncanny valley, horizon, grass, table)


2. Güncel Promptlar (16 Araç)

4.1 /pdf-birlestir — MERGE

Hero (pdf-birlestir-hero.png)

A heroic 3D warrior character skillfully forging three floating red PDF documents into one glowing unified file using magical energy bands, intense white and blue light between papers, focused epic expression, isolated on white background, no floor.

Mascot (pdf-birlestir-nasil-yapilir.png)

Stylized 3D orange cat mascot wearing tactical pelerin, holding a large red PDF shield, giving a confident thumbs-up, metallic textures on armor, clean 3D render, isolated on white background.

4.2 /pdf-ayir — SPLIT

Hero (pdf-ayir-hero.png)

A precise 3D rogue-like character slicing a large red PDF document into three perfect sections with a glowing neon energy blade, sparks and data fragments at the cutting point, dynamic action pose, isolated on white background, no environment.

Mascot (pdf-ayir-nasil-yapilir.png)

Cute 3D cat mascot holding oversized golden hero shears, standing next to a red PDF that has been cleanly cut into layers, sharp focus, dramatic rim lighting, isolated on white background.

4.3 /pdf-sikistir — COMPRESS

Hero (pdf-sikistir-hero.png)

A powerful 3D titan character pressing a giant red PDF from both sides with glowing blue energy gloves, the PDF is visibly compacting with pressure waves, intense cinematic lighting, isolated on white background, zero environment.

4.4 /pdf-sirala — ORGANIZE

Hero (pdf-sirala-hero.png)

A 3D strategist character manipulating a floating holographic grid of red PDF pages, dragging one page with a trail of light, high-tech tactical interface, isolated on white background, no room.

4.5 /pdf-imzala — SIGN

Hero (pdf-imzala-hero.png)

A 3D noble character holding a massive glowing golden quill, elegantly etching a magical signature onto a floating red PDF scroll, golden light aura, isolated on white background.

4.6 /pdf-sifrele — PROTECT

Hero (pdf-sifrele-hero.png)

A 3D guardian character summoning a hexagonal energy shield around a red PDF, a giant high-tech golden padlock locking into place, blue defensive glow, isolated on white background.

4.7 /pdf-sifre-kaldir — UNLOCK

Hero (pdf-sifre-kaldir-hero.png)

A 3D master-thief character unlocking a massive red PDF vault with a glowing skeleton key, orange sparks flying as the lock shatters into light particles, isolated on white background.

4.8 /pdf-dondur — ROTATE

Hero (pdf-dondur-hero.png)

A 3D monk character spinning a red PDF 90 degrees with a wave of their hand, blue motion trails forming a perfect circle, dynamic floating pose, isolated on white background.

4.9 /pdf-filigran — WATERMARK

Hero (pdf-filigran-hero.png)

A 3D artist character branding a large red PDF with a glowing translucent seal using a massive high-tech stamp, energy ripples spreading across the page, isolated on white background.

4.10 /pdf-ocr — OCR

Hero (pdf-ocr-hero.png)

A 3D scholar character using a glowing crystal lens to scan an old red PDF, letters transforming into floating digital data streams of light, isolated on white background.

4.11 /pdf-to-word — CONVERT

Hero (pdf-to-word-hero.png)

A 3D alchemist character transmuting a red PDF into a blue Word document, glowing particles shifting color from red to blue mid-air, energetic swirl, isolated on white background.

4.12 /word-to-pdf — WORD TO PDF

Hero (word-to-pdf-hero.png)

A 3D blacksmith character forging a blue Word document into a solid red PDF using a magical hammer and anvil, color shift from blue to red, isolated on white background.

4.13 /pdf-to-ppt — TO PPT

Hero (pdf-to-ppt-hero.png)

A 3D presenter character unfolding a red PDF into a fanned-out deck of orange presentation slides, energetic motion, creative flair, isolated on white background.

4.14 /pdf-to-excel — TO EXCEL

Hero (pdf-to-excel-hero.png)

A 3D analyst character extracting green data cubes from a red PDF and arranging them into a glowing Excel grid, high precision, isolated on white background.

4.15 /pdf-to-jpg — TO JPG

Hero (pdf-to-jpg-hero.png)

A 3D designer character exploding a red PDF into a flurry of colorful high-resolution image cards, artistic and vibrant composition, isolated on white background.

4.16 /pdf-to-txt — TO TXT

Hero (pdf-to-txt-hero.png)

A 3D character distilling a red PDF into a pure, clean stream of white light letters flowing into a minimalist gray document, isolated on white background.

3. Üretim Notları

White Background Tercihi: Promptlarda "isolated on white background" kullandık çünkü "transparent" komutu bazen AI'da gri karelere (fake png) neden olur. Beyaz zemini Photoshop veya remove.bg ile silmek çok daha temiz sonuç verir.

Rim Lighting: Her görselde karakterin kenarlarında parlayan o beyaz/yeşil ışık hattını kontrol et. Bu hacim için şart.

Midjourney: Sonuna --v 6.1 --style raw --ar 1:1 --no ground ekleyerek üretin.
**Use-case (`pdf-to-txt-kullanim.png`)**
```
3D cartoon developer holding a laptop showing clean TXT content
extracted from a red PDF research paper, focused productive smile,
isolated on transparent background, no room, cutout style.
```

---

## 5. Prompt Şablonu (Kendi Varyasyonların İçin)

```
A cute 3D cartoon [character] [action] a [red PDF or blue Word or
green Excel] document, [magical particle / glow / color description],
[emotion], [pose detail].

Style: cute 3D cartoon illustration, Pixar-style, soft lighting,
rounded shapes, friendly expressive faces, smooth render, pastel
palette with vibrant accents, isolated on transparent background,
no environment, cutout style, floating composition, soft contact
shadow only, octane render, high detail.

Negative: text artifacts, blurry, uncanny valley, realistic humans,
stock photo look, solid background, white box, gray background,
scene, environment, room, floor, sky, wall, frame, border.

Kompozisyon: Karakter/obje izole — arka plan TAMAMEN şeffaf. Sadece
karakterin altında çok yumuşak "contact shadow" olabilir (opsiyonel).
```

---

## 6. Post-Processing (Görsel Üretim Sonrası)

**Workflow:** AI çıktısı → arka plan temizliği → PNG (alpha) → WebP (alpha destekli)

1. **Arka plan kaldırma (ZORUNLU):** Üretilen görselin arka planı genelde tam
   şeffaf olmaz. Aşağıdakilerden biriyle temizle:
   - **remove.bg** (web, ücretsiz 1 MP altı) — hızlı
   - **Photoroom** (web/iOS/Android) — 3D cartoon için çok iyi
   - **Clipdrop Cleanup** (Stability AI) — detay korur
   - **rembg** (local CLI):
     ```bash
     pip install rembg
     rembg i input.png output.png    # u2net modeli, alpha PNG çıktısı
     ```
2. **PNG → WebP (alpha kanalı korunarak):**
   ```bash
   cwebp -q 85 -alpha_q 100 input.png -o output.webp
   ```
   (`-alpha_q 100` kenarların keskin kalması için önemli)
3. **Boyut hedefi:** <150 KB (şeffaf WebP, pixel dışı alan zaten "veri" değil, rahat)
4. **Quality:** 80-85 arası (3D cartoon'da 85 güzel durur)
5. **Kenar temizliği:** rembg bazen kenarda yarı şeffaf "halo" bırakır →
   Photoshop/GIMP'te `Layer > Matting > Defringe 1px` veya online
   [photopea.com](https://photopea.com) ile kenarı sıkıştır
6. **2x retina (opsiyonel):** `pdf-ayir-hero@2x.webp` + `srcset`
7. **Metadata temizliği:** `exiftool -all= image.webp`

**Hızlı toplu işlem (tüm klasör):**
```bash
# PNG'leri rembg ile temizle
for f in raw/*.png; do rembg i "$f" "cleaned/$(basename $f)"; done

# WebP'ye çevir
for f in cleaned/*.png; do
  cwebp -q 85 -alpha_q 100 "$f" -o "images/$(basename $f .png).webp"
done
```

---

## 7. Üretim Stratejisi Önerisi

**Fazlı yaklaşım (önerilen):**

1. **Faz A — Hero'lar (16 adet):** Her tool için sadece hero görseli üret. Bunlar en önemli — sayfa açılışında görünür, Open Graph image olarak kullanılır. **1. öncelik.**

2. **Faz B — Maskot/nasıl-yapılır (16 adet):** İkinci görseller. Her sayfada mevcut `catpdf.webp`'yi değiştirir.

3. **Faz C — Use-case'ler (opsiyonel, 16 adet):** 3. görsel. Sayfa daha zengin olur ama şart değil.

**AI seçimi:**
- **Midjourney v6.1:** En tutarlı karakter + stil, 3D cartoon başarılı. Ücretli.
- **Flux 1.1 Pro:** Yüksek kalite, iyi prompt takibi.
- **DALL·E 3 (ChatGPT):** Hızlı ve pratik, iyi Türkçe destek.
- **Leonardo.ai:** Ucuz alternatif, stil preset'leri var.
- **Google Imagen 3:** Kaliteli ama karakter tutarlılığı MJ kadar iyi değil.

**Tutarlılık için ipucu:** Tek bir AI aracında kal, aynı "seed" / "style reference" kullan. Midjourney'de `--sref <URL>` ile ilk görselin linkini her sonraki prompt'a ekle.

---

## 8. Hızlı Başlangıç (5 Dakikada Test)

İlk görseli üretmek için aşağıyı Midjourney / ChatGPT Image / Flux'a kopyala:

```
Two cute 3D cartoon characters joyfully pulling together three
floating red PDF documents into one large unified PDF file, magical
merging particles, blue and purple glow between the papers, sense
of teamwork, cute 3D cartoon illustration, Pixar-style, soft lighting,
rounded shapes, friendly expressive faces, pastel palette with
vibrant accents, isolated on transparent background, no environment,
cutout style, floating composition, soft contact shadow only,
octane render, high detail
--ar 3:2 --v 6.1 --style raw
```

**Not:** Midjourney transparent background için `--no background` ve
sonradan rembg geçişi öneriyorum; DALL·E 3 ve Flux direkt "on transparent
background" yazınca büyük oranda şeffaf veriyor ama yine de rembg ile
son temizlik şart.

Beğenirsen tarzı bu şekilde kilitle ve diğer 47 görseli aynı `--sref` /
style reference ile üret.

---

## 9. Yükleme Sonrası Kontrol Listesi

- [ ] Dosya adı `images/pdf-<tool>-<slot>.webp` formatında mı?
- [ ] WebP **alpha kanalı** korunmuş mu? (şeffaf arka plan)
- [ ] Dosya boyutu <150 KB mi?
- [ ] Kenarlarda "halo" (yarı şeffaf şerit) var mı? Yoksa defringe uygulandı mı?
- [ ] `width` / `height` HTML'de ayarlandı mı? (CLS için intrinsic boyut şart)
- [ ] `alt` attribute SEO'ya uygun yazıldı mı?
- [ ] Hero için `loading="eager"` + `fetchpriority="high"`, diğerleri `loading="lazy"` mi?
- [ ] **Dark mode'da görsel okunabilir mi?** — Şeffaf PNG koyu arka planda da iyi
  durmalı. Karanlık kısımlı karakterler koyu zeminde kaybolabilir; test et.
- [ ] Mobile'da kırpma olmuyor mu? (Şeffaf sayesinde kolay yerleşmeli)
- [ ] Retina ekranda keskin mi? (2x varsa srcset eklendi mi?)

---

## 10. `cardbgs/` Kullanım Önerisi (Referans)

Her tool sayfasının breadcrumb ile hero arasına eklenecek küçük "brand strip":

```html
<!-- Tool sayfası üstünde cardbgs referansı -->
<div class="relative h-24 md:h-32 overflow-hidden -mb-4">
  <img src="/cardbgs/split.webp"
       alt=""
       aria-hidden="true"
       class="absolute inset-0 w-full h-full object-cover opacity-40"
       loading="eager"
       width="1200" height="200">
  <div class="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50"></div>
</div>
```

Bu yaklaşımla **mevcut marka görselleri** kullanılmaya devam eder, SEO boost için ek decorative asset olur.

---

**Son Not:** Bu dosyadaki promptlar değiştirilebilir — beğenmediğin satırı düzenle, stil yönünü kendine çevir. Önemli olan **tutarlılık**: tüm görseller aynı hissi yaratmalı. Karar verdikten sonra bir tane üretip bana gönder, sitede nasıl duracağına beraber bakalım.
