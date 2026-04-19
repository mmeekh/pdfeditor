/**
 * Ana JavaScript başlatıcısı
 * PDFişlemleri.com
 */

import pdfApi from './modules/api.js';
import notifications from './modules/notifications.js';
import pdfLoader from './modules/loader.js';
import fileHandler from './modules/fileHandler.js';
import toolManager from './modules/toolManager.js';
import handoffStorage from './modules/handoffStorage.js';
import { initToolSearch } from './modules/toolSearch.js?v=72123b5d';
import mergeTool from './tools/merge.js';
import organizeTool from './tools/organize.js';
import pdfToTxtTool from './tools/pdf-to-txt.js';
import { App } from './modules/app.js';

// Global API instance'larını window'a ekle
window.pdfApi = pdfApi;
window.notifications = notifications;
window.pdfLoader = pdfLoader;
window.fileHandler = fileHandler;
window.toolManager = toolManager;
window.handoffStorage = handoffStorage;
window.mergeTool = mergeTool;
window.organizeTool = organizeTool;
window.pdfToTxtTool = pdfToTxtTool;

// Global access for debugging
window.openTool = (toolName) => toolManager.openTool(toolName);
window.processFiles = () => toolManager.processCurrentTool();

// Tool sayfasında otomatik açılış (data-auto-tool) + handoff alımı
async function autoInitToolPage() {
    const section = document.getElementById('toolInterface');
    if (!section) return;
    const autoTool = section.getAttribute('data-auto-tool');
    if (!autoTool) return;

    // Arka planda TTL geçmiş handoff'ları temizle
    handoffStorage.gc();

    const params = new URLSearchParams(window.location.search);
    const token = params.get('handoff');
    if (token) {
        try {
            const files = await handoffStorage.take(token);
            // URL'den handoff paramını temizle
            params.delete('handoff');
            const qs = params.toString();
            history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
            if (files && files.length) {
                toolManager.openToolWithFiles(autoTool, files);
                return;
            }
        } catch (err) {
            console.warn('Handoff alımı başarısız:', err);
        }
    }
    toolManager.openTool(autoTool);
}

// DOM ready olduğunda uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    // App init'ten sonra tool sayfası auto-init
    setTimeout(autoInitToolPage, 100);
    // Header search (desktop + mobile)
    initToolSearch();
});

