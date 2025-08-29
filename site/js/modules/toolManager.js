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
            'pdf-to-jpg': pdfToJpgTool
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
        this.currentTool = toolName;
        
        // Tool interface'i göster
        const toolInterface = document.getElementById('toolInterface');
        if (toolInterface) {
            this.populateToolInterface(toolName);
            toolInterface.classList.remove('hidden');
            toolInterface.scrollIntoView({ behavior: 'smooth' });
        }

        // Analytics
        this.trackEvent('tool_opened', { tool_name: toolName });
    }

    /**
     * Dosyalarla birlikte araç aç
     */
    openToolWithFiles(toolName, files) {
        this.currentTool = toolName;
        
        // Tool interface'i göster
        const toolInterface = document.getElementById('toolInterface');
        if (toolInterface) {
            this.populateToolInterface(toolName);
            toolInterface.classList.remove('hidden');
        }
        
        // Önce dosyaları yükle
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
        
        // Analytics
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
            funnyQuote.innerHTML = `${quoteText || ''} <span class="ml-1">😄</span>`;
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
                description: "Birden fazla PDF dosyasını tek bir belgede birleştirin. Dosyalarınızı aşağıya yükleyin, onları göründükleri sırada birleştirelim. Ayrılıklar acıtır, birleşmeler mutluluk!",
                funnyQuote: "İki PDF bir araya gelince, ne olur? Mutlu bir aile! Biz sadece evlilik danışmanlığı yapıyoruz."
            },
            split: {
                title: "PDF Ayır",
                description: "PDF'inizden sayfaları çıkarın veya birden fazla dosyaya ayırın. PDF'inizi yükleyin ve nasıl ayırmak istediğinizi seçin. Bazen ayrılmak en iyisidir, özellikle 100 sayfalık PDF'ler söz konusuysa!",
                funnyQuote: "Bazen en iyi ilişkiler, ayrılarak devam eder. PDF'leriniz için geçerli!"
            },
            compress: {
                title: "PDF Sıkıştır",
                description: "PDF dosya boyutunu kaliteden ödün vermeden küçültün. PDF'inizi yükleyin ve sıkıştırma seviyesini seçin. PDF'leriniz diyet yapacak, siz ise depolama alanından tasarruf edeceksiniz!",
                funnyQuote: "PDF'iniz fazla kilolu mu? Getirin diyet yapalım, ama kalitesinden hiçbir şey kaybetmesin!"
            },
            'pdf-to-word': {
                title: "PDF'den Word'e",
                description: "PDF'leri düzenlenebilir Word (.docx) belgelerine dönüştürün. Tablo ve metinleri mümkün olduğunca korur.",
                funnyQuote: "PDF konuşur, Word yazar!"
            },
            'word-to-pdf': {
                title: "Word'den PDF'e",
                description: "Word (DOC/DOCX) belgelerinizi güvenle PDF'e dönüştürün. Biçim koruma ve hızlı sonuç.",
                funnyQuote: "Word uyudu, PDF uyandı!"
            },
            'pdf-to-ppt': {
                title: "PDF'den PPT'ye",
                description: "PDF belgelerinizi PowerPoint (PPTX) sunumlarına dönüştürün.",
                funnyQuote: "Slaytlar konuşsun, siz anlatın!"
            },
            'unlock': {
                title: "PDF Şifre Kaldır",
                description: "PDF dosyalarınızdaki şifre korumasını tamamen kaldırın. Şifreli PDF'lerinizi özgür bırakın!",
                funnyQuote: "🔓 Hapishaneden kurtulun! PDF artık özgür!"
            },
            'protect': {
                title: "PDF Şifrele",
                description: "PDF dosyalarınıza güçlü şifre koruması ve detaylı izin kısıtlamaları ekleyin. Kullanıcı ve sahip şifreleri ile tam kontrol sağlayın!",
                funnyQuote: "PDF artık güvenli! 🔐 Şifreler sizin, gizlilik bizim!"
            },
            'rotate': {
                title: "PDF Döndür",
                description: "PDF sayfalarını 90° / 180° / 270° açılarıyla döndürün.",
                funnyQuote: "Dünya tersine dönerse… PDF de döner!"
            },
            'watermark': {
                title: "PDF Filigranla",
                description: "Metin veya resim filigranı ekleyin; marka ve gizliliğinizi koruyun.",
                funnyQuote: "İmzanız her sayfada!"
            },
            'pdf-to-jpg': {
                title: "PDF'den JPG'ye",
                description: "PDF sayfalarını yüksek kaliteli JPG görsellere dönüştürün.",
                funnyQuote: "Bir resim bin kelime eder!"
            },
            'organize': {
                title: "PDF Düzenle",
                description: "Sayfaları yeniden sıralayın, silin veya başka PDF'lerden ekleyin.",
                funnyQuote: "Düzen candır, kaos yorar!"
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
     * Analytics tracking
     */
    trackEvent(eventName, eventData) {
        console.log('Event tracked:', eventName, eventData);
        
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, eventData);
        }
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
