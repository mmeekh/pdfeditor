# İkon Dosyaları

Bu klasör PWA ve farklı platformlar için gerekli ikonları içerir.

## Gerekli İkonlar

### PNG İkonları (Yuvarlatılmış Köşeli)
- `apple-touch-icon.png` - 180x180px (iOS)
- `android-chrome-192x192.png` - 192x192px (Android)
- `android-chrome-512x512.png` - 512x512px (Android)
- `mstile-150x150.png` - 150x150px (Windows)

### Maskable İkonlar
- `maskable_icon_x192.png` - 192x192px (Android safe area)
- `maskable_icon_x512.png` - 512x512px (Android safe area)

### Diğer
- `favicon.ico` - 16x16, 32x32, 48x48px (tarayıcı)
- `safari-pinned-tab.svg` - Tek renkli SVG (Safari)

## Üretim Talimatları

### PNG İkonları
1. Ana logo tasarımını 512x512px olarak hazırlayın
2. Köşeleri %20 radius ile yuvarlatın
3. Farklı boyutlarda export edin
4. PNG optimizasyonu yapın (oxipng/pngquant)

### Maskable İkonlar
1. Ana ikonu 192x192 ve 512x512 boyutlarında hazırlayın
2. Android safe area için %10 margin bırakın
3. Köşeleri yuvarlatın

### SVG İkon
1. Tek renkli tasarım yapın
2. fill="#000000" kullanın
3. Safari pinned tab için optimize edin

## Araçlar
- **Design**: Figma, Adobe Illustrator, Sketch
- **Optimization**: ImageOptim, TinyPNG, oxipng
- **Conversion**: Online favicon generators

## Not
Bu ikonlar production'da kullanılmadan önce profesyonel olarak tasarlanmalıdır.
