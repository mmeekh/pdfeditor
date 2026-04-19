import pdfApi from '../modules/api.js';
import notifications from '../modules/notifications.js';
import pdfLoader from '../modules/loader.js';
import fileHandler from '../modules/fileHandler.js';
import pdfPreview from '../modules/pdfPreview.js';

class RotateTool {
    constructor(){
        this.toolId = 'rotate';
        this.toolName = 'PDF Döndür';
        // { "fileIndex_pageNumber": degrees }
        this.pageRotations = {};
        this._previewRendered = false;
    }

    _getMode(){
        const radio = document.querySelector('input[name="rotateMode"]:checked');
        return radio ? radio.value : 'all';
    }

    async process(){
        const files = fileHandler.getSelectedFiles();
        if (files.length < 1){ notifications.error('En az 1 PDF yükleyin'); return; }
        if (files.length > fileHandler.MAX_FILES){ notifications.error(`Maksimum ${fileHandler.MAX_FILES} dosya`); return; }
        const mode = this._getMode();
        const btn = document.getElementById('processButton');
        if (btn) btn.disabled = true;
        try {
            pdfLoader.show({ message: `${this.toolName} işleniyor...`, subMessage: `${files.length} dosya yükleniyor` });
            const up = await pdfApi.uploadFilesForRotate(files);
            const sessionId = up.session_id;

            let deg = 90;
            let pageRotationsJson = null;
            if (mode === 'pages'){
                // En az bir sayfa döndürülmüş mü?
                const hasAny = Object.values(this.pageRotations).some(v => v && v % 360 !== 0);
                if (!hasAny){
                    pdfLoader.hide();
                    if (btn) btn.disabled = false;
                    notifications.error('Lütfen en az bir sayfayı döndürün');
                    return;
                }
                // Sadece 0 olmayanları gönder
                const clean = {};
                Object.entries(this.pageRotations).forEach(([k,v]) => {
                    const d = ((v % 360) + 360) % 360;
                    if (d !== 0) clean[k] = d;
                });
                pageRotationsJson = JSON.stringify(clean);
            } else {
                deg = parseInt(document.getElementById('rotateDirection')?.value || '90', 10);
            }

            pdfLoader.updateProgress(50, 'PDF döndürülüyor...');
            const result = await pdfApi.processRotate(sessionId, deg, pageRotationsJson);
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
            <label class="tool-option-label">Döndürme Modu</label>
            <div class="flex flex-col gap-2">
                <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="rotateMode" value="all" checked>
                    <span>Tüm sayfaları döndür</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="rotateMode" value="pages">
                    <span>Sayfa bazlı döndür</span>
                </label>
            </div>
        </div>

        <div id="rotateAllOptions" class="tool-option-group">
            <label class="tool-option-label" for="rotateDirection">Döndürme Açısı</label>
            <select id="rotateDirection" class="form-input">
                <option value="90">Sağa 90°</option>
                <option value="180">180°</option>
                <option value="270">Sola 90°</option>
            </select>
        </div>

        <div id="rotatePagesOptions" class="tool-option-group hidden">
            <label class="tool-option-label">Sayfa Önizlemesi</label>
            <p class="text-sm text-gray-500 mb-2">Her sayfaya tıklayarak 90° döndürebilirsiniz.</p>
            <div id="rotatePreviewGrid" class="pdf-preview-grid-container"></div>
        </div>`;
    }

    _bindModeSwitch(){
        const radios = document.querySelectorAll('input[name="rotateMode"]');
        const allBox = document.getElementById('rotateAllOptions');
        const pagesBox = document.getElementById('rotatePagesOptions');
        radios.forEach(r => {
            r.addEventListener('change', async () => {
                const mode = this._getMode();
                if (mode === 'pages'){
                    allBox?.classList.add('hidden');
                    pagesBox?.classList.remove('hidden');
                    await this._renderPreview();
                } else {
                    pagesBox?.classList.add('hidden');
                    allBox?.classList.remove('hidden');
                }
            });
        });
    }

    async _renderPreview(){
        const container = document.getElementById('rotatePreviewGrid');
        if (!container) return;
        const files = fileHandler.getSelectedFiles();
        if (!files || files.length === 0){
            container.innerHTML = '<p class="text-sm text-red-500">Önce PDF yükleyin.</p>';
            return;
        }
        try {
            container.innerHTML = '<p class="text-sm text-gray-500">Önizleme yükleniyor...</p>';
            this.pageRotations = {};
            const self = this;
            await pdfPreview.renderGrid(container, files, {
                scale: 0.3,
                showPageNumber: true,
                overlayBuilder: (pageData) => {
                    const key = `${pageData.fileIndex}_${pageData.pageNumber}`;
                    self.pageRotations[key] = 0;
                    const controls = document.createElement('div');
                    controls.className = 'pdf-preview-rotate-controls';
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'pdf-preview-rotate-btn';
                    btn.innerHTML = '<i class="fas fa-redo"></i>';
                    btn.title = '90° döndür';
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        pdfPreview.rotatePage(pageData, 90);
                        self.pageRotations[key] = ((self.pageRotations[key] || 0) + 90) % 360;
                    };
                    controls.appendChild(btn);
                    return controls;
                },
                onPageClick: (pageData) => {
                    const key = `${pageData.fileIndex}_${pageData.pageNumber}`;
                    pdfPreview.rotatePage(pageData, 90);
                    self.pageRotations[key] = ((self.pageRotations[key] || 0) + 90) % 360;
                }
            });
        } catch(e){
            console.error('Preview render failed', e);
            container.innerHTML = `<p class="text-sm text-red-500">Önizleme yüklenemedi: ${e.message || e}</p>`;
        }
    }

    mount(){
        setTimeout(() => this._bindModeSwitch(), 100);
    }

    getFunnyQuote(){ return 'PDF döndürme işlemi, sayfalarınızı doğru yönde görüntülemenizi sağlar. Düzenli belgeler için PDFişlemleri.com\'u tercih edin.'; }
    getDescription(){ return 'PDF sayfalarını 90°/180°/270° açılarıyla döndürün; istersek sayfa bazlı seçim de yapabilirsiniz. Birden fazlaysa ZIP olarak indirin.'; }
}

const rotateTool = new RotateTool();
export default rotateTool;
