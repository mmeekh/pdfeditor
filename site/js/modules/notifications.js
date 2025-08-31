/**
 * Bildirim sistemi
 * PDFişlemleri.com
 */

class NotificationManager {
    constructor() {
        this.container = document.getElementById('notificationContainer');
        if (!this.container) {
            console.warn('Notification container not found');
        }
    }

    /**
     * Bildirim göster
     */
    show(message, type = 'success', duration = 2000) {
        if (!this.container) return;

        // Bildirim elementi oluştur
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // İkon belirle
        let icon = 'fas fa-check-circle';
        if (type === 'error') icon = 'fas fa-exclamation-circle';
        if (type === 'info') icon = 'fas fa-info-circle';
        
        notification.innerHTML = `
            <i class="${icon} notification-icon"></i>
            <span>${message}</span>
        `;
        
        // Container'a ekle
        this.container.appendChild(notification);
        
        // Animasyon için setTimeout
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Belirtilen süre sonra kaldır
        setTimeout(() => {
            this.hide(notification);
        }, duration);

        return notification;
    }

    /**
     * Bildirimi gizle
     */
    hide(notification) {
        if (!notification || !this.container) return;

        notification.classList.add('hide');
        setTimeout(() => {
            if (this.container.contains(notification)) {
                this.container.removeChild(notification);
            }
        }, 300);
    }

    /**
     * Tüm bildirimleri temizle
     */
    clear() {
        if (!this.container) return;
        
        const notifications = this.container.querySelectorAll('.notification');
        notifications.forEach(notification => this.hide(notification));
    }

    /**
     * Başarı bildirimi
     */
    success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }

    /**
     * Hata bildirimi
     */
    error(message, duration = 4000) {
        return this.show(message, 'error', duration);
    }

    /**
     * Bilgi bildirimi
     */
    info(message, duration = 2000) {
        return this.show(message, 'info', duration);
    }
}

// Singleton instance
const notifications = new NotificationManager();

export default notifications;
