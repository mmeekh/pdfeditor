/**
 * Çerez yönetimi
 * PDFişlemleri.com
 */

import notifications from './notifications.js';

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
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        console.log(`Event tracked: ${eventName}`, typeof eventData === 'object' ? '[Object]' : eventData);

        setTimeout(() => {
            window.scrollTo(scrollX, scrollY);
        }, 0);

        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, eventData);
        }
    }
}

export { CookieManager };

