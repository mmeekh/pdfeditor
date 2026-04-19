import pdfApi from '../modules/api.js';
import notifications from '../modules/notifications.js';
import pdfLoader from '../modules/loader.js';
import fileHandler from '../modules/fileHandler.js';

// PDF.js CDN import will be done dynamically
let pdfjsLib = null;

class OrganizeTool {
    constructor() {
        this.toolId = 'organize';
        this.toolName = 'PDF Sırala';
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
                pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs');
                                // PDF.js requires a separate worker file; specify its location when loaded dynamically
                if (pdfjsLib?.GlobalWorkerOptions) {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.mjs';
                }
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

                    // Canvas wrap — tıklama için
                    const canvasWrap = document.createElement('div');
                    canvasWrap.className = 'page-thumb-canvas';
                    canvasWrap.appendChild(canvas);
                    canvasWrap.onclick = (e) => {
                        e.stopPropagation();
                        this.openPreviewModal(file, pageNum, files.length > 1 ? file.name : null);
                    };
                    wrapper.appendChild(canvasWrap);

                    // Sıralama numarası (alt orta)
                    const orderBadge = document.createElement('div');
                    orderBadge.className = 'page-order-badge';
                    orderBadge.textContent = '1'; // updatePageOrder içinde güncellenecek
                    wrapper.appendChild(orderBadge);

                    const del = document.createElement('button');
                    del.className = 'delete-page';
                    del.innerHTML = '&times;';
                    del.onclick = (e) => { e.stopPropagation(); wrapper.remove(); this.updatePageOrder(); };
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
        const thumbs = Array.from(container.querySelectorAll('.page-thumb'));
        // Her thumb'ın alt-orta badge'ini (1,2,3,...) güncelle
        thumbs.forEach((el, i) => {
            const badge = el.querySelector('.page-order-badge');
            if (badge) badge.textContent = String(i + 1);
        });
        this.pageOrder = thumbs.map(el => ({
            file_index: Number(el.dataset.fileIndex),
            page_number: Number(el.dataset.pageNumber)
        }));
    }

    /**
     * Sayfayı büyük modal'da göster (yüksek çözünürlük)
     */
    async openPreviewModal(file, pageNum, fileName) {
        // Mevcut modal varsa kaldır
        const old = document.getElementById('pdfPagePreviewModal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'pdfPagePreviewModal';
        modal.className = 'fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm';
        modal.innerHTML = `
            <button class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition" onclick="document.getElementById('pdfPagePreviewModal').remove()" aria-label="Kapat">
                <i class="fas fa-times text-xl"></i>
            </button>
            <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto p-4">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-lg font-bold text-gray-900">
                        ${fileName ? `${fileName} • ` : ''}Sayfa ${pageNum}
                    </h3>
                    <span class="text-sm text-gray-500"><i class="fas fa-search-plus mr-1"></i> Büyük önizleme</span>
                </div>
                <div id="pdfPagePreviewCanvasWrap" class="flex justify-center bg-gray-100 rounded-xl p-4">
                    <div class="text-gray-400"><i class="fas fa-spinner fa-spin text-3xl"></i></div>
                </div>
            </div>
        `;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        document.body.appendChild(modal);

        try {
            await this.ensurePdfJs();
            const buf = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.className = 'max-w-full h-auto shadow-lg rounded';
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            const wrap = document.getElementById('pdfPagePreviewCanvasWrap');
            if (wrap) {
                wrap.innerHTML = '';
                wrap.appendChild(canvas);
            }
        } catch (err) {
            console.error('Modal preview hata:', err);
            const wrap = document.getElementById('pdfPagePreviewCanvasWrap');
            if (wrap) wrap.innerHTML = '<p class="text-red-500">Önizleme yüklenemedi</p>';
        }

        // Escape ile kapat
        const handler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handler);
            }
        };
        document.addEventListener('keydown', handler);
    }

    async process() {
        const files = fileHandler.getSelectedFiles();
        if (files.length === 0) { notifications.error('Lütfen PDF dosyaları ekleyin'); return; }
        if (files.length > fileHandler.MAX_FILES) { notifications.error(`Maksimum ${fileHandler.MAX_FILES} dosya`); return; }
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

    getFunnyQuote() { return 'PDF düzenleme işlemi, sayfalarınızı istediğiniz sırada organize eder. Düzenli belgeler için PDFişlemleri.com\'u tercih edin.'; }

    getDescription() { return 'PDF sayfalarını sürükle-bırak ile yeniden sıralayın veya silin.'; }
}

const organizeTool = new OrganizeTool();
export default organizeTool;
