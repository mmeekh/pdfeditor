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
        
        // Enhanced consent tracking
        if (window.dataLayer) {
            window.dataLayer.push({
                'event': 'cookie_consent',
                'event_category': 'Privacy',
                'event_label': 'accepted',
                'consent_type': 'all',
                'timestamp': new Date().toISOString()
            });
        }
        
        notifications.success('Çerez tercihleriniz kaydedildi! 🍪');
        this.trackEvent('cookies_accepted', { timestamp: new Date().toISOString() });
    }
    
    reject() {
        localStorage.setItem('cookieChoice', 'rejected');
        localStorage.setItem('cookieChoiceDate', new Date().toISOString());
        
        this.disableAnalytics();
        this.hide();
        
        // Enhanced consent tracking
        if (window.dataLayer) {
            window.dataLayer.push({
                'event': 'cookie_consent',
                'event_category': 'Privacy',
                'event_label': 'rejected',
                'consent_type': 'none',
                'timestamp': new Date().toISOString()
            });
        }
        
        notifications.info('Çerezler reddedildi. Bazı özellikler çalışmayabilir.');
        this.trackEvent('cookies_rejected', { timestamp: new Date().toISOString() });
    }
    
    enableAnalytics() {
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', { 
                'analytics_storage': 'granted',
                'ad_storage': 'granted',
                'ad_user_data': 'granted',
                'ad_personalization': 'granted',
                'functionality_storage': 'granted',
                'personalization_storage': 'granted',
                'security_storage': 'granted'
            });
        }
    }
    
    disableAnalytics() {
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', { 
                'analytics_storage': 'denied',
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied',
                'functionality_storage': 'denied',
                'personalization_storage': 'denied',
                'security_storage': 'denied'
            });
        }
    }
    
    trackEvent(eventName, eventData) {
        // Console'a yazdırmadan önce scroll pozisyonunu koru
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        
        // Sadece basit string log yap, büyük objeleri yazdırma
        console.log(`Event tracked: ${eventName}`, typeof eventData === 'object' ? '[Object]' : eventData);
        
        // Scroll pozisyonunu geri yükle
        setTimeout(() => {
            window.scrollTo(scrollX, scrollY);
        }, 0);
        
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
        // Scroll pozisyonunu koru
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        
        // Scroll pozisyonunu geri yükle
        setTimeout(() => {
            window.scrollTo(scrollX, scrollY);
        }, 0);
        
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

// Mobile Navigation Manager
class MobileNavigationManager {
    constructor() {
        this.isMenuOpen = false;
        this.init();
    }
    
    init() {
        this.mobileToolsBtn = document.getElementById('mobile-tools-btn');
        this.mobileToolsMenu = document.getElementById('mobile-tools-menu');
        this.toolsArrow = document.getElementById('tools-arrow');
        this.mobileToolItems = document.querySelectorAll('.mobile-tool-item');
        
        this.addEventListeners();
    }
    
    addEventListeners() {
        // Mobile tools button click
        if (this.mobileToolsBtn) {
            this.mobileToolsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleMenu();
            });
        }
        
        // Mobile tool items click
        this.mobileToolItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const toolName = item.getAttribute('data-tool');
                if (toolName) {
                    this.selectTool(toolName);
                }
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isMenuOpen && 
                !this.mobileToolsMenu.contains(e.target) && 
                !this.mobileToolsBtn.contains(e.target)) {
                this.closeMenu();
            }
        });
        
        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMenuOpen) {
                this.closeMenu();
            }
        });
        
        // Close menu on scroll
        window.addEventListener('scroll', () => {
            if (this.isMenuOpen) {
                this.closeMenu();
            }
        });
    }
    
    toggleMenu() {
        if (this.isMenuOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }
    
    openMenu() {
        if (!this.mobileToolsMenu) return;
        
        this.isMenuOpen = true;
        this.mobileToolsMenu.classList.add('show');
        
        if (this.toolsArrow) {
            this.toolsArrow.style.transform = 'rotate(180deg)';
        }
        
        // Add backdrop
        this.addBackdrop();
        
        // Analytics
        this.trackEvent('mobile_menu_opened');
    }
    
    closeMenu() {
        if (!this.mobileToolsMenu) return;
        
        this.isMenuOpen = false;
        this.mobileToolsMenu.classList.remove('show');
        
        if (this.toolsArrow) {
            this.toolsArrow.style.transform = 'rotate(0deg)';
        }
        
        // Remove backdrop
        this.removeBackdrop();
        
        // Analytics
        this.trackEvent('mobile_menu_closed');
    }
    
    selectTool(toolName) {
        // Close menu first
        this.closeMenu();
        
        // Open tool after a short delay for smooth transition
        setTimeout(() => {
            if (window.toolManager) {
                window.toolManager.openTool(toolName);
            }
        }, 150);
        
        // Analytics
        this.trackEvent('mobile_tool_selected', { tool_name: toolName });
    }
    
    addBackdrop() {
        // Remove existing backdrop if any
        this.removeBackdrop();
        
        const backdrop = document.createElement('div');
        backdrop.className = 'mobile-menu-backdrop';
        backdrop.id = 'mobile-menu-backdrop';
        document.body.appendChild(backdrop);
        
        // Show backdrop with animation
        setTimeout(() => {
            backdrop.classList.add('show');
        }, 10);
    }
    
    removeBackdrop() {
        const backdrop = document.getElementById('mobile-menu-backdrop');
        if (backdrop) {
            backdrop.classList.remove('show');
            setTimeout(() => {
                if (backdrop.parentNode) {
                    backdrop.parentNode.removeChild(backdrop);
                }
            }, 300);
        }
    }
    
    trackEvent(eventName, eventData = {}) {
        // Scroll pozisyonunu koru
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        
        // GTM DataLayer event
        if (window.dataLayer) {
            window.dataLayer.push({
                'event': eventName,
                'event_category': 'Mobile Navigation',
                'event_label': eventData.tool_name || 'unknown',
                'custom_parameters': eventData,
                'timestamp': new Date().toISOString()
            });
        }
        
        // GA4 fallback
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                event_category: 'Mobile Navigation',
                event_label: eventData.tool_name || 'unknown',
                ...eventData
            });
        }
        
        // Console log
        console.log(`Mobile Navigation Event: ${eventName}`, typeof eventData === 'object' ? '[Object]' : eventData);
        
        // Scroll pozisyonunu geri yükle
        setTimeout(() => {
            window.scrollTo(scrollX, scrollY);
        }, 0);
    }
}

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
            window.mobileNavigationManager = new MobileNavigationManager();
            
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
            try {
                const health = await pdfApi.checkHealth();
                // Scroll pozisyonunu koru
                const scrollX = window.scrollX;
                const scrollY = window.scrollY;
                setTimeout(() => {
                    window.scrollTo(scrollX, scrollY);
                }, 0);
            } catch (error) {
                // Scroll pozisyonunu koruyarak console log
                const scrollX = window.scrollX;
                const scrollY = window.scrollY;
                console.warn('API not available:', error.message || error);
                setTimeout(() => {
                    window.scrollTo(scrollX, scrollY);
                }, 0);
                notifications.info('Bazı özellikler çevrimdışı olabilir');
            }
            
            // Scroll pozisyonunu koru
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            setTimeout(() => {
                window.scrollTo(scrollX, scrollY);
            }, 0);
            
        } catch (error) {
            // Scroll pozisyonunu koruyarak console log
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            console.error('App initialization failed:', error.message || error);
            setTimeout(() => {
                window.scrollTo(scrollX, scrollY);
            }, 0);
            notifications.error('Uygulama başlatılırken hata oluştu');
        }
    }
}

// DOM ready olduğunda uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    // Mobil navigasyon yöneticisini global olarak erişilebilir yap
    window.mobileNavigationManager = new MobileNavigationManager();
});



export { App };
