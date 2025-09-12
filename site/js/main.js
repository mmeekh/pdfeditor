/**
 * Ana JavaScript başlatıcısı
 * PDFişlemleri.com
 */

import pdfApi from './modules/api.js';
import notifications from './modules/notifications.js';
import pdfLoader from './modules/loader.js';
import fileHandler from './modules/fileHandler.js';
import toolManager from './modules/toolManager.js';
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
window.mergeTool = mergeTool;
window.organizeTool = organizeTool;
window.pdfToTxtTool = pdfToTxtTool;

// Global access for debugging
window.openTool = (toolName) => toolManager.openTool(toolName);
window.processFiles = () => toolManager.processCurrentTool();

// DOM ready olduğunda uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

