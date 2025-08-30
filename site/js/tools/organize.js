import pdfApi from '../modules/api.js';
import notifications from '../modules/notifications.js';
import pdfLoader from '../modules/loader.js';
import fileHandler from '../modules/fileHandler.js';

// PDF.js CDN import will be done dynamically
let pdfjsLib = null;

class OrganizeTool {
    constructor() {
        this.toolId = 'organize';
        this.toolName = 'PDF Düzenle';
        this.pageOrder = [];
    }

    mount() {
        document.addEventListener('filesUpdated', (e) => this.renderPreviews(e.detail.files));
        // İlk yüklenen dosyalar varsa render et
        this.renderPreviews(fileHandler.getSelectedFiles());
    }

    async ensurePdfJs() {
        if (!pdfjsLib) {
            try {
                const cdnBase = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67';
                pdfjsLib = await import(`${cdnBase}/pdf.min.mjs`);
                pdfjsLib.GlobalWorkerOptions.workerSrc = `${cdnBase}/pdf.worker.min.mjs`;
            } catch (err) {
                notifications.error('PDF önizleme için gerekli kütüphane yüklenemedi');
                throw err;
            }
        }
    }

    async renderPreviews(files) {
        const container = document.getElementById('organizePreview');
        if (!container) return;
        container.innerHTML = '';
        this.pageOrder = [];
        if (!files || files.length === 0) return;

        await this.ensurePdfJs();

        for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
            const file = files[fileIndex];
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const viewport = page.getViewport({ scale: 0.2 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

                    const wrapper = document.createElement('div');
                    wrapper.className = 'page-thumb';
                    wrapper.draggable = true;
                    wrapper.dataset.fileIndex = String(fileIndex);
                    wrapper.dataset.pageNumber = String(pageNum);
                    wrapper.appendChild(canvas);

                    const del = document.createElement('button');
                    del.className = 'delete-page';
                    del.innerHTML = '&times;';
                    del.onclick = () => { wrapper.remove(); this.updatePageOrder(); };
                    wrapper.appendChild(del);

                    container.appendChild(wrapper);
                }
            } catch (err) {
                console.error('Preview oluşturma hatası', err);
            }
        }
        this.enableDragSort(container);
        this.updatePageOrder();
    }

    enableDragSort(container) {
        let dragging = null;
        container.querySelectorAll('.page-thumb').forEach((el) => {
            el.addEventListener('dragstart', (e) => {
                dragging = el;
                el.classList.add('dragging');
            });
            el.addEventListener('dragover', (e) => {
                e.preventDefault();
                const target = e.currentTarget;
                if (!dragging || target === dragging) return;
                const rect = target.getBoundingClientRect();
                const next = (e.clientY - rect.top) > rect.height / 2;
                container.insertBefore(dragging, next ? target.nextSibling : target);
            });
            el.addEventListener('dragend', () => {
                if (dragging) dragging.classList.remove('dragging');
                dragging = null;
                this.updatePageOrder();
            });
        });
    }

    updatePageOrder() {
        const container = document.getElementById('organizePreview');
        if (!container) return;
        this.pageOrder = Array.from(container.querySelectorAll('.page-thumb')).map(el => ({
            file_index: Number(el.dataset.fileIndex),
            page_number: Number(el.dataset.pageNumber)
        }));
    }

    async process() {
        const files = fileHandler.getSelectedFiles();
        if (files.length === 0) { notifications.error('Lütfen PDF dosyaları ekleyin'); return; }
        if (!this.pageOrder.length) { notifications.error('Hiç sayfa seçilmedi'); return; }

        const processButton = document.getElementById('processButton');
        if (processButton) processButton.disabled = true;

        try {
            pdfLoader.show({ message: `${this.toolName} işleniyor...`, subMessage: `${files.length} dosya yükleniyor` });
            pdfLoader.updateProgress(10, 'Dosyalar sunucuya yükleniyor...');
            const uploadRes = await pdfApi.uploadFilesForOrganize(files);
            const sessionId = uploadRes.session_id;
            pdfLoader.updateProgress(50, 'Sayfalar düzenleniyor...');
            const result = await pdfApi.processOrganize(sessionId, this.pageOrder);
            pdfLoader.updateProgress(100, 'Tamamlandı!');
            setTimeout(() => { pdfLoader.hide(); this.showResult(result); }, 150);
        } catch (err) {
            console.error('Organize process failed', err);
            pdfLoader.hide();
            notifications.error(err.message || 'İşlem sırasında hata oluştu');
            if (processButton) processButton.disabled = false;
        }
    }

    showResult(result) {
        const resultArea = document.getElementById('resultArea');
        if (!resultArea) return;
        const url = pdfApi.getOrganizeDownloadUrl(result.session_id, result.output_file);
        fileHandler.triggerFileDownload(url);
        const downloadBtn = resultArea.querySelector('button');
        if (downloadBtn) {
            downloadBtn.innerHTML = '<i class="fas fa-download mr-2"></i>Tekrar İndir';
            downloadBtn.onclick = () => fileHandler.triggerFileDownload(url);
        }
        resultArea.classList.remove('hidden');
        notifications.success('PDF başarıyla düzenlendi!');
    }

    getOptions() {
        return '<div id="organizePreview" class="organize-preview"></div>';
    }

    getFunnyQuote() { return 'Sayfalarınızı tokat gibi hizaya getirin!'; }

    getDescription() { return 'PDF sayfalarını sürükle-bırak ile yeniden sıralayın veya silin.'; }
}

const organizeTool = new OrganizeTool();
export default organizeTool;
