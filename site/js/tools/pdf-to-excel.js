/**
 * PDF'den Excel'e Dönüştürme Aracı
 * PDFişlemleri.com
 */

import pdfApi from '../modules/api.js';
import notifications from '../modules/notifications.js';
import pdfLoader from '../modules/loader.js';
import fileHandler from '../modules/fileHandler.js';

class PdfToExcelTool {
    constructor() {
        this.toolId = 'pdf-to-excel';
        this.toolName = 'PDF\'den Excel\'e';
    }

    /**
     * PDF'den Excel'e dönüştürme işlemini başlat
     */
    async process() {
        const files = fileHandler.getSelectedFiles();
        
        if (files.length < 1) {
            notifications.error('En az 1 PDF dosyası gereklidir');
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
            const uploadResult = await pdfApi.uploadFilesForPdfToExcel(files);
            const sessionId = uploadResult.session_id;

            pdfLoader.updateProgress(50, 'PDF tabloları çıkarılıyor...');

            // Step 2: Dönüştürme seçeneklerini al
            const pagesOption = document.querySelector('input[name="pagesOption"]:checked');
            const pages = pagesOption ? pagesOption.value : 'all';
            
            const passwordInput = document.querySelector('input[name="password"]');
            const password = passwordInput ? passwordInput.value : null;
            
            const mergeParagraphsInput = document.querySelector('input[name="mergeParagraphs"]');
            const mergeParagraphs = mergeParagraphsInput ? mergeParagraphsInput.checked : true;
            
            const minParagraphLinesInput = document.querySelector('input[name="minParagraphLines"]');
            const minParagraphLines = minParagraphLinesInput ? parseInt(minParagraphLinesInput.value) : 5;
            
            const detectionMethodInput = document.querySelector('input[name="detectionMethod"]:checked');
            const detectionMethod = detectionMethodInput ? detectionMethodInput.value : 'auto';

            // Step 3: Dönüştürme işlemini başlat
            const processResult = await pdfApi.processPdfToExcel(sessionId, pages, password, mergeParagraphs, minParagraphLines, detectionMethod);

            pdfLoader.updateProgress(90, 'Excel dosyası oluşturuluyor...');
            pdfLoader.updateProgress(100, 'Tamamlandı!');

            // Step 4: Sonucu göster - hızlı başlat
            setTimeout(() => {
                pdfLoader.hide();
                this.showResult(processResult);
            }, 100);

        } catch (error) {
            console.error('PDF to Excel process failed:', error);
            pdfLoader.hide();
            notifications.error(error.message || 'İşlem sırasında bir hata oluştu');
            
            if (processButton) processButton.disabled = false;
        }
    }

    /**
     * Dönüştürme sonucunu göster
     */
    showResult(result) {
        const resultArea = document.getElementById('resultArea');
        if (!resultArea) return;

        // Otomatik indirme başlat
        const downloadUrl = pdfApi.getPdfToExcelDownloadUrl(result.session_id, result.output_file);
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
                `PDF'den Excel dönüştürme başarılı! ${result.file_info.table_count} tablo, ${result.file_info.file_size_mb} MB - İndirme başlatıldı!`,
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
                console.log('Session status:', sessionStatus);
                
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
        console.log('🎭 Demo download başlatılıyor:', activeSession.sessionId);
        
        notifications.info('Demo indirme başlatılıyor...', 1000);
        
        setTimeout(() => {
            // Demo dosya oluştur
            const demoContent = `PDFişlemleri.com Demo Test
==========================

Session ID: ${activeSession.sessionId}
Dosya Adı: ${activeSession.fileName}
İndirilme Zamanı: ${new Date().toLocaleString('tr-TR')}

Bu bir DEMO indirmedir.
Gerçek PDF'den Excel dönüştürme işlemi yapın!

${activeSession.fileInfo ? `
Demo Bilgiler:
- Tablo Sayısı: ${activeSession.fileInfo.table_count}
- Dosya Boyutu: ${activeSession.fileInfo.file_size_mb} MB
` : ''}

Kalan süre: ${Math.floor(fileHandler.getSessionTimeRemaining() / 60)} dakika ${fileHandler.getSessionTimeRemaining() % 60} saniye
`;
            
            const blob = new Blob([demoContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = activeSession.fileName.replace('.xlsx', '_demo.txt');
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
                <label class="block text-gray-700 font-medium mb-2">Dönüştürme Seçenekleri</label>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="radio" name="pagesOption" value="all" checked class="mr-2">
                        <span>Tüm sayfaları işle</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="pagesOption" value="1" class="mr-2">
                        <span>Sadece ilk sayfa</span>
                    </label>
                </div>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 font-medium mb-2">Tablo Algılama Yöntemi</label>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="radio" name="detectionMethod" value="auto" checked class="mr-2">
                        <span>Otomatik (Önerilen)</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="detectionMethod" value="lattice" class="mr-2">
                        <span>Çizgili tablolar için</span>
                    </label>
                    <label class="flex items-center">
                        <input type="radio" name="detectionMethod" value="stream" class="mr-2">
                        <span>Çizgisiz tablolar için</span>
                    </label>
                </div>
                <p class="text-sm text-gray-500 mt-1">PDF'deki tablo türüne göre en uygun yöntemi seçin</p>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 font-medium mb-2">Paragraf İşleme</label>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="checkbox" name="mergeParagraphs" checked class="mr-2">
                        <span>Büyük paragrafları tek hücrede birleştir</span>
                    </label>
                    <label class="flex items-center">
                        <input type="number" name="minParagraphLines" value="5" min="3" max="20" 
                               class="w-16 px-2 py-1 border border-gray-300 rounded text-sm mr-2">
                        <span>satır ve üzeri paragrafları birleştir</span>
                    </label>
                </div>
                <p class="text-sm text-gray-500 mt-1">Tablo olmayan uzun metinleri tek hücrede toplar</p>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 font-medium mb-2">PDF Şifresi (varsa)</label>
                <input type="password" name="password" placeholder="PDF şifresi girin" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <p class="text-sm text-gray-500 mt-1">Şifreli PDF'ler için şifre girin</p>
            </div>
            <div class="mb-4 p-3 bg-blue-50 rounded-lg">
                <h4 class="font-medium text-blue-800 mb-2">✨ Gelişmiş Özellikler</h4>
                <ul class="text-sm text-blue-700 space-y-1" style="list-style-position: inside; padding-left: 0;">
                    <li>Akıllı tablo algılama (çizgili/çizgisiz)</li>
                    <li>Otomatik hücre boyutlandırma</li>
                    <li>Metin kaydırma ve hizalama</li>
                    <li>Büyük paragrafları tek hücrede birleştirme</li>
                    <li>Profesyonel Excel formatlaması</li>
                </ul>
            </div>
        `;
    }

    /**
     * Komik alıntı
     */
    getFunnyQuote() {
        return "PDF'deki tabloları Excel'e dönüştürme işlemi, verilerinizi düzenlenebilir hale getirir. Hızlı, güvenli ve kaliteli sonuçlar için PDFişlemleri.com'u tercih edin.";
    }

    /**
     * Araç açıklaması
     */
    getDescription() {
        return "PDF dosyalarındaki tabloları ve metinleri Excel formatına dönüştürün. Smallpdf benzeri gelişmiş teknoloji ile paragrafları ve tabloları ayrı ayrı işleyerek profesyonel Excel dosyaları oluşturun. Hızlı, güvenli ve kaliteli sonuçlar için PDFişlemleri.com'u tercih edin.";
    }
}

// Singleton instance
const pdfToExcelTool = new PdfToExcelTool();

export default pdfToExcelTool;
