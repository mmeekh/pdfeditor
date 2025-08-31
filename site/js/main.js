/**
 * Ana JavaScript koordinatörü
 * PDFişlemleri.com
 */

import pdfApi from './modules/api.js';
import notifications from './modules/notifications.js';
import pdfLoader from './modules/loader.js';
import fileHandler from './modules/fileHandler.js';
import toolManager from './modules/toolManager.js';
import mergeTool from './tools/merge.js';
import organizeTool from './tools/organize.js';
import { ThemeManager } from './theme-manager.js';

// Global API instance'larını window'a ekle
window.pdfApi = pdfApi;
window.notifications = notifications;
window.pdfLoader = pdfLoader;
window.fileHandler = fileHandler;
window.toolManager = toolManager;
window.mergeTool = mergeTool;
window.organizeTool = organizeTool;

// Tema yönetimi import edildi

// Cookie yönetimi
class CookieManager {
    constructor() {
        this.init();
    }
    
    init() {
        const cookieChoice = localStorage.getItem('cookieChoice');
        if (!cookieChoice) {
            this.show();
        }
    }
    
    show() {
        const notification = document.getElementById('cookie-notification');
        if (notification) {
            setTimeout(() => {
                notification.classList.remove('translate-y-full');
            }, 1000);
        }
    }
    
    hide() {
        const notification = document.getElementById('cookie-notification');
        if (notification) {
            notification.classList.add('translate-y-full');
        }
    }
    
    accept() {
        localStorage.setItem('cookieChoice', 'accepted');
        localStorage.setItem('cookieChoiceDate', new Date().toISOString());
        
        this.enableAnalytics();
        this.hide();
        
        notifications.success('Çerez tercihleriniz kaydedildi! 🍪');
        this.trackEvent('cookies_accepted', { timestamp: new Date().toISOString() });
    }
    
    reject() {
        localStorage.setItem('cookieChoice', 'rejected');
        localStorage.setItem('cookieChoiceDate', new Date().toISOString());
        
        this.disableAnalytics();
        this.hide();
        
        notifications.info('Çerezler reddedildi. Bazı özellikler çalışmayabilir.');
        this.trackEvent('cookies_rejected', { timestamp: new Date().toISOString() });
    }
    
    enableAnalytics() {
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', { 'analytics_storage': 'granted' });
        }
    }
    
    disableAnalytics() {
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', { 'analytics_storage': 'denied' });
        }
    }
    
    trackEvent(eventName, eventData) {
        console.debug('Event tracked:', eventName, eventData);
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, eventData);
        }
    }
}

// Performance monitoring
class PerformanceMonitor {
    constructor() {
        this.init();
    }
    
    init() {
        if ('performance' in window) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const navEntry = performance.getEntriesByType('navigation')[0];
                    const pageLoadTime = navEntry ? navEntry.loadEventEnd : 0;
                    if (pageLoadTime < 0) {
                        window.disableAutoScroll = true;
                    }
                    this.trackEvent('page_load', { load_time: pageLoadTime });
                }, 0);
            });
        }
    }
    
    trackEvent(eventName, eventData) {
        console.debug('Performance tracked:', eventName, eventData);
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, eventData);
        }
    }
}

// Lazy loading
class LazyLoader {
    constructor() {
        this.init();
    }
    
    init() {
        const images = document.querySelectorAll('img[data-src]');
        if (images.length > 0) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            images.forEach(img => imageObserver.observe(img));
        }
    }
}

// Global access for debugging
window.openTool = (toolName) => toolManager.openTool(toolName);
window.processFiles = () => toolManager.processCurrentTool();

// HTML Button Event Listeners (ID-based)
function initializeButtonEventListeners() {
    // Close tool button
    const closeToolButton = document.getElementById('closeToolButton');
    if (closeToolButton) {
        closeToolButton.addEventListener('click', () => toolManager.closeTool());
    }
    
    // Reset tool button  
    const resetToolButton = document.getElementById('resetToolButton');
    if (resetToolButton) {
        resetToolButton.addEventListener('click', () => toolManager.resetTool());
    }
    
    // Cookie buttons
    const acceptCookiesButton = document.getElementById('acceptCookiesButton');
    if (acceptCookiesButton) {
        acceptCookiesButton.addEventListener('click', () => window.cookieManager.accept());
    }
    
    const rejectCookiesButton = document.getElementById('rejectCookiesButton');
    if (rejectCookiesButton) {
        rejectCookiesButton.addEventListener('click', () => window.cookieManager.reject());
    }
}

// Ana uygulama başlatıcı
class App {
    constructor() {
        this.init();
    }
    
    async init() {
        try {
            // Manager'ları başlat
            window.themeManager = new ThemeManager();
            window.cookieManager = new CookieManager();
            window.performanceMonitor = new PerformanceMonitor();
            window.lazyLoader = new LazyLoader();
            
            // Scroll jump guard for programmatic downloads
            document.addEventListener('click', (e) => {
                const target = e.target.closest('a');
                if (target && target.hasAttribute('download')) {
                    // Scroll pozisyonunu koru
                    const x = window.scrollX;
                    const y = window.scrollY;
                    setTimeout(() => window.scrollTo(x, y), 0);
                }
            }, true);
            
            // Button event listener'larını başlat
            initializeButtonEventListeners();
            
            // API health check
            const health = await pdfApi.checkHealth();
            if (health) {
                console.debug('API Status:', health);
            } else {
                console.debug('API not available');
            }

            console.debug('PDFişlemleri.com loaded! 🎉');
            
        } catch (error) {
            console.error('App initialization failed:', error);
            notifications.error('Uygulama başlatılırken hata oluştu');
        }
    }
}

// DOM ready olduğunda uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});



export { App };
