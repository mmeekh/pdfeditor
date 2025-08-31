/**
 * API çağrıları ve backend entegrasyonu
 * PDFişlemleri.com
 */

class PDFApi {
    constructor() {
        this.baseUrl = window.location.origin + '/api';
    }

    trackEvent(action, tool) {
        if (typeof gtag === 'function') {
            gtag('event', action, {
                event_category: 'funnel',
                event_label: tool
            });
        }
    }

    /**
     * API health check
     */
    async checkHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/status`, {
                headers: {
                    'Accept': 'application/json'
                }
            });
            const contentType = response.headers.get('content-type') || '';
            if (!response.ok || !contentType.includes('application/json')) {
                console.debug('Unexpected API health response:', response.status, contentType);
                return null;
            }
            return await response.json();
        } catch (error) {
            console.debug('API health check failed:', error);
            return null;
        }
    }

    /**
     * PDF araçlarının listesini al
     */
    async getTools() {
        try {
            const response = await fetch(`${this.baseUrl}/tools`);
            if (!response.ok) throw new Error('Tools fetch failed');
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch tools:', error);
            throw error;
        }
    }

    /**
     * PDF dosyalarını yükle (merge için)
     */
    async uploadFilesForMerge(files) {
        try {
            const formData = new FormData();
            files.forEach(file => {
                formData.append('files', file);
            });

            const response = await fetch(`${this.baseUrl}/tools/merge/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Dosya yükleme hatası');
            }

            const data = await response.json();
            this.trackEvent('upload', 'merge');
            return data;
        } catch (error) {
            console.error('File upload failed:', error);
            throw error;
        }
    }

    /**
     * PDF birleştirme işlemini başlat
     */
    async processMerge(sessionId, sortByName = false) {
        try {
            const response = await fetch(
                `${this.baseUrl}/tools/merge/process/${sessionId}?sort_by_name=${sortByName}`,
                { method: 'POST' }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Birleştirme hatası');
            }

            const data = await response.json();
            this.trackEvent('process', 'merge');
            return data;
        } catch (error) {
            console.error('Merge process failed:', error);
            throw error;
        }
    }

    /**
     * Session durumunu kontrol et
     */
    async checkSession(sessionId) {
        try {
            const response = await fetch(`${this.baseUrl}/tools/merge/session/${sessionId}/check`);
            if (!response.ok) {
                throw new Error(`Session check failed: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Session check failed:', error);
            throw error;
        }
    }

    /**
     * Session temizle
     */
    async cleanupSession(sessionId) {
        try {
            await fetch(`${this.baseUrl}/tools/merge/session/${sessionId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.warn('Session cleanup failed:', error);
        }
    }

    /**
     * Dosya indirme URL'si oluştur
     */
    getDownloadUrl(sessionId, filename) {
        return `${this.baseUrl}/tools/merge/download/${sessionId}/${filename}`;
    }

    // ===== Organize APIs =====
    async uploadFilesForOrganize(files) {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        const res = await fetch(`${this.baseUrl}/tools/organize/upload`, { method: 'POST', body: formData });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Dosya yükleme hatası');
        }
        const data = await res.json();
        this.trackEvent('upload', 'organize');
        return data;
    }

    async processOrganize(sessionId, pageOrder) {
        const res = await fetch(`${this.baseUrl}/tools/organize/process/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pages: pageOrder })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Organize işlem hatası');
        }
        const data = await res.json();
        this.trackEvent('process', 'organize');
        return data;
    }

    getOrganizeDownloadUrl(sessionId, filename) {
        return `${this.baseUrl}/tools/organize/download/${sessionId}/${filename}`;
    }

    // ===== Split APIs =====
    async uploadFileForSplit(file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${this.baseUrl}/tools/split/upload`, { method: 'POST', body: formData });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Split yükleme hatası');
        }
        const data = await response.json();
        this.trackEvent('upload', 'split');
        return data;
    }

    async processSplit(sessionId, mode, options = {}) {
        const params = new URLSearchParams();
        params.set('mode', mode);
        if (options.pages) params.set('pages', options.pages);
        if (options.every_n) params.set('every_n', options.every_n);
        const response = await fetch(`${this.baseUrl}/tools/split/process/${sessionId}?${params.toString()}`, { method: 'POST' });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Split işlem hatası');
        }
        const data = await response.json();
        this.trackEvent('process', 'split');
        return data;
    }

    getSplitZipUrl(sessionId, zipFile) {
        return `${this.baseUrl}/tools/split/download/${sessionId}/${zipFile}`;
    }

    // ===== Compress APIs =====
    async uploadFilesForCompress(files) {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        const res = await fetch(`${this.baseUrl}/tools/compress/upload`, { method: 'POST', body: formData });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Sıkıştırma yükleme hatası');
        }
        const data = await res.json();
        this.trackEvent('upload', 'compress');
        return data;
    }

    async processCompress(sessionId, level = 'medium') {
        const res = await fetch(`${this.baseUrl}/tools/compress/process/${sessionId}?level=${encodeURIComponent(level)}`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Sıkıştırma işlem hatası');
        }
        const data = await res.json();
        this.trackEvent('process', 'compress');
        return data;
    }

    getCompressDownloadUrl(sessionId, filename) {
        return `${this.baseUrl}/tools/compress/download/${sessionId}/${filename}`;
    }

    // ===== PDF → Word APIs =====
    async uploadFileForPdfToWord(file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${this.baseUrl}/tools/pdf-to-word/upload`, { method: 'POST', body: formData });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF→Word yükleme hatası');
        }
        const data = await response.json();
        this.trackEvent('upload', 'pdf-to-word');
        return data;
    }

    async processPdfToWord(sessionId) {
        const res = await fetch(`${this.baseUrl}/tools/pdf-to-word/process/${sessionId}`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF→Word işlem hatası');
        }
        const data = await res.json();
        this.trackEvent('process', 'pdf-to-word');
        return data;
    }

    getPdfToWordDownloadUrl(sessionId, filename) {
        return `${this.baseUrl}/tools/pdf-to-word/download/${sessionId}/${filename}`;
    }
    // ===== Word → PDF APIs =====
    async uploadFileForWordToPdf(file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${this.baseUrl}/tools/word-to-pdf/upload`, { method: 'POST', body: formData });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Word→PDF yükleme hatası');
        }
        const data = await response.json();
        this.trackEvent('upload', 'word-to-pdf');
        return data;
    }

    async processWordToPdf(sessionId) {
        const res = await fetch(`${this.baseUrl}/tools/word-to-pdf/process/${sessionId}`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Word→PDF işlem hatası');
        }
        const data = await res.json();
        this.trackEvent('process', 'word-to-pdf');
        return data;
    }

    getWordToPdfDownloadUrl(sessionId, filename) {
        return `${this.baseUrl}/tools/word-to-pdf/download/${sessionId}/${filename}`;
    }

    // ===== PDF → PPT APIs =====
    async uploadFileForPdfToPpt(file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${this.baseUrl}/tools/pdf-to-ppt/upload`, { method: 'POST', body: formData });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF→PPT yükleme hatası');
        }
        const data = await response.json();
        this.trackEvent('upload', 'pdf-to-ppt');
        return data;
    }

    async processPdfToPpt(sessionId) {
        const res = await fetch(`${this.baseUrl}/tools/pdf-to-ppt/process/${sessionId}`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF→PPT işlem hatası');
        }
        const data = await res.json();
        this.trackEvent('process', 'pdf-to-ppt');
        return data;
    }

    getPdfToPptDownloadUrl(sessionId, filename) {
        return `${this.baseUrl}/tools/pdf-to-ppt/download/${sessionId}/${filename}`;
    }

    // ===== PDF Şifreleme APIs =====
    async uploadFilesForProtect(files) {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        const response = await fetch(`${this.baseUrl}/tools/protect/upload`, { method: 'POST', body: formData });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF Şifreleme yükleme hatası');
        }
        const data = await response.json();
        this.trackEvent('upload', 'protect');
        return data;
    }

    async processProtect(sessionId, protectionOptions) {
        const formData = new FormData();
        formData.append('user_password', protectionOptions.userPassword);
        if (protectionOptions.ownerPassword) {
            formData.append('owner_password', protectionOptions.ownerPassword);
        }
        formData.append('can_print', protectionOptions.canPrint);
        formData.append('can_modify', protectionOptions.canModify);
        formData.append('can_copy', protectionOptions.canCopy);
        formData.append('can_annotate', protectionOptions.canAnnotate);
        formData.append('can_fill_forms', protectionOptions.canFillForms);
        formData.append('can_accessibility', protectionOptions.canAccessibility);
        formData.append('can_assemble', protectionOptions.canAssemble);
        formData.append('can_modify_contents', protectionOptions.canModifyContents);

        const res = await fetch(`${this.baseUrl}/tools/protect/process/${sessionId}`, { method: 'POST', body: formData });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF Şifreleme işlem hatası');
        }
        const data = await res.json();
        this.trackEvent('process', 'protect');
        return data;
    }

    getProtectDownloadUrl(sessionId, filename) {
        return `${this.baseUrl}/tools/protect/download/${sessionId}/${filename}`;
    }

    // ===== PDF Şifre Kaldırma APIs =====
    async uploadFileForUnlock(file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${this.baseUrl}/tools/unlock/upload`, { method: 'POST', body: formData });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF Şifre Kaldırma yükleme hatası');
        }
        const data = await response.json();
        this.trackEvent('upload', 'unlock');
        return data;
    }

    async processUnlock(sessionId, password) {
        const formData = new FormData();
        formData.append('password', password);
        const response = await fetch(`${this.baseUrl}/tools/unlock/process/${sessionId}`, { method: 'POST', body: formData });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF Şifre Kaldırma işlemi hatası');
        }
        const data = await response.json();
        this.trackEvent('process', 'unlock');
        return data;
    }

    getUnlockDownloadUrl(sessionId, filename) {
        return `${this.baseUrl}/tools/unlock/download/${sessionId}/${filename}`;
    }

    // ===== Rotate APIs =====
    async uploadFilesForRotate(files) {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        const res = await fetch(`${this.baseUrl}/tools/rotate/upload`, { method: 'POST', body: formData });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF Döndürme yükleme hatası');
        }
        const data = await res.json();
        this.trackEvent('upload', 'rotate');
        return data;
    }

    async processRotate(sessionId, degrees) {
        const res = await fetch(`${this.baseUrl}/tools/rotate/process/${sessionId}?degrees=${encodeURIComponent(degrees)}`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF Döndürme işlem hatası');
        }
        const data = await res.json();
        this.trackEvent('process', 'rotate');
        return data;
    }

    getRotateDownloadUrl(sessionId, filename) {
        return `${this.baseUrl}/tools/rotate/download/${sessionId}/${filename}`;
    }

    // ===== Watermark APIs =====
    async uploadFilesForWatermark(files) {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        const res = await fetch(`${this.baseUrl}/tools/watermark/upload`, { method: 'POST', body: formData });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Filigran yükleme hatası');
        }
        const data = await res.json();
        this.trackEvent('upload', 'watermark');
        return data;
    }

    async processWatermark(sessionId, opts) {
        const params = new URLSearchParams();
        if (opts.text) params.set('text', opts.text);
        if (opts.position) params.set('position', opts.position);
        if (opts.fontSize) params.set('font_size', opts.fontSize);
        if (opts.color) params.set('color', opts.color);
        const res = await fetch(`${this.baseUrl}/tools/watermark/process/${sessionId}?${params.toString()}`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Filigran işlem hatası');
        }
        const data = await res.json();
        this.trackEvent('process', 'watermark');
        return data;
    }

    getWatermarkDownloadUrl(sessionId, filename) {
        return `${this.baseUrl}/tools/watermark/download/${sessionId}/${filename}`;
    }

    // ===== PDF → JPG APIs =====
    async uploadFileForPdfToJpg(file) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${this.baseUrl}/tools/pdf-to-jpg/upload`, { method: 'POST', body: formData });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF→JPG yükleme hatası');
        }
        const data = await res.json();
        this.trackEvent('upload', 'pdf-to-jpg');
        return data;
    }

    async processPdfToJpg(sessionId) {
        const res = await fetch(`${this.baseUrl}/tools/pdf-to-jpg/process/${sessionId}`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF→JPG işlem hatası');
        }
        const data = await res.json();
        this.trackEvent('process', 'pdf-to-jpg');
        return data;
    }

    getPdfToJpgDownloadUrl(sessionId, filename) {
        return `${this.baseUrl}/tools/pdf-to-jpg/download/${sessionId}/${filename}`;
    }
}

// Singleton instance
const pdfApi = new PDFApi();

export default pdfApi;
