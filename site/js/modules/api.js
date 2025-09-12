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

    // ===== Organize APIs =====
    async uploadFilesForOrganize(files) {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        const res = await fetch(`${this.baseUrl}/tools/organize/upload`, { method: 'POST', body: formData });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Dosya yükleme hatası');
        }
        return res.json();
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
        return res.json();
    }

    getOrganizeDownloadUrl(sessionId, filename) {
        return `${this.baseUrl}/tools/organize/download/${sessionId}/${filename}`;
    }

    // ===== Split APIs =====
    async uploadFilesForSplit(files) {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });
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
        if (options.pages) {
            // Sayfa parametresini temizle
            const cleanPages = options.pages.replace(/[^\d,\-\s]/g, '');
            params.set('pages', cleanPages);
        }
        if (options.every_n) {
            params.set('every_n', options.every_n);
        }
        
        const url = `${this.baseUrl}/tools/split/process/${sessionId}?${params.toString()}`;
        console.log('Split API URL:', url); // Debug için
        
        const response = await fetch(url, { method: 'POST' });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('Split API Error:', err); // Debug için
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
    async uploadFilesForPdfToWord(files) {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });
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
    async uploadFilesForWordToPdf(files) {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });
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
    async uploadFilesForPdfToPpt(files) {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });
        const response = await fetch(`${this.baseUrl}/tools/pdf-to-ppt/upload`, { method: 'POST', body: formData });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF→PPT yükleme hatası');
        }
        return response.json();
    }

    async processPdfToPpt(sessionId, mode = 'separate') {
        const res = await fetch(`${this.baseUrl}/tools/pdf-to-ppt/process/${sessionId}?mode=${encodeURIComponent(mode)}`, { method: 'POST' });
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
    async uploadFilesForProtect(files) {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
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

    // ===== Rotate APIs =====
    async uploadFilesForRotate(files) {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        const res = await fetch(`${this.baseUrl}/tools/rotate/upload`, { method: 'POST', body: formData });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF Döndürme yükleme hatası');
        }
        return res.json();
    }

    async processRotate(sessionId, degrees) {
        const res = await fetch(`${this.baseUrl}/tools/rotate/process/${sessionId}?degrees=${encodeURIComponent(degrees)}`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF Döndürme işlem hatası');
        }
        return res.json();
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
        return res.json();
    }

    async processWatermark(sessionId, opts) {
        const params = new URLSearchParams();
        if (opts.text) params.set('text', opts.text);
        if (opts.position) params.set('position', opts.position);
        if (opts.fontSize) params.set('font_size', opts.fontSize);
        if (opts.color) params.set('color', opts.color);
        if (opts.opacity !== undefined) params.set('opacity', opts.opacity);
        const res = await fetch(`${this.baseUrl}/tools/watermark/process/${sessionId}?${params.toString()}`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Filigran işlem hatası');
        }
        return res.json();
    }

    getWatermarkDownloadUrl(sessionId, filename) {
        return `${this.baseUrl}/tools/watermark/download/${sessionId}/${filename}`;
    }

    // ===== PDF → JPG APIs =====
    async uploadFilesForPdfToJpg(files) {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });
        const res = await fetch(`${this.baseUrl}/tools/pdf-to-jpg/upload`, { method: 'POST', body: formData });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF→JPG yükleme hatası');
        }
        return res.json();
    }

    async processPdfToJpg(sessionId) {
        const res = await fetch(`${this.baseUrl}/tools/pdf-to-jpg/process/${sessionId}`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF→JPG işlem hatası');
        }
        return res.json();
    }

    getPdfToJpgDownloadUrl(sessionId, filename) {
        return `${this.baseUrl}/tools/pdf-to-jpg/download/${sessionId}/${filename}`;
    }

    // ===== PDF İmzalama APIs =====
    async uploadFilesForSign(files) {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });
        const res = await fetch(`${this.baseUrl}/tools/sign/upload`, { method: 'POST', body: formData });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF İmzalama yükleme hatası');
        }
        return res.json();
    }

    async processSign(sessionId, name, surname, signatureData, signatureType, opacity, selectedFiles, signaturePositions) {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('surname', surname);
        formData.append('signature_data', signatureData);
        formData.append('signature_type', signatureType);
        formData.append('opacity', opacity);
        formData.append('selected_files', selectedFiles);
        formData.append('signature_positions', signaturePositions);

        const res = await fetch(`${this.baseUrl}/tools/sign/process/${sessionId}`, { method: 'POST', body: formData });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF İmzalama işlem hatası');
        }
        return res.json();
    }

    getSignDownloadUrl(sessionId, filename) {
        return `${this.baseUrl}/tools/sign/download/${sessionId}/${filename}`;
    }

    // ===== PDF OCR APIs =====
    async uploadFilesForPdfOcr(files) {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });
        const response = await fetch(`${this.baseUrl}/tools/pdf-ocr/upload`, { method: 'POST', body: formData });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF OCR yükleme hatası');
        }
        return response.json();
    }

    async processPdfOcr(sessionId, language = 'tur+eng', dpi = 300, includeCoordinates = false) {
        const formData = new FormData();
        formData.append('language', language);
        formData.append('dpi', dpi.toString());
        formData.append('include_coordinates', includeCoordinates.toString());

        const response = await fetch(`${this.baseUrl}/tools/pdf-ocr/process/${sessionId}`, { 
            method: 'POST', 
            body: formData 
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF OCR işlem hatası');
        }
        return response.json();
    }

    getPdfOcrDownloadUrl(sessionId) {
        return `${this.baseUrl}/tools/pdf-ocr/download/${sessionId}`;
    }

    async getSupportedOcrLanguages() {
        try {
            const response = await fetch(`${this.baseUrl}/tools/pdf-ocr/languages`);
            if (!response.ok) throw new Error('Languages fetch failed');
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch OCR languages:', error);
            throw error;
        }
    }

    // ===== PDF → Excel APIs =====
    async uploadFilesForPdfToExcel(files) {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });
        const response = await fetch(`${this.baseUrl}/tools/pdf-to-excel/upload`, { method: 'POST', body: formData });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF→Excel yükleme hatası');
        }
        return response.json();
    }

    async processPdfToExcel(sessionId, pages = 'all', password = null, mergeParagraphs = true, minParagraphLines = 5, detectionMethod = 'auto') {
        const params = new URLSearchParams();
        params.set('pages', pages);
        if (password) {
            params.set('password', password);
        }
        params.set('merge_paragraphs', mergeParagraphs);
        params.set('min_paragraph_lines', minParagraphLines);
        params.set('detection_method', detectionMethod);
        
        const response = await fetch(`${this.baseUrl}/tools/pdf-to-excel/process/${sessionId}?${params.toString()}`, { method: 'POST' });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF→Excel işlem hatası');
        }
        return response.json();
    }

    getPdfToExcelDownloadUrl(sessionId, filename) {
        return `${this.baseUrl}/tools/pdf-to-excel/download/${sessionId}/${filename}`;
    }

    // ===== PDF/Word → TXT APIs =====
    async uploadFilesForPdfToTxt(files) {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });
        const response = await fetch(`${this.baseUrl}/tools/pdf-to-txt/upload`, { method: 'POST', body: formData });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF/Word→TXT yükleme hatası');
        }
        return response.json();
    }

    async processPdfToTxt(sessionId) {
        const response = await fetch(`${this.baseUrl}/tools/pdf-to-txt/process/${sessionId}`, { method: 'POST' });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'PDF/Word→TXT işlem hatası');
        }
        return response.json();
    }

    getPdfToTxtDownloadUrl(sessionId, filename) {
        return `${this.baseUrl}/tools/pdf-to-txt/download/${sessionId}/${filename}`;
    }
}

// Singleton instance
const pdfApi = new PDFApi();

export default pdfApi;
