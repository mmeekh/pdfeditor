/**
 * PDF Araç Yöneticisi
 * PDFişlemleri.com
 */

import mergeTool from '../tools/merge.js';
import splitTool from '../tools/split.js';
import compressTool from '../tools/compress.js';
import pdfToWordTool from '../tools/pdf-to-word.js';
import wordToPdfTool from '../tools/word-to-pdf.js';
import pdfToPptTool from '../tools/pdf-to-ppt.js';
import protectTool from '../tools/protect.js';
import unlockTool from '../tools/unlock.js';
import rotateTool from '../tools/rotate.js';
import watermarkTool from '../tools/watermark.js';
import pdfToJpgTool from '../tools/pdf-to-jpg.js';
import organizeTool from '../tools/organize.js';
import signTool from '../tools/sign.js';
import pdfOcrTool from '../tools/pdf-ocr.js';
import pdfToExcelTool from '../tools/pdf-to-excel.js';
import notifications from './notifications.js';
import fileHandler from './fileHandler.js';
import pdfLoader from './loader.js';

class ToolManager {
    constructor() {
        this.currentTool = null;
        this.tools = {
            merge: mergeTool,
            split: splitTool,
            compress: compressTool,
            'pdf-to-word': pdfToWordTool,
            'word-to-pdf': wordToPdfTool,
            'pdf-to-ppt': pdfToPptTool,
            'protect': protectTool,
            'unlock': unlockTool,
            'rotate': rotateTool,
            'watermark': watermarkTool,
            'pdf-to-jpg': pdfToJpgTool,
            'organize': organizeTool,
            'sign': signTool,
            'pdf-ocr': pdfOcrTool,
            'pdf-to-excel': pdfToExcelTool
        };
        
        this.initializeEventListeners();
    }

    /**
     * Event listener'ları başlat
     */
    initializeEventListeners() {
        // Tool kartları için click handler
        const toolCards = document.querySelectorAll('.tool-card');
        toolCards.forEach(card => {
            card.addEventListener('click', () => {
                const toolName = card.getAttribute('data-tool');
                this.openTool(toolName);
            });

            // Drag and drop için tool kartları
            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                card.classList.add('drag-over');
            });
            
            card.addEventListener('dragleave', () => {
                card.classList.remove('drag-over');
            });
            
            card.addEventListener('drop', (e) => {
                e.preventDefault();
                card.classList.remove('drag-over');
                
                const files = e.dataTransfer.files;
                const toolName = card.getAttribute('data-tool');
                
                if (files.length > 0) {
                    this.openToolWithFiles(toolName, files);
                }
            });
        });

        // Process button
        const processButton = document.getElementById('processButton');
        if (processButton) {
            processButton.addEventListener('click', () => {
                this.processCurrentTool();
            });
        }

        // Close button
        document.addEventListener('click', (e) => {
            if (e.target.closest('[onclick="closeTool()"]')) {
                this.closeTool();
            }
        });

        // Reset button
        document.addEventListener('click', (e) => {
            if (e.target.closest('[onclick="resetTool()"]')) {
                this.resetTool();
            }
        });
    }

    /**
     * Araç aç
     */
    openTool(toolName) {
        if (this.currentTool && this.currentTool !== toolName) {
            fileHandler.reset();
        }
        this.currentTool = toolName;

        // accept attribute update
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.accept = toolName === 'word-to-pdf' ? '.doc,.docx' : '.pdf';
        }
        const toolInterface = document.getElementById('toolInterface');
        if (toolInterface) {
            this.populateToolInterface(toolName);
            toolInterface.classList.remove('hidden');

            // Tool interface açıldıktan sonra dosya yükleme alanına scroll yap
            setTimeout(() => {
                const fileUploadArea = document.getElementById('fileUploadArea');
                if (fileUploadArea) {
                    try {
                        fileUploadArea.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                            inline: 'nearest'
                        });
                    } catch (error) {
                        console.warn('Scroll işlemi başarısız:', error);
                        // Fallback: manuel scroll
                        const rect = fileUploadArea.getBoundingClientRect();
                        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                        window.scrollTo({
                            top: scrollTop + rect.top - 200, // 200px offset for better visibility
                            behavior: 'smooth'
                        });
                    }
                }
            }, 100); // Kısa bir gecikme ile DOM'un güncellenmesini bekle
        }

        this.trackEvent('tool_opened', { tool_name: toolName });
    }

    /**
     * Dosyalarla birlikte araç aç
     */
    openToolWithFiles(toolName, files) {
        if (this.currentTool && this.currentTool !== toolName) {
            fileHandler.reset();
        }
        this.currentTool = toolName;

        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.accept = toolName === 'word-to-pdf' ? '.doc,.docx' : '.pdf';
        }
        const toolInterface = document.getElementById('toolInterface');
        if (toolInterface) {
            this.populateToolInterface(toolName);
            toolInterface.classList.remove('hidden');
        }
        fileHandler.handleFiles(files, toolName);

        // Dosya yükleme tamamlandıktan sonra scroll yap
        setTimeout(() => {
            if (toolInterface && !toolInterface.classList.contains('hidden')) {
                try {
                    toolInterface.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                        inline: 'nearest'
                    });
                } catch (error) {
                    console.warn('Scroll işlemi başarısız:', error);
                    // Fallback: manuel scroll
                    const rect = toolInterface.getBoundingClientRect();
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    window.scrollTo({
                        top: scrollTop + rect.top - 100, // 100px offset
                        behavior: 'smooth'
                    });
                }
            }
        }, 150);

        this.trackEvent('tool_opened', { tool_name: toolName });
    }

    /**
     * Tool interface'ini doldur
     */
    populateToolInterface(toolName) {
        const tool = this.tools[toolName];
        const config = this.getToolConfig(toolName);

        // Başlık ve açıklama
        const toolTitle = document.getElementById('toolTitle');
        const toolDescription = document.getElementById('toolDescription');
        const funnyQuote = document.getElementById('funnyQuote');
        const toolOptions = document.getElementById('toolOptions');

        if (toolTitle) toolTitle.textContent = config.title;
        if (toolDescription) {
            const desc = (typeof (this.tools[toolName]?.getDescription) === 'function') ? this.tools[toolName].getDescription() : config.description;
            toolDescription.innerHTML = `
                <span class="font-medium">${desc}</span>
                <span class="ml-2 text-blue-600">✨</span>
            `;
        }
        if (funnyQuote) {
            const quoteText = (typeof (this.tools[toolName]?.getFunnyQuote) === 'function') ? this.tools[toolName].getFunnyQuote() : config.funnyQuote;
            funnyQuote.innerHTML = `${quoteText || ''}`;
        }

        // Tool-specific options
        if (toolOptions) {
            if (tool && tool.getOptions) {
                toolOptions.innerHTML = tool.getOptions();
                // Bazı araçlar mount ister
                if (typeof tool.mount === 'function') {
                    // DOM eklendikten sonra mount çağır
                    setTimeout(() => tool.mount(), 0);
                }
            } else {
                toolOptions.innerHTML = config.options || '';
            }
        }

        // Tool-specific initializations will be added when tools are implemented
    }

    /**
     * Mevcut aracı işle
     */
    async processCurrentTool() {
        if (!this.currentTool) {
            notifications.error('Lütfen önce bir araç seçin');
            return;
        }

        const files = fileHandler.getSelectedFiles();
        if (files.length === 0) {
            notifications.error('Lütfen dosya yükleyin');
            return;
        }

        // Tool-specific validation
        if (this.currentTool === 'watermark') {
            const watermarkType = document.querySelector('input[name="watermarkType"]:checked');
            if (watermarkType && watermarkType.value === 'image' && !fileHandler.watermarkImage) {
                notifications.error('Lütfen bir filigran resmi seçin.');
                return;
            }
        }

        // Real tool vs simulation
        const tool = this.tools[this.currentTool];
        if (tool && tool.process) {
            await tool.process();
        } else {
            this.processSimulation();
        }

        // Analytics
        this.trackEvent('file_processed', {
            tool: this.currentTool,
            file_count: files.length
        });
    }

    /**
     * Simülasyon işlemi (henüz implement edilmemiş araçlar için)
     */
    processSimulation() {
        const config = this.getToolConfig(this.currentTool);
        const files = fileHandler.getSelectedFiles();

        const processButton = document.getElementById('processButton');
        if (processButton) processButton.disabled = true;

        pdfLoader.show({
            message: `${config.title} işleniyor...`,
            subMessage: `${files.length} dosya işleniyor`
        });

        const totalProcessingTime = pdfLoader.calculateProcessingTime(files);
        const progressInterval = totalProcessingTime / 100;

        let progress = 0;
        const interval = setInterval(() => {
            progress += 1;

            if (progress <= 20) {
                pdfLoader.setStatus(pdfLoader.states.LOADING, 'Dosyalar yükleniyor...');
            } else if (progress <= 60) {
                pdfLoader.setStatus(pdfLoader.states.PROCESSING, 'PDF işleniyor...');
            } else if (progress <= 90) {
                pdfLoader.setStatus(pdfLoader.states.PROCESSING, 'Son kontroller yapılıyor...');
            } else if (progress <= 99) {
                pdfLoader.setStatus(pdfLoader.states.COMPLETING, 'Tamamlanıyor...');
            } else {
                pdfLoader.setStatus(pdfLoader.states.DONE, 'Tamamlandı!');
            }

            pdfLoader.updateProgress(progress);

            if (progress >= 100) {
                clearInterval(interval);

                setTimeout(() => {
                    pdfLoader.hide();
                    this.showSimulationResult();
                }, 1000);
            }
        }, progressInterval);
    }

    /**
     * Simülasyon sonucu göster
     */
    showSimulationResult() {
        const resultArea = document.getElementById('resultArea');
        if (resultArea) {
            // Demo indirme başlat
            const config = this.getToolConfig(this.currentTool);
            fileHandler.startDemoDownload(config.title);

            // Button'u güncelle
            const downloadBtn = resultArea.querySelector('button');
            if (downloadBtn) {
                downloadBtn.innerHTML = '<i class="fas fa-download mr-2"></i>Tekrar İndir (Demo)';
                downloadBtn.onclick = () => {
                    fileHandler.startDemoDownload(config.title);
                };
            }

            resultArea.classList.remove('hidden');
        }

        notifications.success('PDF işlemi başarıyla tamamlandı! İndirme başlatıldı! 🎉', 4000);
    }

    /**
     * Aracı kapat (session'ı silmeden)
     */
    closeTool() {
        const toolInterface = document.getElementById('toolInterface');
        if (toolInterface) {
            toolInterface.classList.add('hidden');
        }
        // Session'ı koruyarak sadece UI'ı temizle
        this.clearUIOnly();
    }

    /**
     * Sadece UI'ı temizle (session'ı koru)
     */
    clearUIOnly() {
        this.currentTool = null;
        pdfLoader.hide();

        const progressContainer = document.getElementById('progressContainer');
        if (progressContainer) progressContainer.classList.add('hidden');

        const resultArea = document.getElementById('resultArea');
        if (resultArea) resultArea.classList.add('hidden');
        
        // Dosya listesini temizle ama session'ı koru
        fileHandler.resetUIOnly();
    }

    /**
     * Aracı sıfırla (session dahil her şeyi temizle)
     */
    resetTool() {
        this.currentTool = null;
        fileHandler.reset(); // Session dahil her şeyi temizle
        pdfLoader.hide();

        const progressContainer = document.getElementById('progressContainer');
        if (progressContainer) progressContainer.classList.add('hidden');

        const resultArea = document.getElementById('resultArea');
        if (resultArea) resultArea.classList.add('hidden');
    }

    /**
     * Tool config'ini al
     */
    getToolConfig(toolName) {
        const configs = {
            merge: {
                title: "PDF Birleştir",
                description: "Birden fazla PDF dosyasını tek bir belgede birleştirin. Dosyalarınızı aşağıya yükleyin, onları göründükleri sırada birleştirelim. Hızlı, güvenli ve profesyonel sonuçlar için PDFişlemleri.com'u tercih edin.",
                funnyQuote: "PDF birleştirme işlemi, birden fazla belgeyi tek bir profesyonel dosyada toplar. Hızlı, güvenli ve kaliteli sonuçlar için PDFişlemleri.com'u tercih edin."
            },
            split: {
                title: "PDF Ayır",
                description: "PDF'inizden sayfaları çıkarın veya birden fazla dosyaya ayırın. PDF'inizi yükleyin ve nasıl ayırmak istediğinizi seçin. Büyük PDF dosyalarını daha yönetilebilir parçalara bölün.",
                funnyQuote: "PDF ayırma işlemi, büyük dosyaları daha yönetilebilir parçalara böler. Organize edilmiş belgeler için PDFişlemleri.com'u tercih edin."
            },
            compress: {
                title: "PDF Sıkıştır",
                description: "PDF dosya boyutunu kaliteden ödün vermeden küçültün. PDF'inizi yükleyin ve sıkıştırma seviyesini seçin. Dosya boyutunu küçültürken kaliteyi koruyun.",
                funnyQuote: "PDF sıkıştırma işlemi, dosya boyutunu küçültürken kaliteyi korur. Optimize edilmiş belgeler için PDFişlemleri.com'u tercih edin."
            },
            'pdf-to-word': {
                title: "PDF'den Word'e",
                description: "PDF'leri düzenlenebilir Word (.docx) belgelerine dönüştürün. Tablo ve metinleri mümkün olduğunca korur.",
                funnyQuote: "PDF'den Word'e dönüştürme işlemi, belgelerinizi düzenlenebilir hale getirir. Profesyonel dönüştürme için PDFişlemleri.com'u tercih edin."
            },
            'word-to-pdf': {
                title: "Word'den PDF'e",
                description: "Word (DOC/DOCX) belgelerinizi güvenle PDF'e dönüştürün. Biçim koruma ve hızlı sonuç.",
                funnyQuote: "Word'den PDF'e dönüştürme işlemi, belgelerinizi evrensel formatta sunar. Güvenilir dönüştürme için PDFişlemleri.com'u tercih edin."
            },
            'pdf-to-ppt': {
                title: "PDF'den PPT'ye",
                description: "PDF belgelerinizi PowerPoint (PPTX) sunumlarına dönüştürün.",
                funnyQuote: "PDF'den PowerPoint'e dönüştürme işlemi, belgelerinizi sunum formatına çevirir. Etkili sunumlar için PDFişlemleri.com'u tercih edin."
            },
            'unlock': {
                title: "PDF Şifre Kaldır",
                description: "PDF dosyalarınızdaki şifre korumasını tamamen kaldırın. Şifreli PDF'lerinizi düzenlenebilir hale getirin.",
                funnyQuote: "PDF şifre kaldırma işlemi, korumalı belgelerinizi düzenlenebilir hale getirir. Güvenli işlem için PDFişlemleri.com'u tercih edin."
            },
            'protect': {
                title: "PDF Şifrele",
                description: "PDF dosyalarınıza güçlü şifre koruması ve detaylı izin kısıtlamaları ekleyin. Kullanıcı ve sahip şifreleri ile tam kontrol sağlayın!",
                funnyQuote: "PDF şifreleme işlemi, belgelerinizi güvenli hale getirir. Profesyonel koruma için PDFişlemleri.com'u tercih edin."
            },
            'rotate': {
                title: "PDF Döndür",
                description: "PDF sayfalarını 90° / 180° / 270° açılarıyla döndürün.",
                funnyQuote: "PDF döndürme işlemi, sayfalarınızı doğru yönde görüntülemenizi sağlar. Düzenli belgeler için PDFişlemleri.com'u tercih edin."
            },
            'watermark': {
                title: "PDF Filigranla",
                description: "Metin veya resim filigranı ekleyin; marka ve gizliliğinizi koruyun.",
                funnyQuote: "PDF filigran ekleme işlemi, belgelerinizi markalı hale getirir. Profesyonel görünüm için PDFişlemleri.com'u tercih edin."
            },
            'pdf-to-jpg': {
                title: "PDF'den JPG'ye",
                description: "PDF sayfalarını yüksek kaliteli JPG görsellere dönüştürün.",
                funnyQuote: "PDF'den JPG'ye dönüştürme işlemi, belgelerinizi görsel formatına çevirir. Yüksek kaliteli görseller için PDFişlemleri.com'u tercih edin."
            },
            'organize': {
                title: "PDF Düzenle",
                description: "Sayfaları yeniden sıralayın, silin veya başka PDF'lerden ekleyin.",
                funnyQuote: "PDF düzenleme işlemi, sayfalarınızı istediğiniz sırada organize eder. Düzenli belgeler için PDFişlemleri.com'u tercih edin."
            },
            'sign': {
                title: "PDF İmzala",
                description: "PDF dosyalarınızı dijital olarak imzalayın. Elle çizim veya yüklenen imza ile profesyonel sonuçlar.",
                funnyQuote: "PDF imzalama işlemi, belgelerinizi güvenli ve profesyonel hale getirir. Dijital imza için PDFişlemleri.com'u tercih edin."
            },
            'pdf-ocr': {
                title: "PDF OCR",
                description: "PDF dosyalarınızdaki metinleri çıkarın ve düzenlenebilir hale getirin. OCR teknolojisi ile taranmış belgelerinizi arama yapılabilir hale getirin.",
                funnyQuote: "PDF OCR işlemi, görüntülerdeki metinleri okuyup düzenlenebilir hale getirir. Dijital arşivinizi arama yapılabilir hale getirin!"
            },
            'pdf-to-excel': {
                title: "PDF'den Excel'e",
                description: "PDF dosyalarındaki tabloları Excel formatına dönüştürün. Verilerinizi düzenlenebilir hale getirin ve analiz yapın.",
                funnyQuote: "PDF'den Excel'e dönüştürme işlemi, tablolarınızı düzenlenebilir hale getirir. Veri analizi için PDFişlemleri.com'u tercih edin!"
            }
        };

        return configs[toolName] || { title: toolName, description: '', funnyQuote: '' };
    }

    /**
     * Watermark tool'u başlat
     */
    initializeWatermarkTool() {
        // Watermark type toggle
        const watermarkTypeRadios = document.querySelectorAll('input[name="watermarkType"]');
        watermarkTypeRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                const textOptions = document.getElementById('textWatermarkOptions');
                const imageOptions = document.getElementById('imageWatermarkOptions');
                
                if (this.value === 'text') {
                    if (textOptions) textOptions.classList.remove('hidden');
                    if (imageOptions) imageOptions.classList.add('hidden');
                } else {
                    if (textOptions) textOptions.classList.add('hidden');
                    if (imageOptions) imageOptions.classList.remove('hidden');
                }
            });
        });
    }

    /**
     * Split tool'u başlat
     */
    initializeSplitTool() {
        const splitOptionRadios = document.querySelectorAll('input[name="splitOption"]');
        splitOptionRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                const splitDetails = document.getElementById('splitDetails');
                if (this.value === 'pages') {
                    if (splitDetails) splitDetails.classList.remove('hidden');
                } else {
                    if (splitDetails) splitDetails.classList.add('hidden');
                }
            });
        });
    }

    /**
     * Analytics tracking - Enhanced with GTM support
     */
    trackEvent(eventName, eventData) {
        // Console'a yazdırmadan önce scroll pozisyonunu koru
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        
        // GTM DataLayer event (öncelikli)
        if (window.dataLayer) {
            window.dataLayer.push({
                'event': eventName,
                'event_category': 'PDF Tools',
                'event_label': eventData.tool || 'unknown',
                'value': eventData.file_count || 1,
                'custom_parameters': eventData,
                'timestamp': new Date().toISOString()
            });
        }
        
        // GA4 fallback (mevcut tracking korunuyor)
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                event_category: 'PDF Tools',
                event_label: eventData.tool || 'unknown',
                value: eventData.file_count || 1,
                ...eventData
            });
        }
        
        // Sadece basit string log yap, büyük objeleri yazdırma
        console.log(`Event tracked: ${eventName}`, typeof eventData === 'object' ? '[Object]' : eventData);
        
        // Scroll pozisyonunu geri yükle
        setTimeout(() => {
            window.scrollTo(scrollX, scrollY);
        }, 0);
    }

    /**
     * Get current tool
     */
    getCurrentTool() {
        return this.currentTool;
    }
}

// Singleton instance
const toolManager = new ToolManager();

// Global erişim
window.toolManager = toolManager;

export default toolManager;
