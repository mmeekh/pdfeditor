/**
 * PDF OCR Aracı
 * PDFişlemleri.com
 */

import pdfApi from '../modules/api.js';
import notifications from '../modules/notifications.js';
import pdfLoader from '../modules/loader.js';
import fileHandler from '../modules/fileHandler.js';

class PDFOCRTool {
    constructor() {
        this.toolId = 'pdf-ocr';
        this.toolName = 'PDF OCR';
        this.supportedLanguages = ['tur+eng', 'eng', 'tur', 'deu', 'fra', 'spa', 'ita'];
        this.currentLanguage = 'tur+eng';
        this.currentDpi = 300;
        this.includeCoordinates = false;
    }

    /**
     * PDF OCR işlemini başlat
     */
    async process() {
        const files = fileHandler.getSelectedFiles();
        
        if (files.length === 0) {
            notifications.error('Lütfen en az 1 PDF dosyası yükleyin');
            return;
        }
        if (files.length > fileHandler.MAX_FILES) {
            notifications.error(`Maksimum ${fileHandler.MAX_FILES} dosya`);
            return;
        }

        // Process butonunu devre dışı bırak
        const processButton = document.getElementById('processButton');
        if (processButton) processButton.disabled = true;

        try {
            // Loader'ı başlat
            pdfLoader.show({
                message: `${this.toolName} işleniyor...`,
                subMessage: `${files.length} dosya OCR ile işleniyor`
            });

            // Step 1: Dosyaları yükle
            pdfLoader.updateProgress(10, 'Dosyalar sunucuya yükleniyor...');
            const uploadResult = await pdfApi.uploadFilesForPdfOcr(files);
            const sessionId = uploadResult.session_id;

            pdfLoader.updateProgress(30, 'PDF dosyaları görüntülere dönüştürülüyor...');

            // Step 2: OCR seçeneklerini al
            const language = this.getSelectedLanguage();
            const dpi = this.getSelectedDpi();
            const includeCoordinates = this.getIncludeCoordinates();

            pdfLoader.updateProgress(50, 'OCR işlemi başlatılıyor...');

            // Step 3: OCR işlemini başlat
            const processResult = await pdfApi.processPdfOcr(sessionId, language, dpi, includeCoordinates);

            pdfLoader.updateProgress(90, 'Sonuçlar hazırlanıyor...');
            pdfLoader.updateProgress(100, 'Tamamlandı!');

            // Step 4: Sonucu göster
            setTimeout(() => {
                pdfLoader.hide();
                this.showResult(processResult);
            }, 100);

        } catch (error) {
            console.error('PDF OCR process failed:', error);
            pdfLoader.hide();
            notifications.error(error.message || 'OCR işlemi sırasında bir hata oluştu');
            
            if (processButton) processButton.disabled = false;
        }
    }

    /**
     * OCR sonucunu göster
     */
    showResult(result) {
        const resultArea = document.getElementById('resultArea');
        if (!resultArea) return;

        // Otomatik indirme başlat
        if (result.download_url) {
            fileHandler.startAutomaticDownload(result.download_url, result.session_id, {
                page_count: result.summary.total_pages,
                file_size_mb: result.summary.successful_pages
            });
        }

        // Download button'u güncelle
        const downloadBtn = resultArea.querySelector('button');
        if (downloadBtn) {
            downloadBtn.innerHTML = '<i class="fas fa-download mr-2"></i>Sonuçları İndir';
            downloadBtn.onclick = () => {
                this.handleDownload(result);
            };
        }

        resultArea.classList.remove('hidden');

        // Başarı bildirimi
        const successCount = result.summary.successful_files;
        const totalCount = result.summary.total_files;
        const pageCount = result.summary.successful_pages;
        
        if (successCount > 0) {
            notifications.success(
                `OCR işlemi başarılı! ${successCount}/${totalCount} dosya, ${pageCount} sayfa işlendi - İndirme başlatıldı!`,
                4000
            );
        } else {
            notifications.error('OCR işlemi başarısız oldu');
        }
    }

    /**
     * İndirme işlemini handle et
     */
    handleDownload(result) {
        if (!result.download_url) {
            notifications.error('İndirme linki bulunamadı');
            return;
        }

        const downloadLink = document.createElement('a');
        downloadLink.href = result.download_url;
        downloadLink.download = 'ocr_results.txt';
        downloadLink.style.display = 'none';
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        notifications.success('OCR sonuçları indiriliyor! 📄', 3000);
    }

    /**
     * Seçili dili al
     */
    getSelectedLanguage() {
        const languageSelect = document.getElementById('ocrLanguage');
        return languageSelect ? languageSelect.value : this.currentLanguage;
    }

    /**
     * Seçili DPI değerini al
     */
    getSelectedDpi() {
        const dpiSelect = document.getElementById('ocrDpi');
        return dpiSelect ? parseInt(dpiSelect.value) : this.currentDpi;
    }

    /**
     * Koordinat dahil etme seçeneğini al
     */
    getIncludeCoordinates() {
        const coordinatesCheckbox = document.getElementById('includeCoordinates');
        return coordinatesCheckbox ? coordinatesCheckbox.checked : this.includeCoordinates;
    }

    /**
     * Araç seçeneklerini al
     */
    getOptions() {
        return `
            <div class="mb-4">
                <label class="block text-gray-700 font-medium mb-2">OCR Ayarları</label>
                
                <!-- Dil Seçimi -->
                <div class="mb-3">
                    <label class="block text-sm text-gray-600 mb-1">Dil</label>
                    <select id="ocrLanguage" class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="tur+eng">Türkçe + İngilizce (önerilen)</option>
                        <option value="tur">Türkçe</option>
                        <option value="eng">İngilizce</option>
                        <option value="deu">Almanca</option>
                        <option value="fra">Fransızca</option>
                        <option value="spa">İspanyolca</option>
                        <option value="ita">İtalyanca</option>
                        <option value="por">Portekizce</option>
                        <option value="rus">Rusça</option>
                        <option value="nld">Hollandaca</option>
                        <option value="pol">Lehçe</option>
                        <option value="swe">İsveççe</option>
                        <option value="dan">Danimarkaca</option>
                        <option value="fin">Fince</option>
                        <option value="nor">Norveççe</option>
                        <option value="ces">Çekçe</option>
                        <option value="ell">Yunanca</option>
                        <option value="ara">Arapça</option>
                        <option value="heb">İbranice</option>
                        <option value="chi_sim">Çince (Basitleştirilmiş)</option>
                        <option value="jpn">Japonca</option>
                        <option value="kor">Korece</option>
                        <option value="hin">Hintçe</option>
                    </select>
                </div>

                <!-- DPI Seçimi -->
                <div class="mb-3">
                    <label class="block text-sm text-gray-600 mb-1">Çözünürlük (DPI)</label>
                    <select id="ocrDpi" class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="150">150 DPI (Hızlı, düşük kalite)</option>
                        <option value="300" selected>300 DPI (Dengeli, önerilen)</option>
                        <option value="450">450 DPI (Yüksek kalite, yavaş)</option>
                        <option value="600">600 DPI (Maksimum kalite, çok yavaş)</option>
                    </select>
                </div>

                <!-- Koordinat Seçeneği -->
                <div class="mb-3">
                    <label class="flex items-center">
                        <input type="checkbox" id="includeCoordinates" class="mr-2">
                        <span class="text-sm text-gray-600">Koordinat bilgilerini dahil et (gelişmiş)</span>
                    </label>
                </div>

                <!-- Bilgi Kutusu -->
                <div class="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <i class="fas fa-info-circle text-blue-400"></i>
                        </div>
                        <div class="ml-3">
                            <h3 class="text-sm font-medium text-blue-800">OCR Hakkında</h3>
                            <div class="mt-1 text-sm text-blue-700">
                                <ul class="list-disc list-inside space-y-1">
                                    <li>Yüksek DPI değerleri daha iyi sonuç verir ama işlem süresi uzar</li>
                                    <li>Koordinat bilgileri metin konumlarını gösterir</li>
                                    <li>Birden fazla dil seçerek daha iyi tanıma elde edebilirsiniz</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Komik alıntı
     */
    getFunnyQuote() {
        return "PDF OCR işlemi, görüntülerdeki metinleri okuyup düzenlenebilir hale getirir. Dijital arşivinizi arama yapılabilir hale getirin!";
    }

    /**
     * Araç açıklaması
     */
    getDescription() {
        return "PDF dosyalarınızdaki metinleri çıkarın ve düzenlenebilir hale getirin. OCR teknolojisi ile taranmış belgelerinizi arama yapılabilir hale getirin. Hızlı, güvenli ve profesyonel sonuçlar için PDFişlemleri.com'u tercih edin.";
    }

    /**
     * Desteklenen dilleri yükle
     */
    async loadSupportedLanguages() {
        try {
            const response = await pdfApi.getSupportedOcrLanguages();
            if (response && response.languages) {
                this.supportedLanguages = response.languages;
                this.updateLanguageOptions();
            }
        } catch (error) {
            console.warn('Desteklenen diller yüklenemedi:', error);
        }
    }

    /**
     * Dil seçeneklerini güncelle
     */
    updateLanguageOptions() {
        const languageSelect = document.getElementById('ocrLanguage');
        if (!languageSelect) return;

        // Mevcut seçimi koru
        const currentValue = languageSelect.value;
        
        // Seçenekleri temizle
        languageSelect.innerHTML = '';

        // Yeni seçenekleri ekle
        const languageNames = {
            'tur+eng': 'Türkçe + İngilizce',
            'tur': 'Türkçe',
            'eng': 'İngilizce',
            'deu': 'Almanca',
            'fra': 'Fransızca',
            'spa': 'İspanyolca',
            'ita': 'İtalyanca',
            'por': 'Portekizce',
            'rus': 'Rusça',
            'nld': 'Hollandaca',
            'pol': 'Lehçe',
            'swe': 'İsveççe',
            'dan': 'Danimarkaca',
            'fin': 'Fince',
            'nor': 'Norveççe',
            'ces': 'Çekçe',
            'ell': 'Yunanca',
            'ara': 'Arapça',
            'heb': 'İbranice',
            'chi_sim': 'Çince (Basitleştirilmiş)',
            'jpn': 'Japonca',
            'kor': 'Korece',
            'hin': 'Hintçe'
        };

        for (const lang of this.supportedLanguages) {
            const option = document.createElement('option');
            option.value = lang;
            option.textContent = languageNames[lang] || lang;
            if (lang === currentValue) {
                option.selected = true;
            }
            languageSelect.appendChild(option);
        }
    }

    /**
     * Tool mount edildiğinde çağrılır
     */
    mount() {
        this.loadSupportedLanguages();
    }
}

// Singleton instance
const pdfOcrTool = new PDFOCRTool();

export default pdfOcrTool;
