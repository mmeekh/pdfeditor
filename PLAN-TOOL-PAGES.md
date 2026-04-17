# Plan — PDF Araçlarını Kendi Sayfalarına Taşıma (SEO & Trafik)

> **Amaç:** Her PDF aracının çalışan arayüzünü (dosya yükleme + araca özel ayarlar + işlem) kendi dedicated tool sayfasında çalıştırmak; ana sayfayı hub/dizin rolüne taşımak. Mevcut özelliklerin tamamı (Ayırma Modu, Tablo Algılama, Paragraf İşleme, Şifrele seçenekleri vb.) bozulmadan taşınacak.

**Tarih:** 2026-04-16
**Durum:** Onay bekliyor (sadece plan — henüz uygulama yok)

---

## 1. Neden Yapıyoruz? (SEO Gerekçesi)

| Mevcut Durum | Yeni Durum | SEO Etkisi |
|---|---|---|
| Kullanıcı `/pdf-ayir`'a düşüyor ama tool'u kullanmak için `/#split`'e gidiyor | Tool `/pdf-ayir` içinde çalışıyor | **Intent match mükemmel** — kullanıcı aynı URL'de işini bitiriyor |
| Tüm engagement (dosya yükleme, işlem başarısı) homepage'e akıyor | Her tool sayfası kendi conversion signal'ini biriktiriyor | **16 güçlü sayfa** oluşuyor (şu an 1 güçlü + 16 zayıf) |
| `SoftwareApplication` schema "burada bir yazılım var" diyor ama aslında yok | Schema iddiası URL ile birebir eşleşiyor | **Schema E-E-A-T** güvenilirliği artar |
| `/#split` gibi hash link'ler SERP'te ikinci sınıf | `/pdf-ayir` tam-path canonical | **Paylaşım & ranking** boost |
| Rakipler (iLovePDF, SmallPDF, PDF24) zaten bu modelde | Aynı başarılı patterni izliyoruz | **Rekabet eşitliği** |

---

## 2. Mevcut Mimari (Özet)

```
site/
├── index.html                  # Homepage: 16 tool card + #toolInterface div (gizli)
├── js/
│   ├── modules/
│   │   ├── toolManager.js      # Tool orchestrator: openTool, populateToolInterface
│   │   ├── fileHandler.js      # Drag-drop, file list, validation
│   │   ├── api.js              # Backend çağrıları
│   │   └── loader.js           # Progress loader
│   └── tools/                  # Her araç için ayrı modül:
│       ├── split.js            # getOptions() → Ayırma Modu HTML
│       ├── pdf-to-excel.js     # getOptions() → Tablo Algılama, Paragraf İşleme
│       ├── protect.js          # getOptions() → Parola, izin kısıtlama
│       ├── watermark.js        # getOptions() → Metin/resim, şeffaflık
│       └── ... (16 modül)
├── pdf-birlestir.html          # SEO landing (sadece anlatım)
├── pdf-ayir.html               # SEO landing (sadece anlatım)
└── pdf-sirala.html ... (10 yeni sayfa)
```

### Önemli Detay
`js/tools/*.js` içindeki her araç modülü şunları sağlıyor:
- `getOptions()` → araca özel ayarların HTML string'ini döndürür
- `mount()` → DOM'a eklendikten sonra event binding yapar
- `process()` → dosyaları API'ye gönderir, sonucu indirir
- `getDescription()`, `getFunnyQuote()` → UI metinleri

**Bu yapı refactor için ideal — aynı modüller her sayfada tekrar kullanılabilir.**

---

## 3. Hedef Kullanıcı Deneyimi

### Akış A: Homepage → Tool Sayfası (tıklama)
1. Kullanıcı ana sayfada "PDF Ayır" kartına tıklar
2. Tarayıcı **doğrudan `/pdf-ayir`'a gider** (sayfa açılışı)
3. Sayfa hazır olduğunda **tool arayüzü otomatik açık** (hidden değil)
4. Kullanıcı dosyayı sürükler → işlemi başlatır
5. Sonuç aynı sayfada indirilir

### Akış B: Homepage → Tool Sayfası (drag-drop handoff)
1. Kullanıcı ana sayfada PDF dosyasını "PDF Ayır" kartının üzerine sürükler
2. JS dosyayı yakalar, **IndexedDB'ye geçici token ile kaydeder**
3. `/pdf-ayir?handoff=<token>`'a yönlenir
4. Destination sayfa:
   - URL param'dan token'ı okur
   - IndexedDB'den dosyayı çeker, siler
   - FileHandler'a dosyayı yerleştirir (yüklenmiş görünür)
   - Araç ayarları açık, "İşlemi Başlat" butonu hazır
5. Kullanıcı tek tıkla işlemi yapar

### Akış C: Direct Landing (Google'dan gelen)
1. Kullanıcı "pdf sıkıştırma" arıyor, SERP'ten `/pdf-sikistir`'e düşüyor
2. Sayfa açılır: üstte SEO içerik (hero, features, use cases), **altında çalışan tool** inline
3. Kullanıcı SEO içeriği görmeyi atlayarak direkt tool'a kaydırabilir (sayfa başında "Aracı Kullan" CTA scroll yapar)

### Akış D: Backward Compat (eski bookmark'lar)
- `/` veya `/#split` → Homepage açılır; hash varsa JS yakalar, `/pdf-ayir`'a **301 (JS redirect)** yönlendirir
- `/split`, `/merge`, `/compress` → zaten Caddy 301 ile Türkçe slug'a gidiyor
- `/organize`, `/sign`, `/protect`, `/unlock`, `/rotate`, `/watermark` → Caddy 301 (yapıldı)

---

## 4. Teknik Mimari — Uygulama Detayı

### 4.1 Ortak Tool Arayüzü Partial'ı

`site/partials/tool-ui.html` (yeni) — 16 sayfanın tamamında **aynı HTML bloğu** olacak:

```html
<section id="toolInterface" class="fade-in" data-tool="AUTO">
  <div class="bg-white rounded-xl shadow-md p-6">
    <h2 id="toolTitle" class="text-2xl font-bold text-gray-800">...</h2>
    <p id="toolDescription" class="text-gray-600 mb-6">...</p>

    <!-- Dosya sürükle-bırak alanı -->
    <div id="fileUploadArea" class="file-drop-area ...">
      <i class="fas fa-cloud-upload-alt ..."></i>
      <p>PDF dosyalarınızı buraya sürükleyip bırakın</p>
      <button id="selectFilesBtn">Dosyaları Seç</button>
      <input type="file" id="fileInput" multiple hidden>
    </div>

    <!-- Dosya listesi -->
    <div id="fileList" class="mt-4"></div>

    <!-- ARAÇ-ÖZEL AYARLAR (Ayırma Modu, Tablo Algılama, vb.) -->
    <div id="toolOptions" class="mt-6"></div>

    <!-- İşlem butonu -->
    <div class="mt-6 flex gap-3">
      <button id="processButton" class="btn-primary">İşlemi Başlat</button>
      <button onclick="resetTool()">Sıfırla</button>
    </div>

    <!-- Sonuç alanı -->
    <div id="resultArea" class="mt-6 hidden"></div>
  </div>
</section>
```

> **Partial tek dosya** — Jekyll/Hugo kullanmıyoruz, o yüzden yaklaşım: **build script** ile (küçük bir Python/Node script) 16 HTML sayfaya aynı blok inject edilir. Alternatif: JS ile runtime'da fetch+inject (daha kolay ama ilk render'da fragment boş kalır).
>
> **Önerim:** Python build script (`build_tool_ui.py`) — çıktı statik HTML, SEO+performance avantajlı.

### 4.2 Auto-Init (tool sayfası açıldığında tool'u otomatik aç)

`site/js/modules/app.js` güncellemesi:

```js
import toolManager from './toolManager.js';

// Her sayfada: data-tool attr'ından hangi tool olduğunu oku
const toolSection = document.getElementById('toolInterface');
if (toolSection) {
  const toolFromAttr = toolSection.getAttribute('data-tool');
  const toolFromPath = detectToolFromPath(); // /pdf-ayir → 'split'
  const activeTool = toolFromAttr !== 'AUTO' ? toolFromAttr : toolFromPath;

  if (activeTool) {
    // Handoff check
    const params = new URLSearchParams(location.search);
    const handoff = params.get('handoff');
    if (handoff) {
      const files = await retrieveHandoffFiles(handoff);
      toolManager.openToolWithFiles(activeTool, files);
    } else {
      toolManager.openTool(activeTool);
    }
  }
}
```

`detectToolFromPath()` URL → tool ID haritalaması:
```
/pdf-birlestir   → merge
/pdf-ayir        → split
/pdf-sikistir    → compress
/pdf-sirala      → organize
/pdf-imzala      → sign
/pdf-sifrele     → protect
/pdf-sifre-kaldir→ unlock
/pdf-dondur      → rotate
/pdf-filigran    → watermark
/pdf-ocr         → pdf-ocr
/pdf-to-word     → pdf-to-word
/word-to-pdf     → word-to-pdf
/pdf-to-ppt      → pdf-to-ppt
/pdf-to-excel    → pdf-to-excel
/pdf-to-txt      → pdf-to-txt
/pdf-to-jpg      → pdf-to-jpg
```

### 4.3 Homepage Kartı Davranışı (Navigasyon)

`toolManager.js` içinde **homepage-special mode** eklenecek. Mevcut click handler:

```js
// ESKİ: inline aç
card.addEventListener('click', () => {
  this.openTool(card.dataset.tool);
});

// YENİ: navigasyon
card.addEventListener('click', () => {
  const toolName = card.dataset.tool;
  const url = this.getToolUrl(toolName); // '/pdf-ayir'
  window.location.href = url;
});
```

### 4.4 Drag-Drop Handoff (File Transfer Across Navigation)

**Problem:** `File` objesi navigasyonda ölür. sessionStorage'da serialize edilemez.

**Çözüm:** IndexedDB (Blob olarak kaydedilebilir).

```js
// Homepage'de: drop event
card.addEventListener('drop', async (e) => {
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files);
  const toolName = card.dataset.tool;

  const token = crypto.randomUUID();
  await saveHandoffToIndexedDB(token, files);  // db.put({id: token, files})

  const url = `${this.getToolUrl(toolName)}?handoff=${token}`;
  window.location.href = url;
});

// Destination sayfa'da:
async function retrieveHandoffFiles(token) {
  const entry = await db.get(token);
  if (!entry) return null;
  await db.delete(token); // tek kullanımlık
  return entry.files;
}
```

**Dikkat:**
- IndexedDB'de 5 dakika TTL (temizlik)
- Hata durumunda fallback: handoff başarısız olursa sayfa açılır, tool normal açılır (dosyasız)
- Firefox / Safari / Chrome'da test edilecek

### 4.5 Homepage Inline Tool Interface — Ne Yapılacak?

**Seçenek 1 (önerilen):** `#toolInterface` div'ini homepage'den **kaldır**. Ana sayfa = sadece hub. Temiz, daha hızlı, net rol ayırımı.

**Seçenek 2:** Homepage'de küçültülmüş "quick use" kalır (örn. sadece merge/split/compress), geri kalanı dedicated. Hybrid.

**Önerim: Seçenek 1.** Homepage zaten uzun (hero + 16 kart + SSS + alt içerikler); tool UI kaldırılınca hem hız artar hem SEO temizlenir.

---

## 5. Uygulama Fazları (Önerilen PR Ayrımı)

### Faz 1 — Altyapı (1 PR)
- `site/js/modules/pageToolLoader.js` (yeni) — auto-init + handoff logic
- `site/js/modules/toolRouter.js` (yeni) — URL ↔ toolName map + navigasyon
- `site/js/modules/handoffStorage.js` (yeni) — IndexedDB wrapper
- `site/js/modules/toolManager.js` — homepage mode desteği (flag ile)
- Build script `build_tool_ui.py` (veya shared partial inject)

**Çıktı:** Teknik altyapı hazır, davranış değişmemiş.

### Faz 2 — Dedicated Sayfalara Tool UI Embed (1 PR)
16 tool HTML dosyasına `#toolInterface` bloğu eklenir:
- pdf-birlestir.html
- pdf-ayir.html
- pdf-sikistir.html
- pdf-to-word.html
- word-to-pdf.html
- pdf-to-jpg.html
- pdf-sirala.html
- pdf-imzala.html
- pdf-sifrele.html
- pdf-sifre-kaldir.html
- pdf-dondur.html
- pdf-filigran.html
- pdf-ocr.html
- pdf-to-ppt.html
- pdf-to-excel.html
- pdf-to-txt.html

Her sayfada:
- Hero "Aracı Aç" butonu `#toolInterface`'a scroll yapar
- Tool UI sayfa load'da auto-init
- Handoff varsa dosyaları yükler
- Tool-specific `getOptions()` (Ayırma Modu, Tablo Algılama, Paragraf İşleme vb.) **değişmeden** çıkar — `tool.getOptions()` çağrısı HTML dönüşünü aynen basar

**Test:** 16 sayfada 16 tool'un `getOptions()` çıktısı eşleşmeli; görsel regression yok.

### Faz 3 — Homepage Davranış Değişikliği (1 PR)
- Homepage'deki `#toolInterface` div'i kaldır
- Tool kartlarının click handler'ı → `window.location.href = getToolUrl()`
- Drop handler'ı → IndexedDB handoff + navigasyon
- Mobil tool menüsü (hamburger) aynı şekilde — `<a href="/pdf-ayir">` olur
- `/#merge`, `/#split` gibi hash fallback: JS on-load detect edip `/pdf-birlestir`'a `replaceState`

### Faz 4 — Fotograflar (1-2 PR, aşamalı)
Her tool sayfasına **2-3 fotograf slotu** (önceden eklediğim TODO'lar zaten var):
1. **Hero görseli** (1200x800 WebP) — sürükle-bırak UI görsel veya illüstrasyon
2. **"Nasıl yapılır" yanı görsel** (örn. catpdf.webp yerine her tool için spesifik maskot)
3. **Use-case / özellik görseli** (opsiyonel 3.) — örn. mobil kullanım ekranı, sonuç önizleme

**SEO kuralları:**
- `alt=""` anlamlı ve keyword-natural ("pdf ayırma arayüzünde sayfa aralığı seçimi")
- `width`/`height` zorunlu (CLS)
- `loading="eager"` + `fetchpriority="high"` sadece hero görseli; diğerleri `lazy`
- WebP format (AVIF opsiyonel fallback)
- Dosya adı SEO: `pdf-ayir-hero.webp`, `pdf-ayir-nasil-yapilir.webp`, `pdf-ayir-mobil.webp`
- `images/` klasörü altına koy; mevcut pattern korunur

**Öneri:** Faz 2 ile beraber `<picture>` wrapper'ı template'lenir; sen görselleri yüklersin, hemen devreye girer.

### Faz 5 — Kalite Kontrol & Analitik (1 PR)
- GA4 event naming güncellemesi: `tool_opened_from_page` vs `tool_opened_direct`
- Her tool sayfasının LCP/INP/CLS Core Web Vitals ölçümü
- Sitemap güncelleme (lastmod)
- Search Console URL inspection

---

## 6. Dosya Bazında Değişiklik Listesi

| Dosya | Tip | Açıklama |
|---|---|---|
| `site/js/modules/toolRouter.js` | **YENİ** | URL↔toolName map, `getToolUrl()`, `detectToolFromPath()` |
| `site/js/modules/handoffStorage.js` | **YENİ** | IndexedDB put/get/delete, TTL cleanup |
| `site/js/modules/pageToolLoader.js` | **YENİ** | Sayfa load'da tool'u otomatik mount eder |
| `site/js/modules/toolManager.js` | Güncelleme | `openTool` → homepage mode'da navigate, tool-page mode'da inline |
| `site/js/modules/app.js` | Güncelleme | `pageToolLoader`'ı import + çağır |
| `site/js/modules/fileHandler.js` | Güncelleme | Pre-loaded files API'si (`setFiles(files)`) |
| `build_tool_ui.py` | **YENİ** (veya shell) | Partial HTML'i 16 sayfaya inject eder |
| `site/partials/tool-ui.html` | **YENİ** | Ortak tool UI şablonu |
| `site/index.html` | Güncelleme | `#toolInterface` bloğu kaldırılır; tool card link'leri |
| `site/pdf-*.html` (16 dosya) | Güncelleme | `#toolInterface` bloğu inject edilir; hero CTA güncellenir |
| `site/css/components.css` | Muhtemel güncelleme | Tool UI sayfa içinde farklı padding/spacing |
| `Caddyfile` | Değişiklik yok | Redirect'ler zaten var |

---

## 7. Araç-Özel Ayarlar — Taşıma Garantisi

Her tool'un `getOptions()` çıktısı değişmeden çalışacak. Örnek validasyon:

| Tool | Mevcut Ayarlar | Taşınacak mı? |
|---|---|---|
| split | Ayırma Modu (ranges / every_n), Sayfa aralığı input | ✅ `getOptions()` aynen çalışır |
| pdf-to-excel | Tüm sayfalar / ilk sayfa, Tablo Algılama (otomatik/çizgili/çizgisiz), Paragraf İşleme, PDF Şifresi | ✅ |
| protect | Açılış parolası, sahip parolası, izin kısıtlamaları | ✅ |
| watermark | Metin vs resim, şeffaflık slider, konum, rotasyon | ✅ |
| sign | Elle çizim / resim / yazı tipi imza, tarih-mühür | ✅ |
| pdf-ocr | Dil seçimi, çıktı tipi (searchable PDF vs TXT) | ✅ |
| rotate | Açı (90/180/270), seçili sayfa vs tümü | ✅ |
| organize | (drag-drop UI — karmaşık mount) | ✅ `mount()` hook'ı aynı |
| merge | Çoklu dosya sıralama | ✅ |
| compress | Sıkıştırma seviyesi | ✅ |

**Test kriteri:** Homepage'de ayarlar nasıl görünüyorsa dedicated sayfada pixel-perfect aynı görünecek (CSS değişmeden).

---

## 8. SEO Kazanımları (Beklenen)

**Kısa vadeli (1-2 hafta):**
- 16 tool sayfası Google Search Console'da CTR artar (intent match)
- Sayfa başı ortalama oturum süresi +%40-60 (tahmini, engagement arttığı için)
- Bounce rate düşer (kullanıcı işini bu sayfada bitiriyor)

**Orta vadeli (1-3 ay):**
- Tool-spesifik keyword'lerde ranking yükselişi (örn. "pdf sıkıştırma" için /pdf-sikistir 1. sayfaya çıkar)
- Core Web Vitals iyileşir (homepage küçülür, tool sayfaları dar odaklı)
- Schema Markup'ın içerikle uyumu E-E-A-T boost

**Uzun vadeli (3-6 ay):**
- Backlink profili dağılır (eskiden hep /'a, artık 16 URL'e)
- Topical authority (her tool kendi konusunda derinleşir — FAQ + use case + tool hep beraber)

---

## 9. Riskler & Azaltma

| Risk | Olasılık | Azaltma |
|---|---|---|
| IndexedDB drag-handoff eski tarayıcılarda çalışmaz | Düşük | Feature detect + fallback: handoff fail → normal sayfa aç |
| Tool modülleri 2 farklı sayfada farklı davranabilir | Orta | Faz 1+2 arasında yoğun test; her tool için checklist |
| Homepage Navbar "Araçlar" menüsü inline'dı, artık tüm link | Düşük | Mobil menü zaten `<a>` bazlı, mevcut pattern korunur |
| Eski `/#merge` bookmark'ları | Düşük | JS on-load hash detect → replaceState (`/pdf-birlestir`) |
| SEO dalgalanması (Google re-index sürecinde) | Orta | Sitemap lastmod güncelle, Search Console URL inspection, **tüm sayfalarda 200 OK kaldığı için büyük risk yok** |
| Analytics event adları değişir (funnel kopar) | Orta | Eski event isimlerini paralel tut, 30 gün migration süresi |
| Performance regression (her sayfaya tool JS yüklenir) | Düşük | JS zaten tek bundle, code-split yok; kod tekrarı yok. Homepage aslında **hafifler** |

---

## 10. Fotograf Planı (Kullanıcıdan)

Her tool sayfası için **2-3 görsel slot**. Aşağıdaki yerler hazır (Faz 2'de template'lenecek):

### Slot 1: Hero görseli
- **Konum:** Hero section, sağ sütun (2-kolon grid)
- **Boyut önerisi:** 1200×800 WebP (responsive)
- **İçerik:** Tool'un görsel temsili — örn. PDF Ayır için sayfalar bölünürken gösteren illüstrasyon
- **Dosya adı:** `images/pdf-ayir-hero.webp`

### Slot 2: "Nasıl yapılır" maskot/görsel
- **Konum:** How-to section yanı (3-kolon grid, sol)
- **Boyut:** 560×560 WebP
- **İçerik:** Adımları anlatan illüstrasyon veya maskot
- **Dosya adı:** `images/pdf-ayir-nasil-yapilir.webp`
- **Şu an:** Hepsinde `catpdf.webp` kullanılıyor — sen yeni yükleyince otomatik değişir (TODO yorum satırları hazır)

### Slot 3 (opsiyonel): Use-case görseli
- **Konum:** "Kimler kullanıyor" section altı veya özellikler grid'in içinde
- **Boyut:** 800×600 WebP
- **İçerik:** Gerçek kullanım senaryosu — örn. avukatın dosya hazırladığı ekran görüntüsü
- **Dosya adı:** `images/pdf-ayir-kullanim.webp`

**Toplam:** 16 tool × 2-3 görsel = 32-48 WebP dosya.

---

## 11. Test Kriteri (DoD — Definition of Done)

- [ ] 16 tool sayfasının tamamında tool UI yükleniyor ve çalışıyor
- [ ] Araç-özel ayarların HTML çıktısı homepage vs dedicated sayfa için **pixel-perfect aynı**
- [ ] Drag-drop handoff: Chrome, Firefox, Safari'de ana sayfadan tool sayfasına dosya taşınıyor
- [ ] Mobil drag-drop (touch): dosya seçici fallback çalışıyor
- [ ] Homepage `#toolInterface` yok; kart click → navigasyon
- [ ] Eski `/#merge` hash link → `/pdf-birlestir`'a replaceState
- [ ] Tüm 16 tool sayfası HTTP 200
- [ ] Tüm 16 tool sayfasında Core Web Vitals lab (LCP<2.5s, CLS<0.1, INP<200ms)
- [ ] Sitemap `lastmod` güncel
- [ ] Search Console sitemap yeniden submit
- [ ] GA4 event'leri çalışıyor (tool_opened, tool_process_complete, handoff_success)

---

## 12. Zaman Tahmini

| Faz | Süre (Claude + user review) |
|---|---|
| Faz 1 — Altyapı | 2 saat (kod) + 30dk review |
| Faz 2 — 16 sayfaya embed | 2 saat (büyük kısmı script + spot check) |
| Faz 3 — Homepage refactor | 1 saat |
| Faz 4 — Görsel template (fotoğrafları sen sonradan ekleyebilirsin) | 30 dk |
| Faz 5 — QA + analytics | 1 saat |
| **Toplam** | **~7 saat** (paralel agent kullanırsak 4-5 saat) |

---

## 13. Onay Kapısı

Aşağıdaki kararları senden bekliyorum:

1. **Ana sayfada inline tool UI kalsın mı, kalkıyor mu?**
   → Önerim: **Kalksın** (temiz hub rolü, hız artışı)
2. **Drag-drop handoff mekanizması:** IndexedDB (önerilen) mı, yoksa sadece click-based navigasyon mu?
   → Önerim: **IndexedDB** (UX kaybı olmasın)
3. **Build script dili:** Python (tercihli, mevcut repo pattern'i) mi, Node.js mi?
   → Önerim: **Python** (repo'da zaten Python var, ek bağımlılık yok)
4. **Deploy stratejisi:** Tek büyük PR mı, 5 ayrı PR mı?
   → Önerim: **5 ayrı PR** (her faz bağımsız test edilir, rollback kolay)

Onay verirsen Faz 1'den başlarım.
