import pdfApi from '../modules/api.js';
import notifications from '../modules/notifications.js';
import pdfLoader from '../modules/loader.js';
import fileHandler from '../modules/fileHandler.js';

class RotateTool {
    constructor(){
        this.toolId = 'rotate';
        this.toolName = 'PDF Döndür';
    }

    async process(){
        const files = fileHandler.getSelectedFiles();
        if (files.length < 1){ notifications.error('En az 1 PDF yükleyin'); return; }
        if (files.length > fileHandler.MAX_FILES){ notifications.error(`Maksimum ${fileHandler.MAX_FILES} dosya`); return; }
        const btn = document.getElementById('processButton');
        if (btn) btn.disabled = true;
        try {
            pdfLoader.show({ message: `${this.toolName} işleniyor...`, subMessage: `${files.length} dosya yükleniyor` });
            const up = await pdfApi.uploadFilesForRotate(files);
            const sessionId = up.session_id;
            const deg = parseInt(document.getElementById('rotateDirection')?.value || '90', 10);
            pdfLoader.updateProgress(50, 'PDF döndürülüyor...');
            const result = await pdfApi.processRotate(sessionId, deg);
            pdfLoader.updateProgress(100, 'Tamamlandı!');
            setTimeout(()=>{ pdfLoader.hide(); this.showResult(result); },150);
        } catch(e){
            console.error('Rotate failed', e);
            notifications.error(e.message || 'Döndürme sırasında hata oluştu');
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
        notifications.success('PDF başarıyla döndürüldü!');
    }

    getOptions(){
        return `
        <div class="tool-option-group">
            <label class="tool-option-label" for="rotateDirection">Döndürme Açısı</label>
            <select id="rotateDirection" class="form-input">
                <option value="90">Sağa 90°</option>
                <option value="180">180°</option>
                <option value="270">Sola 90°</option>
            </select>
        </div>`;
    }

    getFunnyQuote(){ return 'PDF döndürme işlemi, sayfalarınızı doğru yönde görüntülemenizi sağlar. Düzenli belgeler için PDFişlemleri.com\'u tercih edin.'; }
    getDescription(){ return 'PDF sayfalarını 90°/180°/270° açılarıyla döndürün. Birden fazlaysa ZIP olarak indirin.'; }
}

const rotateTool = new RotateTool();
export default rotateTool;
