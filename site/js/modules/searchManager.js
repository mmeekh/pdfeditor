/**
 * Search Manager - Ana sayfa arama fonksiyonality
 * PDF araçlarında arama yapma ve filtreleme
 */

class SearchManager {
    constructor() {
        this.searchInput = null;
        this.searchBtn = null;
        this.toolCards = [];
        this.init();
    }

    init() {
        this.searchInput = document.getElementById('main-search-input');
        this.searchBtn = document.getElementById('main-search-btn');
        this.toolCards = document.querySelectorAll('.tool-card');
        
        if (this.searchInput && this.searchBtn) {
            this.bindEvents();
        }
    }

    bindEvents() {
        // Search button click
        this.searchBtn.addEventListener('click', () => {
            this.performSearch();
        });
        
        // Enter key press
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // Real-time search (optional)
        this.searchInput.addEventListener('input', (e) => {
            if (e.target.value.length > 2) {
                this.performSearch();
            } else if (e.target.value.length === 0) {
                this.clearSearch();
            }
        });
    }

    performSearch() {
        const searchTerm = this.searchInput.value.trim().toLowerCase();
        if (!searchTerm) return;
        
        let foundTools = [];
        
        this.toolCards.forEach(card => {
            const toolName = card.querySelector('h3').textContent.toLowerCase();
            const toolDesc = card.querySelector('p').textContent.toLowerCase();
            
            if (toolName.includes(searchTerm) || toolDesc.includes(searchTerm)) {
                foundTools.push(card);
                card.style.display = 'block';
                card.classList.add('search-highlight');
            } else {
                card.style.display = 'none';
            }
        });
        
        // Show results message
        if (foundTools.length > 0) {
            this.showSearchResults(foundTools.length, searchTerm);
        } else {
            this.showNoResults(searchTerm);
        }
    }

    showSearchResults(count, term) {
        const toolsSection = document.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3.xl\\:grid-cols-4');
        let resultsDiv = document.getElementById('search-results');
        
        if (!resultsDiv) {
            resultsDiv = document.createElement('div');
            resultsDiv.id = 'search-results';
            resultsDiv.className = 'mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg';
            toolsSection.parentNode.insertBefore(resultsDiv, toolsSection);
        }
        
        resultsDiv.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <i class="fas fa-search text-blue-600 mr-2"></i>
                    <span class="font-semibold text-blue-800">"${term}" için ${count} sonuç bulundu</span>
                </div>
                <button onclick="searchManager.clearSearch()" class="text-blue-600 hover:text-blue-800 text-sm">
                    <i class="fas fa-times mr-1"></i>Temizle
                </button>
            </div>
        `;
    }

    showNoResults(term) {
        const toolsSection = document.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3.xl\\:grid-cols-4');
        let resultsDiv = document.getElementById('search-results');
        
        if (!resultsDiv) {
            resultsDiv = document.createElement('div');
            resultsDiv.id = 'search-results';
            resultsDiv.className = 'mb-6 p-4 bg-red-50 border border-red-200 rounded-lg';
            toolsSection.parentNode.insertBefore(resultsDiv, toolsSection);
        }
        
        resultsDiv.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <i class="fas fa-exclamation-circle text-red-600 mr-2"></i>
                    <span class="font-semibold text-red-800">"${term}" için sonuç bulunamadı</span>
                </div>
                <button onclick="searchManager.clearSearch()" class="text-red-600 hover:text-red-800 text-sm">
                    <i class="fas fa-times mr-1"></i>Temizle
                </button>
            </div>
        `;
    }

    clearSearch() {
        this.searchInput.value = '';
        this.toolCards.forEach(card => {
            card.style.display = 'block';
            card.classList.remove('search-highlight');
        });
        
        const resultsDiv = document.getElementById('search-results');
        if (resultsDiv) {
            resultsDiv.remove();
        }
    }
}

// Global instance
let searchManager;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    searchManager = new SearchManager();
});

// Export for module usage
export default SearchManager;
