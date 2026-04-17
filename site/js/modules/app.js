/**
 * Ana uygulama sınıfı
 * PDFişlemleri.com
 */

import { ThemeManager } from '../theme-manager.js';
import { CookieManager } from './cookieManager.js';
import { PerformanceMonitor } from './performanceMonitor.js';
import { LazyLoader } from './lazyLoader.js';
import { MobileNavigationManager } from './mobileNavigationManager.js';
import { initializeButtonEventListeners } from './buttonListeners.js';
import pdfApi from './api.js';
import notifications from './notifications.js';

class App {
    constructor() {
        this.init();
    }

    async init() {
        try {
            window.themeManager = new ThemeManager();
            window.cookieManager = new CookieManager();
            window.performanceMonitor = new PerformanceMonitor();
            window.lazyLoader = new LazyLoader();
            window.mobileNavigationManager = new MobileNavigationManager();

            document.addEventListener('click', (e) => {
                const target = e.target.closest('a');
                if (target && target.hasAttribute('download')) {
                    const x = window.scrollX;
                    const y = window.scrollY;
                    setTimeout(() => window.scrollTo(x, y), 0);
                }
            }, true);

            initializeButtonEventListeners();

            // URL hash'ini kontrol et ve tool'u aç
            this.checkUrlHash();

            try {
                const health = await pdfApi.checkHealth();
                const scrollX = window.scrollX;
                const scrollY = window.scrollY;
                setTimeout(() => {
                    window.scrollTo(scrollX, scrollY);
                }, 0);
            } catch (error) {
                const scrollX = window.scrollX;
                const scrollY = window.scrollY;
                console.warn('API not available:', error.message || error);
                setTimeout(() => {
                    window.scrollTo(scrollX, scrollY);
                }, 0);
                notifications.info('Bazı özellikler çevrimdışı olabilir');
            }

            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            setTimeout(() => {
                window.scrollTo(scrollX, scrollY);
            }, 0);

        } catch (error) {
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            console.error('App initialization failed:', error.message || error);
            setTimeout(() => {
                window.scrollTo(scrollX, scrollY);
            }, 0);
            notifications.error('Uygulama başlatılırken hata oluştu');
        }
    }

    checkUrlHash() {
        const hash = window.location.hash.substring(1);
        if (!hash) return;
        // Eski /#merge, /#split gibi tool hash'larını ilgili tool sayfasına redirect et
        const toolUrlMap = {
            merge: '/pdf-birlestir', split: '/pdf-ayir', compress: '/pdf-sikistir',
            organize: '/pdf-sirala', sign: '/pdf-imzala', protect: '/pdf-sifrele',
            unlock: '/pdf-sifre-kaldir', rotate: '/pdf-dondur', watermark: '/pdf-filigran',
            'pdf-ocr': '/pdf-ocr', 'pdf-to-word': '/pdf-to-word', 'word-to-pdf': '/word-to-pdf',
            'pdf-to-ppt': '/pdf-to-ppt', 'pdf-to-excel': '/pdf-to-excel',
            'pdf-to-jpg': '/pdf-to-jpg', 'pdf-to-txt': '/pdf-to-txt'
        };
        if (toolUrlMap[hash]) {
            window.location.replace(toolUrlMap[hash]);
            return;
        }
        // #tools, #features vs. anchor — scroll yap, openTool çağırma
        const el = document.getElementById(hash);
        if (el) {
            setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
    }
}

export { App };

