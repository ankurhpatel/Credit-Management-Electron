class SearchDropdownWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.searchResults = [];
        this.selectedItem = null;
        this.isOpen = false;
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            placeholder: 'Type to search...',
            searchUrl: null,
            searchFunction: null,
            displayProperty: 'name',
            valueProperty: 'id',
            minSearchLength: 2,
            maxResults: 10,
            debounceDelay: 300,
            allowEmpty: true,
            showNoResults: true
        };
    }

    async getTemplate() {
        return `
            <div class="search-dropdown-wrapper">
                <input type="text" 
                       class="search-input" 
                       placeholder="${this.options.placeholder}"
                       autocomplete="off">
                <input type="hidden" class="search-value">
                <div class="search-dropdown" style="display: none;">
                    <div class="search-results"></div>
                </div>
                <div class="search-loading" style="display: none;">
                    <div class="loading-spinner"></div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const searchInput = this.$('.search-input');
        const dropdown = this.$('.search-dropdown');

        if (searchInput) {
            // Search input events
            this.addEventListener(searchInput, 'input', this.debounce(this.handleSearch, this.options.debounceDelay));
            this.addEventListener(searchInput, 'focus', () => this.handleFocus());
            this.addEventListener(searchInput, 'blur', () => this.handleBlur());
            this.addEventListener(searchInput, 'keydown', (e) => this.handleKeydown(e));
        }

        // Click outside to close
        this.addEventListener(document, 'click', (e) => {
            if (!this.container.contains(e.target)) {
                this.close();
            }
        });
    }

    async handleSearch(event) {
        const query = event.target.value.trim();

        if (query.length < this.options.minSearchLength) {
            this.close();
            return;
        }

        this.showLoading();

        try {
            let results = [];

            if (this.options.searchFunction) {
                results = await this.options.searchFunction(query);
            } else if (this.options.searchUrl) {
                const response = await fetch(`${this.options.searchUrl}?q=${encodeURIComponent(query)}`);
                if (response.ok) {
                    results = await response.json();
                }
            }

            this.searchResults = results.slice(0, this.options.maxResults);
            this.showResults();
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Search failed');
        } finally {
            this.hideLoading();
        }
    }

    handleFocus() {
        if (this.searchResults.length > 0) {
            this.open();
        }
    }

    handleBlur() {
        // Delay to allow click on dropdown items
        setTimeout(() => {
            this.close();
        }, 200);
    }

    handleKeydown(event) {
        const items = this.$$('.search-result-item');
        const activeItem = this.$('.search-result-item.active');

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.navigateResults(1, items, activeItem);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.navigateResults(-1, items, activeItem);
                break;
            case 'Enter':
                event.preventDefault();
                if (activeItem) {
                    this.selectItem(activeItem);
                }
                break;
            case 'Escape':
                this.close();
                break;
        }
    }

    navigateResults(direction, items, activeItem) {
        if (items.length === 0) return;

        // Remove current active
        if (activeItem) {
            activeItem.classList.remove('active');
        }

        let newIndex = 0;
        if (activeItem) {
            const currentIndex = Array.from(items).indexOf(activeItem);
            newIndex = currentIndex + direction;
        }

        // Wrap around
        if (newIndex < 0) newIndex = items.length - 1;
        if (newIndex >= items.length) newIndex = 0;

        items[newIndex].classList.add('active');
        items[newIndex].scrollIntoView({ block: 'nearest' });
    }

    showResults() {
        const resultsContainer = this.$('.search-results');
        if (!resultsContainer) return;

        if (this.searchResults.length === 0) {
            if (this.options.showNoResults) {
                resultsContainer.innerHTML = '<div class="no-results">No results found</div>';
                this.open();
            }
            return;
        }

        resultsContainer.innerHTML = this.searchResults.map((item, index) => `
            <div class="search-result-item" data-index="${index}">
                <div class="result-main">${this.getDisplayText(item)}</div>
                <div class="result-sub">${this.getSubText(item)}</div>
            </div>
        `).join('');

        // Bind click events
        this.$$('.search-result-item').forEach(item => {
            this.addEventListener(item, 'click', () => this.selectItem(item));
            this.addEventListener(item, 'mouseenter', () => {
                this.$$('.search-result-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });

        this.open();
    }

    selectItem(itemElement) {
        const index = parseInt(itemElement.getAttribute('data-index'));
        const item = this.searchResults[index];

        if (item) {
            this.selectedItem = item;

            // Update input values
            this.$('.search-input').value = this.getDisplayText(item);
            this.$('.search-value').value = this.getValueText(item);

            // Emit selection event
            this.emit('itemSelected', { item, element: itemElement });

            this.close();
        }
    }

    getDisplayText(item) {
        return item[this.options.displayProperty] || item.toString();
    }

    getSubText(item) {
        // Override in subclasses or options
        return item.email || item.description || '';
    }

    getValueText(item) {
        return item[this.options.valueProperty] || item.toString();
    }

    open() {
        const dropdown = this.$('.search-dropdown');
        if (dropdown) {
            dropdown.style.display = 'block';
            this.isOpen = true;
        }
    }

    close() {
        const dropdown = this.$('.search-dropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
            this.isOpen = false;
        }
    }

    showLoading() {
        const loading = this.$('.search-loading');
        if (loading) {
            loading.style.display = 'block';
        }
    }

    hideLoading() {
        const loading = this.$('.search-loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    showError(message) {
        const resultsContainer = this.$('.search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = `<div class="search-error">${message}</div>`;
            this.open();
        }
    }

    // Utility function for debouncing
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Public API
    getValue() {
        return this.$('.search-value').value;
    }

    setValue(value, displayText = '') {
        this.$('.search-value').value = value;
        if (displayText) {
            this.$('.search-input').value = displayText;
        }
    }

    clear() {
        this.$('.search-input').value = '';
        this.$('.search-value').value = '';
        this.selectedItem = null;
        this.searchResults = [];
        this.close();
    }

    getSelectedItem() {
        return this.selectedItem;
    }
}

window.SearchDropdownWidget = SearchDropdownWidget;
