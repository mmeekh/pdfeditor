/**
 * Error Page Manager - 404 ve 500 sayfaları için JavaScript
 * Arama ve yönlendirme fonksiyonları
 */

class ErrorPageManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindSearchEvents();
        this.bindToolLinkEvents();
    }

    bindSearchEvents() {
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('search-input');
        
        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => {
                this.performSearch();
            });
            
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }
    }

    bindToolLinkEvents() {
        const toolLinks = document.querySelectorAll('.tool-link');
        toolLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const toolName = link.getAttribute('data-tool');
                this.openTool(toolName);
            });
        });
    }

    performSearch() {
        const searchTerm = document.getElementById('search-input').value.trim();
        if (searchTerm) {
            // Redirect to main page with search parameter
            window.location.href = `/?search=${encodeURIComponent(searchTerm)}`;
        }
    }

    openTool(toolName) {
        // Redirect to main page and open tool
        window.location.href = `/#${toolName}`;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new ErrorPageManager();
});

// Export for module usage
export default ErrorPageManager;
