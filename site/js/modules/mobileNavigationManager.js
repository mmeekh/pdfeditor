/**
 * Mobil navigasyon yönetimi
 * PDFişlemleri.com
 */

import toolManager from './toolManager.js';

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
        if (this.mobileToolsBtn) {
            this.mobileToolsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleMenu();
            });
        }

        this.mobileToolItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const toolName = item.getAttribute('data-tool');
                if (toolName) {
                    this.selectTool(toolName);
                }
            });
        });

        document.addEventListener('click', (e) => {
            if (this.isMenuOpen &&
                !this.mobileToolsMenu.contains(e.target) &&
                !this.mobileToolsBtn.contains(e.target)) {
                this.closeMenu();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMenuOpen) {
                this.closeMenu();
            }
        });

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

        this.addBackdrop();
        this.trackEvent('mobile_menu_opened');
    }

    closeMenu() {
        if (!this.mobileToolsMenu) return;

        this.isMenuOpen = false;
        this.mobileToolsMenu.classList.remove('show');

        if (this.toolsArrow) {
            this.toolsArrow.style.transform = 'rotate(0deg)';
        }

        this.removeBackdrop();
        this.trackEvent('mobile_menu_closed');
    }

    selectTool(toolName) {
        this.closeMenu();

        setTimeout(() => {
            toolManager.openTool(toolName);
        }, 150);

        this.trackEvent('mobile_tool_selected', { tool_name: toolName });
    }

    addBackdrop() {
        this.removeBackdrop();

        const backdrop = document.createElement('div');
        backdrop.className = 'mobile-menu-backdrop';
        backdrop.id = 'mobile-menu-backdrop';
        document.body.appendChild(backdrop);

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
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        if (window.dataLayer) {
            window.dataLayer.push({
                'event': eventName,
                'event_category': 'Mobile Navigation',
                'event_label': eventData.tool_name || 'unknown',
                'custom_parameters': eventData,
                'timestamp': new Date().toISOString()
            });
        }

        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                event_category: 'Mobile Navigation',
                event_label: eventData.tool_name || 'unknown',
                ...eventData
            });
        }

        console.log(`Mobile Navigation Event: ${eventName}`, typeof eventData === 'object' ? '[Object]' : eventData);

        setTimeout(() => {
            window.scrollTo(scrollX, scrollY);
        }, 0);
    }
}

export { MobileNavigationManager };

