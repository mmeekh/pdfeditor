/**
 * PDF Ayırma Aracı
 */

import pdfApi from '../modules/api.js';
import notifications from '../modules/notifications.js';
import pdfLoader from '../modules/loader.js';
import fileHandler from '../modules/fileHandler.js';

class SplitTool {
    constructor() {
        this.toolId = 'split';
        this.toolName = 'PDF Ayır';
    }

    async process() {
        const files = fileHandler.getSelectedFiles();
        if (files.length !== 1) {
            notifications.error('Lütfen sadece 1 PDF yükleyin');
            return;
        }

        const processButton = document.getElementById('processButton');
        if (processButton) processButton.disabled = true;

        try {
            pdfLoader.show({ message: `${this.toolName} işleniyor...`, subMessage: `Dosya yükleniyor` });

            // Upload
            const upload = await pdfApi.uploadFileForSplit(files[0]);
            const sessionId = upload.session_id;

            // Options
            const mode = document.querySelector('input[name="splitMode"]:checked')?.value || 'ranges';
            const pages = (document.getElementById('pagesInput')?.value || '').trim();
            let everyNVal = document.getElementById('everyNInput')?.value;
            let everyN = Number.parseInt((everyNVal || '').trim(), 10);
            if (!Number.isFinite(everyN) || everyN < 1) {
                everyN = 1; // minimum 1
            }

            pdfLoader.updateProgress(50, 'PDF ayırma işlemi başlatılıyor...');

            if (mode === 'every_n') {
                const raw = (document.getElementById('everyNInput')?.value || '').trim();
                if (!raw || !Number.isFinite(everyN) || everyN < 1) {
                    notifications.error('Lütfen N değeri girin (1 veya daha büyük).');
                    if (processButton) processButton.disabled = false;
                    pdfLoader.hide();
                    return;
                }
            }

            const payload = mode === 'every_n' ? { every_n: everyN } : { pages };
            const result = await pdfApi.processSplit(sessionId, mode, payload);

            pdfLoader.updateProgress(100, 'Tamamlandı!');
            setTimeout(() => {
                pdfLoader.hide();
                this.showResult(result);
            }, 200);
        } catch (e) {
            console.error('Split error', e);
            notifications.error(e.message || 'PDF ayırma sırasında hata oluştu');
            pdfLoader.hide();
            if (processButton) processButton.disabled = false;
        }
    }

    showResult(result) {
        const resultArea = document.getElementById('resultArea');
        if (!resultArea) return;

        // Zip varsa otomatik indir
        if (result.zip_file) {
            const url = pdfApi.getSplitZipUrl(result.session_id, result.zip_file);
            fileHandler.triggerFileDownload(url);
        }

        const downloadBtn = resultArea.querySelector('button');
        if (downloadBtn && result.zip_file) {
            downloadBtn.innerHTML = '<i class="fa-solid fa-download mr-2"></i>Tekrar İndir';
            downloadBtn.onclick = () => {
                const url = pdfApi.getSplitZipUrl(result.session_id, result.zip_file);
                fileHandler.triggerFileDownload(url);
            };
        }

        resultArea.classList.remove('hidden');
        notifications.success('PDF ayırma tamamlandı! İndirme başlatıldı.');
    }

    getOptions() {
        return `
            <div class="tool-option-group">
                <label class="tool-option-label">Ayırma Modu</label>
                <div class="flex gap-4 items-center">
                    <label class="flex items-center gap-2">
                        <input type="radio" name="splitMode" value="ranges" checked>
                        <span>Belirli sayfalar: <code>1-3,5,8-10</code></span>
                    </label>
                    <label class="flex items-center gap-2">
                        <input type="radio" name="splitMode" value="every_n">
                        <span>Her N sayfada böl</span>
                    </label>
                </div>
            </div>

            <div class="tool-option-group" id="rangesGroup">
                <label class="tool-option-label" for="pagesInput">Sayfalar</label>
                <input id="pagesInput" class="form-input" placeholder="Örn: 1-3,5,8-10">
            </div>

            <div class="tool-option-group hidden" id="everyNGroup">
                <label class="tool-option-label" for="everyNInput">Aralık (N)</label>
                <input id="everyNInput" type="number" min="1" step="1" class="form-input" placeholder="Örn: 3">
            </div>
        `;
    }

    // UI mount: bind mode toggles and set defaults
    mount() {
        const applyMode = () => {
            const mode = document.querySelector('input[name="splitMode"]:checked')?.value || 'ranges';
            const ranges = document.getElementById('rangesGroup');
            const every = document.getElementById('everyNGroup');
            if (mode === 'every_n') {
                ranges?.classList.add('hidden');
                every?.classList.remove('hidden');
                const input = document.getElementById('everyNInput');
                if (input && !input.value) input.value = '2';
            } else {
                ranges?.classList.remove('hidden');
                every?.classList.add('hidden');
            }
        };
        const radios = document.querySelectorAll('input[name="splitMode"]');
        radios.forEach(r => r.addEventListener('change', applyMode));
        // initial
        applyMode();
    }

    getFunnyQuote() { return 'PDF’ini böl, hayatını bölme!'; }
    getDescription() { return 'Bir PDF’i belirli sayfalara veya her N sayfada bir parçaya ayırın.'; }
}

const splitTool = new SplitTool();
export default splitTool;


