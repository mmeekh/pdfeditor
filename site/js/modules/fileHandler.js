/**
 * Dosya yükleme, indirme ve yönetim işlemleri
 * PDFişlemleri.com
 */

import notifications from './notifications.js';

class FileHandler {
    constructor() {
        this.selectedFiles = [];
        this.watermarkImage = null;
        this.activeSession = null; // Active session bilgilerini sakla
        this.sessionTimer = null; // Session timer
        this._dragIndex = null; // Drag & drop reorder state
        
        // Limitler
        this.MAX_FILES = 10;
        this.MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB
        
        // Session süresi (1 dakika)
        this.SESSION_LIFETIME_MINUTES = 1;
        
        this.initializeEventListeners();
    }

    /**
     * Event listener'ları başlat
     */
    initializeEventListeners() {
        // Ana dosya input
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
            });
        }

        // Drag and drop için ana alan
        const fileDropArea = document.getElementById('fileUploadArea');
        if (fileDropArea) {
            fileDropArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileDropArea.classList.add('dragover');
            });

            fileDropArea.addEventListener('dragleave', () => {
                fileDropArea.classList.remove('dragover');
            });

            fileDropArea.addEventListener('drop', (e) => {
                e.preventDefault();
                fileDropArea.classList.remove('dragover');
                this.handleFiles(e.dataTransfer.files);
            });
        }
    }

    /**
     * Dosyaları işle ve validate et
     */
    handleFiles(files, toolType = null) {
        if (files.length === 0) return;
        
        // Yeni dosyalar eklendiğinde eski session'ı temizle
        if (this.activeSession && window.pdfApi) {
            console.debug('Yeni dosyalar ekleniyor, eski session temizleniyor:', this.activeSession.sessionId);
            window.pdfApi.cleanupSession(this.activeSession.sessionId);
            this.activeSession = null;
            
            // Session timer'ı temizle
            if (this.sessionTimer) {
                clearInterval(this.sessionTimer);
                this.sessionTimer = null;
            }
        }
        
        const validFiles = this.validateFiles(files, toolType);
        if (validFiles.length === 0) return;
        
        const allFiles = [...this.selectedFiles, ...validFiles];
        
        // Limit kontrolleri
        if (!this.checkLimits(allFiles)) return;
        
        this.selectedFiles = allFiles;
        this.displaySelectedFiles();
        this.updateProcessButton();
        
        // Bildirim göster
        if (validFiles.length > 1) {
            notifications.success(`${validFiles.length} dosya başarıyla eklendi! Toplam ${this.selectedFiles.length} dosya.`);
        } else {
            notifications.success(`${validFiles[0].name} dosyası başarıyla eklendi! Toplam ${this.selectedFiles.length} dosya.`);
        }
    }

    /**
     * Dosyaları validate et
     */
    validateFiles(files, toolType) {
        const validFiles = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            if (toolType === 'word-to-pdf' && (file.name.endsWith('.doc') || file.name.endsWith('.docx'))) {
                validFiles.push(file);
            } else if (toolType !== 'word-to-pdf' && file.name.toLowerCase().endsWith('.pdf')) {
                validFiles.push(file);
            }
        }
        
        if (validFiles.length === 0) {
            notifications.error('Lütfen bu araç için geçerli dosyalar seçin.');
        }
        
        return validFiles;
    }

    /**
     * Dosya ve boyut limitlerini kontrol et
     */
    checkLimits(files) {
        // Dosya sayısı kontrolü
        if (files.length > this.MAX_FILES) {
            const currentCount = this.selectedFiles.length;
            const maxAllowed = this.MAX_FILES - currentCount;
            notifications.error(`Maksimum ${this.MAX_FILES} dosya yükleyebilirsiniz. ${maxAllowed} dosya daha ekleyebilirsiniz.`);
            return false;
        }
        
        // Toplam boyut kontrolü
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        if (totalSize > this.MAX_TOTAL_SIZE) {
            const currentSizeMB = (this.selectedFiles.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024)).toFixed(1);
            const maxSizeMB = (this.MAX_TOTAL_SIZE / (1024 * 1024)).toFixed(1);
            notifications.error(`Toplam dosya boyutu ${maxSizeMB}MB'ı aşamaz. Şu anda ${currentSizeMB}MB kullanılıyor.`);
            return false;
        }
        
        return true;
    }

    /**
     * Seçilen dosyaları göster
     */
    displaySelectedFiles() {
        const filesList = document.getElementById('filesList');
        if (!filesList) return;

        filesList.innerHTML = '';
        
        const totalSize = this.selectedFiles.reduce((sum, file) => sum + file.size, 0);
        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);
        
        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.setAttribute('draggable', 'true');
            fileItem.dataset.index = String(index);
            fileItem.innerHTML = `
                <div class="file-info">
                    <i class="fas fa-file-pdf file-icon"></i>
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">(${this.formatFileSize(file.size)})</span>
                </div>
                <button onclick="fileHandler.removeFile(${index})" class="remove-file" title="Dosyayı kaldır">
                    <i class="fas fa-times"></i>
                </button>
            `;
            // Drag & drop reorder events
            fileItem.addEventListener('dragstart', (e) => {
                this._dragIndex = index;
                try { e.dataTransfer && e.dataTransfer.setData('text/plain', String(index)); } catch(_) {}
                fileItem.classList.add('dragging');
            });
            fileItem.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileItem.classList.add('dragover');
            });
            fileItem.addEventListener('dragleave', () => {
                fileItem.classList.remove('dragover');
            });
            fileItem.addEventListener('drop', (e) => {
                e.preventDefault();
                fileItem.classList.remove('dragover');
                const from = (() => {
                    try { return Number(e.dataTransfer.getData('text/plain')); } catch(_) { return this._dragIndex; }
                })();
                const to = Number(fileItem.dataset.index);
                if (Number.isFinite(from) && Number.isFinite(to)) {
                    this.reorderFiles(from, to);
                }
                this._dragIndex = null;
            });
            fileItem.addEventListener('dragend', () => {
                fileItem.classList.remove('dragging');
            });
            filesList.appendChild(fileItem);
        });
        
        // Limit bilgisi
        const limitInfo = document.createElement('div');
        limitInfo.className = 'text-sm text-gray-500 mt-2 text-center';
        limitInfo.innerHTML = `
            <span>${this.selectedFiles.length}/${this.MAX_FILES} dosya</span> • 
            <span>${totalSizeMB}MB / 50MB</span>
        `;
        filesList.appendChild(limitInfo);

        const selectedFilesElement = document.getElementById('selectedFiles');
        if (selectedFilesElement) {
            selectedFilesElement.classList.remove('hidden');
            
            // Dosya listesi görünür olduktan sonra scroll yap
            setTimeout(() => {
                if (selectedFilesElement && !selectedFilesElement.classList.contains('hidden')) {
                    try {
                        selectedFilesElement.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'nearest',
                            inline: 'nearest'
                        });
                    } catch (error) {
                        console.warn('File list scroll işlemi başarısız:', error);
                        // Fallback: manuel scroll
                        const rect = selectedFilesElement.getBoundingClientRect();
                        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                        window.scrollTo({
                            top: scrollTop + rect.top - 50, // 50px offset
                            behavior: 'smooth'
                        });
                    }
                }
            }, 100);
        }

        // Custom event: notify listeners that files list updated
        document.dispatchEvent(new CustomEvent('filesUpdated', { detail: { files: this.selectedFiles } }));
    }

    /**
     * Dosyayı listeden kaldır
     */
    removeFile(index) {
        const removedFile = this.selectedFiles[index];
        this.selectedFiles.splice(index, 1);
        
        if (this.selectedFiles.length === 0) {
            const selectedFilesElement = document.getElementById('selectedFiles');
            if (selectedFilesElement) {
                selectedFilesElement.classList.add('hidden');
            }
            this.updateProcessButton();
        } else {
            this.displaySelectedFiles();
        }
        
        notifications.info(`${removedFile.name} dosyası kaldırıldı. Kalan: ${this.selectedFiles.length}`);
    }

    /**
     * İşleme butonunu güncelle
     */
    updateProcessButton() {
        const processButton = document.getElementById('processButton');
        if (processButton) {
            processButton.disabled = this.selectedFiles.length === 0;
        }
    }

    /**
     * Sürükle-bırak ile dosya sırasını değiştir
     */
    reorderFiles(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;
        if (fromIndex < 0 || fromIndex >= this.selectedFiles.length) return;
        if (toIndex < 0 || toIndex >= this.selectedFiles.length) return;
        const moved = this.selectedFiles.splice(fromIndex, 1)[0];
        this.selectedFiles.splice(toIndex, 0, moved);
        this.displaySelectedFiles();
        this.updateProcessButton();
    }

    /**
     * Dosya boyutunu formatla
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Otomatik indirme başlat
     */
    startAutomaticDownload(downloadUrl, sessionId, fileInfo) {
        notifications.info('İndirme otomatik olarak başlatılıyor...', 2000);
        
        setTimeout(() => {
            const fileName = fileInfo ? 
                `birlestirilmis_${fileInfo.page_count}sayfa_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.pdf` : 
                `birlestirilmis_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.pdf`;
            
            // Anchor yerine gizli iframe ile indir (scroll jump olmaz)
            this.triggerFileDownload(downloadUrl);
            
            // Session'ı sakla ve timer başlat
            if (sessionId) {
                this.activeSession = {
                    sessionId: sessionId,
                    downloadUrl: downloadUrl,
                    fileName: fileName,
                    fileInfo: fileInfo,
                    createdAt: new Date(),
                    expiresAt: new Date(Date.now() + this.SESSION_LIFETIME_MINUTES * 60 * 1000)
                };
                
                // Session timer'ı başlat
                this.startSessionTimer();
            }
            
            setTimeout(() => {
                notifications.success('Dosya başarıyla indirildi! 📁', 3000);
            }, 1000);
            
        }, 1500);
    }

    /**
     * Gizli iframe ile indirme tetikle (scroll jump engellenir)
     */
    triggerFileDownload(url) {
        const x = window.scrollX;
        const y = window.scrollY;
        if (typeof gtag === 'function') {
            const match = url.match(/tools\/([a-z-]+)/);
            const tool = match ? match[1] : 'unknown';
            gtag('event', 'download', { event_category: 'funnel', event_label: tool });
        }
        let iframe = document.getElementById('hidden-download-iframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'hidden-download-iframe';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
        }
        // Aynı URL tekrar indirilecekse yeniden yüklemeyi zorlamak için timestamp ekleyelim
        const sep = url.includes('?') ? '&' : '?';
        iframe.src = `${url}${sep}_=${Date.now()}`;
        // Bir sonraki frame'de scroll'u geri al
        setTimeout(() => window.scrollTo(x, y), 0);
    }

    /**
     * Demo indirme (simülasyon için)
     */
    startDemoDownload(toolName) {
        notifications.info('Demo indirme başlatılıyor...', 1000);
        
        setTimeout(() => {
            const content = `PDFişlemleri.com Demo - ${toolName}\nTarih: ${new Date().toLocaleString('tr-TR')}\nDosya Sayısı: ${this.selectedFiles.length}\n\nBu bir demo dosyadır.`;
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = `${toolName.toLowerCase().replace(/\s+/g, '_')}_demo.txt`;
            downloadLink.style.display = 'none';
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);
            
            notifications.success('Demo dosya indirildi! 📁', 2000);
        }, 800);
    }

    /**
     * Sadece UI'ı temizle (session'ı koru)
     */
    resetUIOnly() {
        this.selectedFiles = [];
        this.watermarkImage = null;
        
        // Session'ı koru, sadece UI'ı temizle
        
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.value = '';
        
        const selectedFilesElement = document.getElementById('selectedFiles');
        if (selectedFilesElement) selectedFilesElement.classList.add('hidden');
        
        const filesList = document.getElementById('filesList');
        if (filesList) filesList.innerHTML = '';
        
        this.updateProcessButton();
    }

    /**
     * Dosyaları ve state'i temizle (session dahil)
     */
    reset() {
        this.selectedFiles = [];
        this.watermarkImage = null;
        
        // Active session'ı temizle (sadece manuel reset'te)
        if (this.activeSession && window.pdfApi) {
            console.debug('Manuel reset, session temizleniyor:', this.activeSession.sessionId);
            window.pdfApi.cleanupSession(this.activeSession.sessionId);
            this.activeSession = null;
        }
        
        // Session timer'ı temizle
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
        
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.value = '';
        
        const selectedFilesElement = document.getElementById('selectedFiles');
        if (selectedFilesElement) selectedFilesElement.classList.add('hidden');
        
        const filesList = document.getElementById('filesList');
        if (filesList) filesList.innerHTML = '';
        
        this.updateProcessButton();
    }

    /**
     * Session timer'ı başlat
     */
    startSessionTimer() {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
        }
        
        // Periyodik kontrol (hafif ama daha sık)
        this.sessionTimer = setInterval(() => {
            this.checkSessionExpiry();
        }, 5000);
        
        // Sürenin bitimine 30 saniye kala uyarı ver
        const lifetimeMs = this.SESSION_LIFETIME_MINUTES * 60 * 1000;
        const warnMs = Math.max(0, lifetimeMs - 30000);
        this._warnTimeout && clearTimeout(this._warnTimeout);
        this._warnTimeout = setTimeout(() => {
            if (this.activeSession) {
                notifications.info('İndirme linki 30 saniye sonra sona erecek! ⏰', 3000);
            }
        }, warnMs);
    }
    
    /**
     * Session süresini kontrol et
     */
    checkSessionExpiry() {
        if (!this.activeSession) {
            if (this.sessionTimer) {
                clearInterval(this.sessionTimer);
                this.sessionTimer = null;
            }
            return;
        }
        
        const now = new Date();
        const timeRemaining = this.activeSession.expiresAt - now;
        
        // Session süresi dolmuşsa
        if (timeRemaining <= 0) {
            this.expireSession();
            return;
        }
        
        // 30 saniye kala uyarı
        if (timeRemaining <= 30000 && timeRemaining > 0) {
            notifications.info('İndirme linki 30 saniye sonra sona erecek! ⚠️', 3000);
        }
    }
    
    /**
     * Session'ı expire et
     */
    expireSession(silent = false) {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
        
        if (this.activeSession) {
            console.debug('Session expired:', this.activeSession.sessionId);
            
            // Backend'den temizle
            if (window.pdfApi) {
                window.pdfApi.cleanupSession(this.activeSession.sessionId).catch(err => {
                    console.warn('Session cleanup failed:', err);
                });
            }
            
            this.activeSession = null;
            if (!silent) {
                notifications.error(`İndirme linki süresi doldu (${this.SESSION_LIFETIME_MINUTES} dakika). Lütfen dosyaları tekrar işleyin.`, 6000);
            }
        }
    }
    
    /**
     * Session durumunu kontrol et
     */
    isSessionActive() {
        if (!this.activeSession) return false;
        
        const now = new Date();
        return now < this.activeSession.expiresAt;
    }
    
    /**
     * Kalan session süresini al (saniye)
     */
    getSessionTimeRemaining() {
        if (!this.activeSession) return 0;
        
        const now = new Date();
        const remaining = Math.max(0, Math.floor((this.activeSession.expiresAt - now) / 1000));
        return remaining;
    }

    /**
     * Getter'lar
     */
    getSelectedFiles() {
        return this.selectedFiles;
    }

    getFileCount() {
        return this.selectedFiles.length;
    }

    getTotalSize() {
        return this.selectedFiles.reduce((sum, file) => sum + file.size, 0);
    }
}

// Singleton instance
const fileHandler = new FileHandler();

// Global erişim için
window.fileHandler = fileHandler;

export default fileHandler;
