/**
 * PDF Birleştirme Aracı
 * PDFişlemleri.com
 */

import pdfApi from '../modules/api.js';
import notifications from '../modules/notifications.js';
import pdfLoader from '../modules/loader.js';
import fileHandler from '../modules/fileHandler.js';

class MergeTool {
    constructor() {
        this.toolId = 'merge';
        this.toolName = 'PDF Birleştir';
    }

    /**
     * PDF birleştirme işlemini başlat
     */
    async process() {
        const files = fileHandler.getSelectedFiles();
        
        if (files.length < 2) {
            notifications.error('En az 2 PDF dosyası gereklidir');
            return;
        }

        // Process butonunu devre dışı bırak
        const processButton = document.getElementById('processButton');
        if (processButton) processButton.disabled = true;

        try {
            // Loader'ı başlat
            pdfLoader.show({
                message: `${this.toolName} işleniyor...`,
                subMessage: `${files.length} dosya yükleniyor`
            });

            // Step 1: Dosyaları yükle
            pdfLoader.updateProgress(10, 'Dosyalar sunucuya yükleniyor...');
            const uploadResult = await pdfApi.uploadFilesForMerge(files);
            const sessionId = uploadResult.session_id;

            pdfLoader.updateProgress(50, 'PDF dosyaları birleştiriliyor...');

            // Step 2: Birleştirme seçeneğini al
            const mergeOption = document.querySelector('input[name="mergeOption"]:checked');
            const sortByName = mergeOption && mergeOption.value === 'name';

            // Step 3: Birleştirme işlemini başlat
            const processResult = await pdfApi.processMerge(sessionId, sortByName);

            pdfLoader.updateProgress(90, 'İşlem tamamlanıyor...');
            pdfLoader.updateProgress(100, 'Tamamlandı!');

            // Step 4: Sonucu göster - hızlı başlat
            setTimeout(() => {
                pdfLoader.hide();
                this.showResult(processResult);
            }, 100);

        } catch (error) {
            console.error('Merge process failed:', error);
            pdfLoader.hide();
            notifications.error(error.message || 'İşlem sırasında bir hata oluştu');
            
            if (processButton) processButton.disabled = false;
        }
    }

    /**
     * Birleştirme sonucunu göster
     */
    showResult(result) {
        const resultArea = document.getElementById('resultArea');
        if (!resultArea) return;

        // Otomatik indirme başlat
        const downloadUrl = pdfApi.getDownloadUrl(result.session_id, result.output_file);
        fileHandler.startAutomaticDownload(downloadUrl, result.session_id, result.file_info);

        // Download button'u güncelle - session-aware download
        const downloadBtn = resultArea.querySelector('button');
        if (downloadBtn) {
            downloadBtn.innerHTML = '<i class="fas fa-download mr-2"></i>Tekrar İndir';
            downloadBtn.onclick = () => {
                this.handleRepeatDownload();
            };
        }

        resultArea.classList.remove('hidden');

        // Başarı bildirimi
        if (result.file_info) {
            notifications.success(
                `PDF birleştirme başarılı! ${result.file_info.page_count} sayfa, ${result.file_info.file_size_mb} MB - İndirme başlatıldı!`,
                4000
            );
        } else {
            notifications.success('PDF işlemi başarıyla tamamlandı! İndirme başlatıldı! 🎉', 4000);
        }
    }

    /**
     * Tekrar indirme işlemini handle et
     */
    handleRepeatDownload() {
        const activeSession = fileHandler.activeSession;
        
        if (!activeSession) {
            notifications.error('İndirme linki süresi dolmuş. Lütfen dosyaları tekrar işleyin.');
            return;
        }
        
        // Frontend session süresini kontrol et
        if (!fileHandler.isSessionActive()) {
            notifications.error('İndirme linki süresi dolmuş (5 dakika). Lütfen dosyaları tekrar işleyin.');
            fileHandler.expireSession();
            return;
        }
        
        // Demo session kontrolü
        const isDemoSession = activeSession.sessionId.includes('test_') || activeSession.sessionId.includes('quick_test_');
        
        if (isDemoSession) {
            // Demo session için direkt indirme simülasyonu
            this.handleDemoDownload(activeSession);
            return;
        }
        
        // Gerçek session durumunu backend'den kontrol et
        pdfApi.checkSession(activeSession.sessionId)
            .then(sessionStatus => {
                console.debug('Session status:', sessionStatus);
                
                // Session aktif, indirmeyi başlat
                const downloadLink = document.createElement('a');
                downloadLink.href = activeSession.downloadUrl;
                downloadLink.download = activeSession.fileName;
                downloadLink.style.display = 'none';
                
                // Gizli iframe üzerinden indir (scroll jump olmaz)
                if (window.fileHandler && typeof window.fileHandler.triggerFileDownload === 'function') {
                    window.fileHandler.triggerFileDownload(activeSession.downloadUrl);
                } else {
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                }
                
                const timeRemainingSeconds = fileHandler.getSessionTimeRemaining();
                const timeText = `${timeRemainingSeconds} saniye`;
                
                notifications.success(`Dosya tekrar indiriliyor! Kalan süre: ${timeText} ⏱️`, 3000);
            })
            .catch(error => {
                console.error('Session check failed:', error);
                
                if (error.message.includes('410') || error.message.includes('404')) {
                    notifications.error('İndirme linki süresi dolmuş (5 dakika). Lütfen dosyaları tekrar işleyin.');
                } else {
                    notifications.error('İndirme linki kontrol edilemiyor. Lütfen dosyaları tekrar işleyin.');
                }
                
                // Expired session'ı temizle
                fileHandler.expireSession();
            });
    }
    
    /**
     * Demo session için indirme simülasyonu
     */
    handleDemoDownload(activeSession) {
        console.debug('🎭 Demo download başlatılıyor:', activeSession.sessionId);
        
        notifications.info('Demo indirme başlatılıyor...', 1000);
        
        setTimeout(() => {
            // Demo dosya oluştur
            const demoContent = `PDFişlemleri.com Demo Test
==========================

Session ID: ${activeSession.sessionId}
Dosya Adı: ${activeSession.fileName}
İndirilme Zamanı: ${new Date().toLocaleString('tr-TR')}

Bu bir DEMO indirmedir.
Gerçek PDF birleştirme işlemi yapın!

${activeSession.fileInfo ? `
Demo Bilgiler:
- Sayfa Sayısı: ${activeSession.fileInfo.page_count}
- Dosya Boyutu: ${activeSession.fileInfo.file_size_mb} MB
` : ''}

Kalan süre: ${Math.floor(fileHandler.getSessionTimeRemaining() / 60)} dakika ${fileHandler.getSessionTimeRemaining() % 60} saniye
`;
            
            const blob = new Blob([demoContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = activeSession.fileName.replace('.pdf', '_demo.txt');
            downloadLink.style.display = 'none';
            
            if (window.fileHandler && typeof window.fileHandler.triggerFileDownload === 'function') {
                window.fileHandler.triggerFileDownload(url);
            } else {
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            }
            URL.revokeObjectURL(url);
            
            const timeRemainingMinutes = Math.floor(fileHandler.getSessionTimeRemaining() / 60);
            const timeRemainingSeconds = fileHandler.getSessionTimeRemaining() % 60;
            const timeText = timeRemainingMinutes > 0 ? 
                `${timeRemainingMinutes} dakika ${timeRemainingSeconds} saniye` : 
                `${timeRemainingSeconds} saniye`;
            
            notifications.success(`🎭 Demo dosya tekrar indirildi! Kalan süre: ${timeText} ⏱️`, 3000);
        }, 500);
    }

    /**
     * Araç seçeneklerini al
     */
    getOptions() {
        return `
            <div class="mb-4">
                <label class="block text-gray-700 font-medium mb-2">Birleştirme Seçenekleri</label>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="radio" name="mergeOption" value="order" checked class="mr-2">
                        <span>Yükleme sırasına göre birleştir</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="mergeOption" value="name" class="mr-2">
                        <span>Dosya adına göre alfabetik olarak birleştir</span>
                    </label>
                </div>
            </div>
        `;
    }

    /**
     * Komik alıntı
     */
    getFunnyQuote() {
        return "İki PDF bir araya gelince, ne olur? Mutlu bir aile! Biz sadece evlilik danışmanlığı yapıyoruz.";
    }

    /**
     * Araç açıklaması
     */
    getDescription() {
        return "Birden fazla PDF dosyasını tek bir belgede birleştirin. Dosyalarınızı aşağıya yükleyin, onları göründükleri sırada birleştirelim. Ayrılıklar acıtır, birleşmeler mutluluk!";
    }
}

// Singleton instance
const mergeTool = new MergeTool();

export default mergeTool;
