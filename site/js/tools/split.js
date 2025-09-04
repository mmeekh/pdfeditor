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
        if (files.length === 0) {
            notifications.error('Lütfen en az bir PDF dosyası seçin');
            return;
        }

        const processButton = document.getElementById('processButton');
        if (processButton) processButton.disabled = true;

        try {
            const fileCount = files.length;
            const message = fileCount > 1 ? 
                `${fileCount} PDF dosyası ayırılıyor...` : 
                `${this.toolName} işleniyor...`;
            
            pdfLoader.show({ message: message, subMessage: `Dosyalar yükleniyor` });

            // Upload
            const upload = await pdfApi.uploadFilesForSplit(files);
            const sessionId = upload.session_id;

            // Options
            const mode = document.querySelector('input[name="splitMode"]:checked')?.value || 'ranges';
            const pages = (document.getElementById('pagesInput')?.value || '').trim();
            let everyNVal = document.getElementById('everyNInput')?.value;
            let everyN = Number.parseInt((everyNVal || '').trim(), 10);
            if (!Number.isFinite(everyN) || everyN < 1) {
                everyN = 1; // minimum 1
            }

            // Sayfa aralığı validasyonu
            if (mode === 'ranges' && pages) {
                // Geçersiz karakterleri kontrol et
                if (pages.includes(':') || /[^0-9,\-\s]/.test(pages)) {
                    notifications.error('Geçersiz sayfa formatı. Örnek: 1-3,5,8-10');
                    if (processButton) processButton.disabled = false;
                    pdfLoader.hide();
                    return;
                }
                
                // Sayfa aralığı formatını kontrol et
                const pagePattern = /^(\d+(-\d+)?)(,\d+(-\d+)?)*$/;
                if (!pagePattern.test(pages.replace(/\s/g, ''))) {
                    notifications.error('Geçersiz sayfa formatı. Örnek: 1-3,5,8-10');
                    if (processButton) processButton.disabled = false;
                    pdfLoader.hide();
                    return;
                }
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
            const buttonText = result.is_zip ? 
                '<i class="fas fa-download mr-2"></i>ZIP İndir' : 
                '<i class="fas fa-download mr-2"></i>Tekrar İndir';
            downloadBtn.innerHTML = buttonText;
            downloadBtn.onclick = () => {
                const url = pdfApi.getSplitZipUrl(result.session_id, result.zip_file);
                fileHandler.triggerFileDownload(url);
            };
        }

        resultArea.classList.remove('hidden');
        
        let successMessage;
        if (result.mode === "combined_ranges") {
            successMessage = `${result.file_count} PDF dosyası birleştirildi! Toplam ${result.total_pages} sayfadan ${result.total_outputs} parça oluşturuldu. ZIP dosyası indiriliyor.`;
        } else if (result.is_zip) {
            successMessage = `${result.file_count} PDF dosyası ayırıldı! Toplam ${result.total_outputs} parça oluşturuldu. ZIP dosyası indiriliyor.`;
        } else {
            successMessage = 'PDF ayırma tamamlandı! İndirme başlatıldı.';
        }
        notifications.success(successMessage);
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
                <div class="text-sm text-gray-600 mt-1">
                    <strong>💡 Çoklu PDF İpucu:</strong> Birden fazla PDF seçerseniz, tüm PDF'ler birleştirilir ve toplam sayfa numaralarına göre işlenir. 
                    Örn: 2 PDF (5+5 sayfa) → "3-8" yazarsanız 3. sayfadan 8. sayfaya kadar alınır.
                </div>
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


