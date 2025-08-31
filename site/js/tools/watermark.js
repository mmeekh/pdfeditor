import pdfApi from '../modules/api.js';
import notifications from '../modules/notifications.js';
import pdfLoader from '../modules/loader.js';
import fileHandler from '../modules/fileHandler.js';

class WatermarkTool {
    constructor(){
        this.toolId = 'watermark';
        this.toolName = 'PDF Filigranla';
    }

    async process(){
        const files = fileHandler.getSelectedFiles();
        if (files.length < 1){ notifications.error('En az 1 PDF yükleyin'); return; }
        if (files.length > 10){ notifications.error('Maksimum 10 dosya'); return; }
        const text = document.getElementById('watermarkText')?.value || '';
        if (!text){ notifications.error('Filigran metni girin'); return; }
        const position = document.getElementById('watermarkPosition')?.value || 'center';
        const fontSize = parseInt(document.getElementById('watermarkFontSize')?.value || '36', 10);
        const color = document.getElementById('watermarkColor')?.value || '#000000';
        const btn = document.getElementById('processButton');
        if (btn) btn.disabled = true;
        try {
            pdfLoader.show({ message: `${this.toolName} işleniyor...`, subMessage: `${files.length} dosya yükleniyor` });
            const up = await pdfApi.uploadFilesForWatermark(files);
            const sessionId = up.session_id;
            pdfLoader.updateProgress(50, 'Filigran uygulanıyor...');
            const result = await pdfApi.processWatermark(sessionId, { text, position, fontSize, color });
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
            downloadBtn.innerHTML = '<i class="fa-solid fa-download mr-2"></i>Tekrar İndir';
            downloadBtn.onclick = () => fileHandler.triggerFileDownload(url);
        }
        resultArea.classList.remove('hidden');
        notifications.success('Filigran eklendi!');
    }

    getOptions(){
        return `
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
            <input id="watermarkFontSize" type="number" class="form-input" value="36" min="8" max="150">
        </div>
        <div class="tool-option-group">
            <label class="tool-option-label" for="watermarkColor">Renk</label>
            <input id="watermarkColor" type="color" class="form-input" value="#000000">
        </div>`;
    }

    getFunnyQuote(){ return 'İmzanız her sayfada!'; }
    getDescription(){ return 'Metin filigranı ekleyin, konum ve stilini seçin. Birden fazlaysa ZIP olarak indirin.'; }
}

const watermarkTool = new WatermarkTool();
export default watermarkTool;
