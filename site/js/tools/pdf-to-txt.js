/**
 * PDF/Word'den TXT'ye Dönüştürme Aracı
 * PDFişlemleri.com
 */

import pdfApi from '../modules/api.js';
import notifications from '../modules/notifications.js';
import pdfLoader from '../modules/loader.js';
import fileHandler from '../modules/fileHandler.js';

class PdfToTxtTool {
    constructor() {
        this.toolId = 'pdf-to-txt';
        this.toolName = "PDF/Word'den TXT'ye";
    }

    /**
     * PDF/Word'den TXT'ye dönüştürme işlemini başlat
     */
    async process() {
        const files = fileHandler.getSelectedFiles();
        if (files.length === 0) { 
            notifications.error('Lütfen en az bir PDF veya Word dosyası seçin'); 
            return; 
        }

        // Dosya tiplerini kontrol et
        const validFiles = files.filter(file => {
            const ext = file.name.toLowerCase().split('.').pop();
            return ['pdf', 'doc', 'docx'].includes(ext);
        });

        if (validFiles.length === 0) {
            notifications.error('Sadece PDF ve Word dosyaları kabul edilir');
            return;
        }

        if (validFiles.length !== files.length) {
            notifications.warning(`${files.length - validFiles.length} geçersiz dosya atlandı`);
        }

        const btn = document.getElementById('processButton');
        if (btn) btn.disabled = true;

        try {
            const fileCount = validFiles.length;
            const message = fileCount > 1 ? 
                `${fileCount} dosya TXT'ye dönüştürülüyor...` : 
                `${this.toolName} işleniyor...`;
            
            pdfLoader.show({ 
                message: message, 
                subMessage: `Dosyalar yükleniyor` 
            });

            // Step 1: Dosyaları yükle
            pdfLoader.updateProgress(20, 'Dosyalar sunucuya yükleniyor...');
            const uploadResult = await pdfApi.uploadFilesForPdfToTxt(validFiles);
            const sessionId = uploadResult.session_id;

            // Step 2: Dönüştürme işlemini başlat
            pdfLoader.updateProgress(50, 'TXT dönüştürme başlatılıyor...');
            const result = await pdfApi.processPdfToTxt(sessionId);

            // Step 3: Tamamlandı
            pdfLoader.updateProgress(100, 'Tamamlandı!');
            setTimeout(() => { 
                pdfLoader.hide(); 
                this.showResult(result); 
            }, 150);

        } catch (e) {
            console.error('PDF/Word→TXT failed', e);
            notifications.error(e.message || 'Dönüştürme sırasında hata oluştu');
            pdfLoader.hide();
            if (btn) btn.disabled = false;
        }
    }

    /**
     * Sonuçları göster ve indirme linkini oluştur
     */
    showResult(result) {
        const resultArea = document.getElementById('resultArea');
        if (!resultArea) return;

        // İndirme URL'sini oluştur
        const downloadUrl = pdfApi.getPdfToTxtDownloadUrl(result.session_id, result.output_file);
        
        // Otomatik indirme başlat
        fileHandler.triggerFileDownload(downloadUrl);

        // Sonuç bilgilerini göster
        const resultInfo = document.createElement('div');
        resultInfo.className = 'result-info';
        resultInfo.innerHTML = `
            <div class="success-message">
                <i class="fas fa-check-circle text-green-500"></i>
                <span>Dönüştürme başarıyla tamamlandı!</span>
            </div>
            <div class="file-info">
                <p><strong>Dosya Sayısı:</strong> ${result.file_count}</p>
                <p><strong>Çıktı Formatı:</strong> ${result.is_zip ? 'ZIP (Birden fazla TXT)' : 'TXT'}</p>
                <p><strong>Dosya Adı:</strong> ${result.output_file}</p>
            </div>
            <div class="download-section">
                <button onclick="fileHandler.triggerFileDownload('${downloadUrl}')" 
                        class="download-btn">
                    <i class="fas fa-download"></i>
                    ${result.is_zip ? 'ZIP İndir' : 'TXT İndir'}
                </button>
            </div>
        `;

        // Eski sonuçları temizle ve yenisini ekle
        resultArea.innerHTML = '';
        resultArea.appendChild(resultInfo);

        // Başarı bildirimi
        notifications.success(`${result.file_count} dosya başarıyla TXT'ye dönüştürüldü!`);

        // Process butonunu tekrar aktif et
        const processButton = document.getElementById('processButton');
        if (processButton) processButton.disabled = false;
    }

    /**
     * Tool'u kapat ve temizle
     */
    close() {
        const resultArea = document.getElementById('resultArea');
        if (resultArea) {
            resultArea.innerHTML = '';
        }
        
        // Process butonunu aktif et
        const processButton = document.getElementById('processButton');
        if (processButton) processButton.disabled = false;
    }
}

// Singleton instance
const pdfToTxtTool = new PdfToTxtTool();

export default pdfToTxtTool;
