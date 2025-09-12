/**
 * HTML buton olay dinleyicileri
 * PDFişlemleri.com
 */

import toolManager from './toolManager.js';

function initializeButtonEventListeners() {
    const closeToolButton = document.getElementById('closeToolButton');
    if (closeToolButton) {
        closeToolButton.addEventListener('click', () => toolManager.closeTool());
    }

    const resetToolButton = document.getElementById('resetToolButton');
    if (resetToolButton) {
        resetToolButton.addEventListener('click', () => toolManager.resetTool());
    }

    const acceptCookiesButton = document.getElementById('acceptCookiesButton');
    if (acceptCookiesButton) {
        acceptCookiesButton.addEventListener('click', () => window.cookieManager.accept());
    }

    const rejectCookiesButton = document.getElementById('rejectCookiesButton');
    if (rejectCookiesButton) {
        rejectCookiesButton.addEventListener('click', () => window.cookieManager.reject());
    }
}

export { initializeButtonEventListeners };

