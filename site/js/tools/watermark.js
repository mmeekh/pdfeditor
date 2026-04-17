import pdfApi from '../modules/api.js';
import notifications from '../modules/notifications.js';
import pdfLoader from '../modules/loader.js';
import fileHandler from '../modules/fileHandler.js';

class WatermarkTool {
    constructor(){
        this.toolId = 'watermark';
        this.toolName = 'PDF Filigranla';
    }

    _getType(){
        const radio = document.querySelector('input[name="watermarkType"]:checked');
        return radio ? radio.value : 'text';
    }

    async process(){
        const files = fileHandler.getSelectedFiles();
        if (files.length < 1){ notifications.error('En az 1 PDF yükleyin'); return; }
        if (files.length > fileHandler.MAX_FILES){ notifications.error(`Maksimum ${fileHandler.MAX_FILES} dosya`); return; }

        const type = this._getType();
        const btn = document.getElementById('processButton');
        if (btn) btn.disabled = true;

        try {
            if (type === 'image'){
                // Resim filigran modu
                const imageInput = document.getElementById('watermarkImage');
                const imageFile = imageInput?.files?.[0];
                if (!imageFile){
                    notifications.error('Lütfen bir filigran resmi (PNG/JPG) seçin');
                    if (btn) btn.disabled = false;
                    return;
                }
                const position = document.getElementById('watermarkImagePosition')?.value || 'center';
                const size = document.getElementById('watermarkImageSize')?.value || 'medium';
                const opacity = parseFloat(document.getElementById('watermarkImageOpacity')?.value || '0.5');

                pdfLoader.show({ message: `${this.toolName} işleniyor...`, subMessage: `${files.length} dosya yükleniyor` });
                const up = await pdfApi.uploadFilesForWatermark(files);
                const sessionId = up.session_id;

                pdfLoader.updateProgress(50, 'Filigran uygulanıyor...');
                const result = await pdfApi.processWatermarkImage(sessionId, {
                    image: imageFile,
                    position,
                    size,
                    opacity,
                });
                pdfLoader.updateProgress(100, 'Tamamlandı!');
                setTimeout(()=>{ pdfLoader.hide(); this.showResult(result); },150);
                return;
            }

            // Metin modu (mevcut akış)
            const text = document.getElementById('watermarkText')?.value || '';
            if (!text){ notifications.error('Filigran metni girin'); if (btn) btn.disabled = false; return; }
            const position = document.getElementById('watermarkPosition')?.value || 'center';
            const fontSize = parseInt(document.getElementById('watermarkFontSize')?.value || '36', 10);
            const color = document.getElementById('watermarkColor')?.value || '#000000';
            const opacity = parseFloat(document.getElementById('watermarkOpacity')?.value || '0.5');

            pdfLoader.show({ message: `${this.toolName} işleniyor...`, subMessage: `${files.length} dosya yükleniyor` });
            const up = await pdfApi.uploadFilesForWatermark(files);
            const sessionId = up.session_id;
            pdfLoader.updateProgress(50, 'Filigran uygulanıyor...');
            const result = await pdfApi.processWatermark(sessionId, { text, position, fontSize, color, opacity });
            pdfLoader.updateProgress(100, 'Tamamlandı!');
            setTimeout(()=>{ pdfLoader.hide(); this.showResult(result); },150);
        } catch(e){
            console.error('Watermark failed', e);
            notifications.error(e.message || 'Filigran sırasında hata oluştu');
            pdfLoader.hide();
            if (btn) btn.disabled = false;
        }
    }

    showResult(result){
        const resultArea = document.getElementById('resultArea');
        if (!resultArea) return;
        const url = window.location.origin + result.download_url;
        fileHandler.triggerFileDownload(url);
        const downloadBtn = resultArea.querySelector('button');
        if (downloadBtn){
            downloadBtn.innerHTML = '<i class="fas fa-download mr-2"></i>Tekrar İndir';
            downloadBtn.onclick = () => fileHandler.triggerFileDownload(url);
        }
        resultArea.classList.remove('hidden');
        notifications.success('Filigran eklendi!');
    }

    getOptions(){
        return `
        <div class="tool-option-group">
            <label class="tool-option-label">Filigran Tipi</label>
            <div class="flex gap-4">
                <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="watermarkType" value="text" checked>
                    <span>Metin filigranı</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="watermarkType" value="image">
                    <span>Resim filigranı</span>
                </label>
            </div>
        </div>

        <div id="watermarkTextPanel">
            <div class="tool-option-group">
                <label class="tool-option-label" for="watermarkText">Filigran Metni</label>
                <input id="watermarkText" class="form-input" placeholder="Örn: Gizli">
            </div>
            <div class="tool-option-group">
                <label class="tool-option-label" for="watermarkPosition">Konum</label>
                <select id="watermarkPosition" class="form-input">
                    <option value="center">Orta</option>
                    <option value="topleft">Sol Üst</option>
                    <option value="topright">Sağ Üst</option>
                    <option value="fill">Doldur</option>
                </select>
            </div>
            <div class="tool-option-group">
                <label class="tool-option-label" for="watermarkFontSize">Yazı Boyutu</label>
                <div class="flex items-center gap-3">
                    <div class="flex-1">
                        <input id="watermarkFontSize" type="number" class="form-input" value="36" min="8" max="150">
                    </div>
                    <div class="font-preview-container">
                        <div class="font-preview" id="fontPreview">Aa</div>
                    </div>
                </div>
            </div>
            <div class="tool-option-group">
                <label class="tool-option-label">Renk ve Şeffaflık</label>
                <div class="flex items-center gap-3">
                    <div class="relative">
                        <input id="watermarkColor" type="color" class="color-picker-input" value="#000000">
                        <div class="color-preview" id="colorPreview" style="background-color: #000000;"></div>
                    </div>
                    <div class="flex-1">
                        <input id="watermarkOpacity" type="range" class="opacity-slider" min="0.1" max="1" step="0.1" value="0.5">
                        <div class="opacity-label">
                            <span id="opacityValue">50%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div id="watermarkImagePanel" class="hidden">
            <div class="tool-option-group">
                <label class="tool-option-label" for="watermarkImage">Filigran Resmi (PNG/JPG)</label>
                <input id="watermarkImage" type="file" accept="image/png,image/jpeg" class="form-input">
                <p class="text-xs text-gray-500 mt-1">Şeffaf arkaplanlı PNG kullanmanız önerilir.</p>
            </div>
            <div class="tool-option-group">
                <label class="tool-option-label" for="watermarkImagePosition">Konum</label>
                <select id="watermarkImagePosition" class="form-input">
                    <option value="center">Orta</option>
                    <option value="topleft">Sol Üst</option>
                    <option value="topright">Sağ Üst</option>
                    <option value="bottomleft">Sol Alt</option>
                    <option value="bottomright">Sağ Alt</option>
                    <option value="fill">Doldur</option>
                </select>
            </div>
            <div class="tool-option-group">
                <label class="tool-option-label" for="watermarkImageSize">Boyut</label>
                <select id="watermarkImageSize" class="form-input">
                    <option value="small">Küçük</option>
                    <option value="medium" selected>Orta</option>
                    <option value="large">Büyük</option>
                </select>
            </div>
            <div class="tool-option-group">
                <label class="tool-option-label" for="watermarkImageOpacity">Şeffaflık</label>
                <div class="flex items-center gap-3">
                    <div class="flex-1">
                        <input id="watermarkImageOpacity" type="range" class="opacity-slider" min="0.1" max="1" step="0.1" value="0.5">
                    </div>
                    <span id="watermarkImageOpacityValue" class="text-sm text-gray-600">50%</span>
                </div>
            </div>
        </div>`;
    }

    initializeColorPicker() {
        const colorInput = document.getElementById('watermarkColor');
        const colorPreview = document.getElementById('colorPreview');
        const opacitySlider = document.getElementById('watermarkOpacity');
        const opacityValue = document.getElementById('opacityValue');
        const fontSizeInput = document.getElementById('watermarkFontSize');
        const fontPreview = document.getElementById('fontPreview');

        if (colorInput && colorPreview) {
            colorInput.addEventListener('input', (e) => {
                const color = e.target.value;
                colorPreview.style.backgroundColor = color;
            });
        }

        if (opacitySlider && opacityValue) {
            opacitySlider.addEventListener('input', (e) => {
                const opacity = parseFloat(e.target.value);
                opacityValue.textContent = Math.round(opacity * 100) + '%';
                if (colorPreview && colorInput) {
                    const color = colorInput.value;
                    const rgba = this.hexToRgba(color, opacity);
                    colorPreview.style.backgroundColor = rgba;
                }
            });
        }

        if (fontSizeInput && fontPreview) {
            fontSizeInput.addEventListener('input', (e) => {
                const fontSize = parseInt(e.target.value) || 36;
                fontPreview.style.fontSize = fontSize + 'px';
            });
            fontPreview.style.fontSize = '36px';
        }

        // Resim modu opacity etiketi
        const imgOpacity = document.getElementById('watermarkImageOpacity');
        const imgOpacityLabel = document.getElementById('watermarkImageOpacityValue');
        if (imgOpacity && imgOpacityLabel){
            imgOpacity.addEventListener('input', (e) => {
                imgOpacityLabel.textContent = Math.round(parseFloat(e.target.value) * 100) + '%';
            });
        }

        // Tip radyo değişimi
        const radios = document.querySelectorAll('input[name="watermarkType"]');
        const textPanel = document.getElementById('watermarkTextPanel');
        const imagePanel = document.getElementById('watermarkImagePanel');
        radios.forEach(r => {
            r.addEventListener('change', () => {
                const type = this._getType();
                if (type === 'image'){
                    textPanel?.classList.add('hidden');
                    imagePanel?.classList.remove('hidden');
                } else {
                    imagePanel?.classList.add('hidden');
                    textPanel?.classList.remove('hidden');
                }
            });
        });
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    mount() {
        setTimeout(() => {
            this.initializeColorPicker();
        }, 100);
    }

    getFunnyQuote(){ return 'PDF filigran ekleme işlemi, belgelerinizi markalı hale getirir. Profesyonel görünüm için PDFişlemleri.com\'u tercih edin.'; }
    getDescription(){ return 'Metin veya resim filigranı ekleyin, konum ve stilini seçin. Birden fazlaysa ZIP olarak indirin.'; }
}

const watermarkTool = new WatermarkTool();
export default watermarkTool;
