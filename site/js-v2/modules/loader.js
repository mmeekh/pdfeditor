/**
 * Modern PDF Loader API
 * PDFişlemleri.com
 */

class PDFLoader {
    constructor() {
        this.states = {
            LOADING: 'loading',
            PROCESSING: 'processing', 
            COMPLETING: 'completing',
            DONE: 'done'
        };
        this.currentStatus = null;
        this.progressValue = 0;
    }
    
    show(options = {}) {
        const loader = document.getElementById('modern-pdf-loader');
        if (!loader) return this;
        
        const msg = document.getElementById('loader-message');
        const sub = document.getElementById('loader-submessage');
        const status = document.getElementById('current-status');
        const percent = document.getElementById('progress-percentage');
        const fill = document.getElementById('progress-fill');

        if (options.message && msg) msg.textContent = options.message;
        if (options.subMessage !== undefined && sub) sub.textContent = options.subMessage;

        loader.classList.remove('opacity-0', 'pointer-events-none');
        loader.setAttribute('aria-busy', 'true');

        this.currentStatus = this.states.LOADING;
        if (status) status.textContent = 'Başlatılıyor...';
        if (percent) percent.textContent = '0%';
        if (fill) fill.style.width = '0%';
        this.progressValue = 0;
        
        this.activateWindEffect();
        this.initFileTypeRotation();
        
        return this;
    }
    
    updateProgress(progress, text) {
        if (!this.currentStatus) return this;
        
        const fill = document.getElementById('progress-fill');
        const percent = document.getElementById('progress-percentage');
        const status = document.getElementById('current-status');

        this.progressValue = Math.max(0, Math.min(100, Number(progress) || 0));
        if (fill) fill.style.width = this.progressValue + '%';
        if (percent) percent.textContent = Math.round(this.progressValue) + '%';
        
        if (text && status) status.textContent = text;
        
        return this;
    }
    
    setStatus(status, text) {
        if (!this.currentStatus) return this;
        
        const statusElement = document.getElementById('current-status');
        if (statusElement) statusElement.textContent = text || status;
        this.currentStatus = status;
        
        return this;
    }
    
    hide() {
        const loader = document.getElementById('modern-pdf-loader');
        if (!loader) return this;
        
        loader.classList.add('opacity-0', 'pointer-events-none');
        loader.setAttribute('aria-busy', 'false');
        
        setTimeout(() => {
            this.currentStatus = null;
            this.progressValue = 0;
        }, 300);
        
        return this;
    }
    
    setMessage(message, subMessage) {
        if (message) {
            const msg = document.getElementById('loader-message');
            if (msg) msg.textContent = message;
        }
        if (subMessage !== undefined) {
            const sub = document.getElementById('loader-submessage');
            if (sub) sub.textContent = subMessage;
        }

        return this;
    }

    /**
     * Batch (çoklu dosya) işlemlerinde per-file ilerlemeyi göster.
     * Örnek: "[2/5] belge.pdf işleniyor"
     *
     * Not: Backend dosyaları toplu işlediği için bu bilgi genellikle
     * sadece upload/pre-process aşamasında frontend tarafında anlamlıdır.
     *
     * @param {number} currentFile - 1-indexed sıradaki dosya numarası
     * @param {number} totalFiles - toplam dosya sayısı
     * @param {string} [fileName] - işlenen dosyanın adı (opsiyonel)
     */
    setBatchProgress(currentFile, totalFiles, fileName) {
        try {
            if (!this.currentStatus) return this;
            if (!totalFiles || totalFiles < 1) return this;

            const cur = Math.max(1, Math.min(totalFiles, Number(currentFile) || 1));
            const tot = Math.max(1, Number(totalFiles) || 1);

            const sub = document.getElementById('loader-submessage');
            if (sub) {
                const truncated = (typeof fileName === 'string' && fileName.length > 40)
                    ? fileName.slice(0, 37) + '...'
                    : fileName;
                const namePart = truncated ? ` ${truncated}` : ' dosya';
                sub.textContent = `[${cur}/${tot}]${namePart} işleniyor`;
            }

            // İkincil yüzde olarak genel ilerleme (0-100)
            const percentEl = document.getElementById('progress-percentage');
            if (percentEl && this.progressValue === 0) {
                const pct = Math.round((cur / tot) * 100);
                percentEl.textContent = pct + '%';
            }
        } catch (e) {
            console.warn('setBatchProgress error:', e);
        }

        return this;
    }
    
    activateWindEffect() {
        const wind = document.getElementById('wind-effect');
        if (!wind) return;
        
        wind.style.opacity = '0.3';
        wind.style.animation = 'wind-blow 2s linear infinite';
    }
    
    initFileTypeRotation() {
        const fileTypes = [
            { color: '#3b82f6', text: 'WORD' },
            { color: '#ef4444', text: 'PDF' }
        ];
        let fileTypeIndex = 0;
        
        const rotationInterval = setInterval(() => {
            if (!this.currentStatus) {
                clearInterval(rotationInterval);
                return;
            }
            
            fileTypeIndex = (fileTypeIndex + 1) % fileTypes.length;
            const type = fileTypes[fileTypeIndex];
            
            const box = document.getElementById('file-type-box');
            const txt = document.getElementById('file-type-text');
            
            if (box && txt) {
                box.classList.add('smooth-transition');
                txt.classList.add('smooth-transition');
                
                box.setAttribute('fill', type.color);
                txt.textContent = type.text;
                
                setTimeout(() => {
                    box.classList.remove('smooth-transition');
                    txt.classList.remove('smooth-transition');
                }, 500);
            }
        }, 1500);
    }
    
    calculateProcessingTime(files) {
        if (!files || files.length === 0) return 2000;
        
        let totalSize = 0;
        files.forEach(file => {
            totalSize += file.size;
        });
        
        const sizeInMB = totalSize / (1024 * 1024);
        
        if (sizeInMB < 1) return 1500;
        if (sizeInMB < 5) return 2500;
        if (sizeInMB < 10) return 4000;
        if (sizeInMB < 20) return 6000;
        if (sizeInMB < 30) return 8000;
        return 10000;
    }
}

// Singleton instance
const pdfLoader = new PDFLoader();

export default pdfLoader;
