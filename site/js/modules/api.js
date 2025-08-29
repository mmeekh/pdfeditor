/**
 * API çağrıları ve backend entegrasyonu
 * PDFişlemleri.com
 */

class PDFApi {
    constructor() {
        this.baseUrl = window.location.origin + '/api';
    }

    /**
     * API health check
     */
    async checkHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/status`);
            return await response.json();
        } catch (error) {
            console.error('API health check failed:', error);
            throw error;
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

            return await response.json();
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

            return await response.json();
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

    // ===== Split APIs =====
    async uploadFileForSplit(file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${this.baseUrl}/tools/split/upload`, { method: 'POST', body: formData });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Split yükleme hatası');
        }
        return response.json();
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
        return response.json();
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
        return res.json();
    }

    async processCompress(sessionId, level = 'medium') {
        const res = await fetch(`${this.baseUrl}/tools/compress/process/${sessionId}?level=${encodeURIComponent(level)}`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Sıkıştırma işlem hatası');
        }
        return res.json();
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
        return response.json();
    }

    async processPdfToWord(sessionId) {
        const res = await fetch(`${this.baseUrl}/tools/pdf-to-word/process/${sessionId}`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF→Word işlem hatası');
        }
        return res.json();
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
        return response.json();
    }

    async processWordToPdf(sessionId) {
        const res = await fetch(`${this.baseUrl}/tools/word-to-pdf/process/${sessionId}`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Word→PDF işlem hatası');
        }
        return res.json();
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
        return response.json();
    }

    async processPdfToPpt(sessionId) {
        const res = await fetch(`${this.baseUrl}/tools/pdf-to-ppt/process/${sessionId}`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF→PPT işlem hatası');
        }
        return res.json();
    }

    getPdfToPptDownloadUrl(sessionId, filename) {
        return `${this.baseUrl}/tools/pdf-to-ppt/download/${sessionId}/${filename}`;
    }

    // ===== PDF Şifreleme APIs =====
    async uploadFileForProtect(file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${this.baseUrl}/tools/protect/upload`, { method: 'POST', body: formData });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF Şifreleme yükleme hatası');
        }
        return response.json();
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
        return res.json();
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
        return response.json();
    }

    async processUnlock(sessionId, password) {
        const formData = new FormData();
        formData.append('password', password);
        const response = await fetch(`${this.baseUrl}/tools/unlock/process/${sessionId}`, { method: 'POST', body: formData });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF Şifre Kaldırma işlemi hatası');
        }
        return response.json();
    }

    getUnlockDownloadUrl(sessionId, filename) {
        return `${this.baseUrl}/tools/unlock/download/${sessionId}/${filename}`;
    }
}

// Singleton instance
const pdfApi = new PDFApi();

export default pdfApi;
