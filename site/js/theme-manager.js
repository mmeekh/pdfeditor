/**
 * Tema Yönetimi
 * PDFişlemleri.com
 */

// Tema yönetimi
class ThemeManager {
    constructor() {
        this.themes = {
            light: 'light',
            dark: 'dark',
            comfort: 'comfort'
        };
        this.currentTheme = 'light';
        this.init();
    }
    
    init() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
        this.addEventListeners();
        this.applyTheme();
    }
    
    addEventListeners() {
        const nightModeBtn = document.getElementById('night-mode-btn');
        const comfortModeBtn = document.getElementById('comfort-mode-btn');
        
        if (nightModeBtn) {
            nightModeBtn.addEventListener('click', () => this.toggleNightMode());
            nightModeBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleNightMode();
                }
            });
        }
        
        if (comfortModeBtn) {
            comfortModeBtn.addEventListener('click', () => this.toggleComfortMode());
            comfortModeBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleComfortMode();
                }
            });
        }
    }
    
    toggleNightMode() {
        // Mobil menü açıksa kapatma
        const mobileMenu = document.getElementById('mobile-tools-menu');
        const isMobileMenuOpen = mobileMenu && mobileMenu.classList.contains('show');
        
        this.setTheme(this.currentTheme === 'dark' ? 'light' : 'dark');
        
        // Mobil menü açıksa tekrar aç
        if (isMobileMenuOpen && window.mobileNavigationManager) {
            setTimeout(() => {
                window.mobileNavigationManager.openMenu();
            }, 100);
        }
    }
    
    toggleComfortMode() {
        // Mobil menü açıksa kapatma
        const mobileMenu = document.getElementById('mobile-tools-menu');
        const isMobileMenuOpen = mobileMenu && mobileMenu.classList.contains('show');
        
        this.setTheme(this.currentTheme === 'comfort' ? 'light' : 'comfort');
        
        // Mobil menü açıksa tekrar aç
        if (isMobileMenuOpen && window.mobileNavigationManager) {
            setTimeout(() => {
                window.mobileNavigationManager.openMenu();
            }, 100);
        }
    }
    
    setTheme(theme) {
        const previousTheme = this.currentTheme;
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        this.applyTheme();
        this.updateButtonStates();
        
        // Theme change tracking
        if (window.dataLayer) {
            window.dataLayer.push({
                'event': 'theme_change',
                'event_category': 'User Preferences',
                'event_label': theme,
                'previous_theme': previousTheme || 'light',
                'new_theme': theme,
                'timestamp': new Date().toISOString()
            });
        }
    }
    
    applyTheme() {
        const body = document.body;
        const html = document.documentElement;
        
        requestAnimationFrame(() => {
            // Eski class'ları temizle
            body.classList.remove('theme-dark', 'theme-comfort', 'dark', 'comfort');
            html.classList.remove('theme-dark', 'theme-comfort', 'dark', 'comfort');
            
            if (this.currentTheme === 'dark') {
                body.classList.add('theme-dark', 'dark');
                html.classList.add('theme-dark', 'dark');
            } else if (this.currentTheme === 'comfort') {
                body.classList.add('theme-comfort', 'comfort');
                html.classList.add('theme-comfort', 'comfort');
            }
            
            // Footer tema değişikliğini zorla uygula
            this.forceFooterTheme();
            
            // Fix CTA button text visibility
            this.fixCTAButtons();
        });
    }
    
    forceFooterTheme() {
        const footer = document.querySelector('.site-footer');
        if (footer) {
            // CSS transition'ı geçici olarak devre dışı bırak
            footer.style.transition = 'none';
            
            // Tema değişikliğini zorla uygula
            if (this.currentTheme === 'dark') {
                footer.style.backgroundColor = '#1a1a1a';
                footer.style.color = '#e5e5e5';
            } else if (this.currentTheme === 'comfort') {
                footer.style.backgroundColor = '#f8f9fa';
                footer.style.color = '#2c3e50';
            } else {
                footer.style.backgroundColor = '#FFFFFF';
                footer.style.color = '#333333';
            }
            
            // Transition'ı geri aç
            setTimeout(() => {
                footer.style.transition = '';
            }, 100);
        }
    }
    
    fixCTAButtons() {
        const buttons = document.querySelectorAll('a[style*="color: #1f2937"]');
        buttons.forEach(button => {
            if (this.currentTheme === 'dark' || this.currentTheme === 'comfort') {
                button.style.color = 'var(--text-primary)';
            } else {
                button.style.color = '#1f2937';
            }
        });
    }
    
    updateButtonStates() {
        const nightModeBtn = document.getElementById('night-mode-btn');
        const comfortModeBtn = document.getElementById('comfort-mode-btn');
        
        if (nightModeBtn) {
            nightModeBtn.classList.toggle('active', this.currentTheme === 'dark');
        }
        
        if (comfortModeBtn) {
            comfortModeBtn.classList.toggle('active', this.currentTheme === 'comfort');
        }
    }
}

// Global tema yöneticisini başlat
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});

export { ThemeManager };
