/**
 * Performans izleme
 * PDFişlemleri.com
 */

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
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        setTimeout(() => {
            window.scrollTo(scrollX, scrollY);
        }, 0);

        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, eventData);
        }
    }
}

export { PerformanceMonitor };

