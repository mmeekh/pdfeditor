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
        this.setTheme(this.currentTheme === 'dark' ? 'light' : 'dark');
    }
    
    toggleComfortMode() {
        this.setTheme(this.currentTheme === 'comfort' ? 'light' : 'comfort');
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
            body.classList.remove('theme-dark', 'theme-comfort');
            html.classList.remove('theme-dark', 'theme-comfort');
            
            if (this.currentTheme === 'dark') {
                body.classList.add('theme-dark');
                html.classList.add('theme-dark');
            } else if (this.currentTheme === 'comfort') {
                body.classList.add('theme-comfort');
                html.classList.add('theme-comfort');
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
