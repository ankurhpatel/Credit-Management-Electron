class CustomerSearchWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.searchResults = [];
        this.selectedCustomer = null;
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            placeholder: '🔍 Search customers...',
            showAdvancedSearch: true,
            showRecentSearches: true,
            maxResults: 10,
            minSearchLength: 2
        };
    }

    async getTemplate() {
        return `
            <div class="customer-search-widget">
                <div class="search-header">
                    <h4>🔍 Customer Search</h4>
                    ${this.options.showAdvancedSearch ? `
                        <button class="advanced-search-toggle">Advanced Search</button>
                    ` : ''}
                </div>
                
                <div class="search-main">
                    <div class="search-input-container">
                        <input type="text" 
                               class="main-search-input" 
                               placeholder="${this.options.placeholder}">
                        <button class="search-btn">🔍</button>
                        <button class="clear-search-btn">✕</button>
                    </div>
                    
                    <div class="search-suggestions" style="display: none;"></div>
                </div>
                
                ${this.options.showAdvancedSearch ? this.getAdvancedSearchTemplate() : ''}
                
                <div class="search-results-container">
                    <div class="search-results"></div>
                </div>
                
                ${this.options.showRecentSearches ? this.getRecentSearchesTemplate() : ''}
            </div>
        `;
    }

    getAdvancedSearchTemplate() {
        return `
            <div class="advanced-search-panel" style="display: none;">
                <h5>Advanced Search Options</h5>
                <div class="advanced-search-fields">
                    <div class="field-group">
                        <label>Customer Name:</label>
                        <input type="text" name="name" class="advanced-field">
                    </div>
                    <div class="field-group">
                        <label>Email:</label>
                        <input type="email" name="email" class="advanced-field">
                    </div>
                    <div class="field-group">
                        <label>Phone:</label>
                        <input type="tel" name="phone" class="advanced-field">
                    </div>
                    <div class="field-group">
                        <label>Customer ID:</label>
                        <input type="text" name="customerId" class="advanced-field">
                    </div>
                    <div class="field-group">
                        <label>Status:</label>
                        <select name="status" class="advanced-field">
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <div class="field-group">
                        <label>Date Added:</label>
                        <div class="date-range">
                            <input type="date" name="dateFrom" class="advanced-field" placeholder="From">
                            <input type="date" name="dateTo" class="advanced-field" placeholder="To">
                        </div>
                    </div>
                </div>
                <div class="advanced-search-actions">
                    <button class="btn-primary advanced-search-btn">🔍 Search</button>
                    <button class="btn-secondary clear-advanced-btn">Clear All</button>
                </div>
            </div>
        `;
    }

    getRecentSearchesTemplate() {
        const recentSearches = this.getRecentSearches();

        return `
            <div class="recent-searches">
                <h5>Recent Searches</h5>
                <div class="recent-searches-list">
                    ${recentSearches.length > 0 ?
                recentSearches.map(search => `
                            <button class="recent-search-item" data-search="${search}">
                                ${search}
                            </button>
                        `).join('') :
                '<p class="no-recent-searches">No recent searches</p>'
            }
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Main search input
        const searchInput = this.$('.main-search-input');
        if (searchInput) {
            this.addEventListener(searchInput, 'input',
                this.debounce((e) => this.handleSearch(e.target.value), 300)
            );
            this.addEventListener(searchInput, 'focus', () => this.showSuggestions());
            this.addEventListener(searchInput, 'keydown', (e) => this.handleKeydown(e));
        }

        // Search button
        const searchBtn = this.$('.search-btn');
        if (searchBtn) {
            this.addEventListener(searchBtn, 'click', () => this.performSearch());
        }

        // Clear search button
        const clearBtn = this.$('.clear-search-btn');
        if (clearBtn) {
            this.addEventListener(clearBtn, 'click', () => this.clearSearch());
        }

        // Advanced search toggle
        const advancedToggle = this.$('.advanced-search-toggle');
        if (advancedToggle) {
            this.addEventListener(advancedToggle, 'click', () => this.toggleAdvancedSearch());
        }

        // Advanced search button
        const advancedSearchBtn = this.$('.advanced-search-btn');
        if (advancedSearchBtn) {
            this.addEventListener(advancedSearchBtn, 'click', () => this.performAdvancedSearch());
        }

        // Clear advanced button
        const clearAdvancedBtn = this.$('.clear-advanced-btn');
        if (clearAdvancedBtn) {
            this.addEventListener(clearAdvancedBtn, 'click', () => this.clearAdvancedSearch());
        }

        // Recent searches
        this.$$('.recent-search-item').forEach(item => {
            this.addEventListener(item, 'click', (e) => {
                const search = e.target.getAttribute('data-search');
                this.setSearchTerm(search);
                this.performSearch();
            });
        });

        // Click outside to hide suggestions
        this.addEventListener(document, 'click', (e) => {
            if (!this.container.contains(e.target)) {
                this.hideSuggestions();
            }
        });
    }

    async handleSearch(searchTerm) {
        if (searchTerm.length < this.options.minSearchLength) {
            this.hideSuggestions();
            return;
        }

        try {
            const suggestions = await this.fetchSearchSuggestions(searchTerm);
            this.showSearchSuggestions(suggestions);
        } catch (error) {
            console.error('Search suggestion error:', error);
        }
    }

    async fetchSearchSuggestions(searchTerm) {
        const response = await fetch(`/api/customers?search=${encodeURIComponent(searchTerm)}&limit=5`);
        if (!response.ok) throw new Error('Failed to fetch suggestions');

        return await response.json();
    }

    showSearchSuggestions(suggestions) {
        const suggestionsContainer = this.$('.search-suggestions');
        if (!suggestionsContainer) return;

        if (suggestions.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        suggestionsContainer.innerHTML = suggestions.map(customer => `
            <div class="suggestion-item" data-customer-id="${customer.id}">
                <div class="suggestion-name">${this.escapeHtml(customer.name)}</div>
                <div class="suggestion-details">${customer.email}</div>
            </div>
        `).join('');

        // Bind suggestion click events
        this.$$('.suggestion-item').forEach(item => {
            this.addEventListener(item, 'click', (e) => {
                const customerId = e.currentTarget.getAttribute('data-customer-id');
                const customer = suggestions.find(c => c.id === customerId);
                this.selectCustomer(customer);
            });
        });

        suggestionsContainer.style.display = 'block';
    }

    showSuggestions() {
        const input = this.$('.main-search-input');
        if (input && input.value.length >= this.options.minSearchLength) {
            this.handleSearch(input.value);
        }
    }

    hideSuggestions() {
        const suggestionsContainer = this.$('.search-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    }

    async performSearch() {
        const searchTerm = this.$('.main-search-input').value.trim();

        if (searchTerm.length < this.options.minSearchLength) {
            this.showMessage('Please enter at least 2 characters to search', 'warning');
            return;
        }

        try {
            this.showLoading();
            this.saveRecentSearch(searchTerm);

            const results = await this.fetchSearchResults(searchTerm);
            this.displaySearchResults(results);

        } catch (error) {
            this.showMessage('Search failed. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async performAdvancedSearch() {
        const advancedFields = {};
        this.$$('.advanced-field').forEach(field => {
            if (field.value.trim()) {
                advancedFields[field.name] = field.value.trim();
            }
        });

        if (Object.keys(advancedFields).length === 0) {
            this.showMessage('Please fill in at least one search field', 'warning');
            return;
        }

        try {
            this.showLoading();

            const results = await this.fetchAdvancedSearchResults(advancedFields);
            this.displaySearchResults(results);

        } catch (error) {
            this.showMessage('Advanced search failed. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async fetchSearchResults(searchTerm) {
        const response = await fetch(`/api/customers?search=${encodeURIComponent(searchTerm)}&limit=${this.options.maxResults}`);
        if (!response.ok) throw new Error('Search failed');

        return await response.json();
    }

    async fetchAdvancedSearchResults(fields) {
        const params = new URLSearchParams();
        Object.entries(fields).forEach(([key, value]) => {
            params.append(key, value);
        });

        const response = await fetch(`/api/customers/advanced-search?${params}`);
        if (!response.ok) throw new Error('Advanced search failed');

        return await response.json();
    }

    displaySearchResults(results) {
        const resultsContainer = this.$('.search-results');
        if (!resultsContainer) return;

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-search-results">
                    <div class="no-results-icon">🔍</div>
                    <h4>No customers found</h4>
                    <p>Try adjusting your search terms or use different criteria.</p>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = `
            <div class="search-results-header">
                <h4>Search Results (${results.length})</h4>
                <button class="clear-results-btn">Clear Results</button>
            </div>
            <div class="search-results-list">
                ${results.map(customer => this.getSearchResultTemplate(customer)).join('')}
            </div>
        `;

        // Bind result actions
        this.bindSearchResultActions();

        this.hideSuggestions();
    }

    getSearchResultTemplate(customer) {
        const isActive = (customer.status || 'active') === 'active';

        return `
            <div class="search-result-item ${!isActive ? 'inactive' : ''}" data-customer-id="${customer.id}">
                <div class="result-header">
                    <h5 class="result-name">${this.escapeHtml(customer.name)}</h5>
                    <div class="result-status ${isActive ? 'active' : 'inactive'}">
                        ${isActive ? '✅' : '❌'}
                    </div>
                </div>
                <div class="result-details">
                    <div class="result-info">
                        <strong>Email:</strong> ${customer.email}<br>
                        ${customer.phone ? `<strong>Phone:</strong> ${customer.phone}<br>` : ''}
                        <strong>ID:</strong> ${customer.id}<br>
                        <strong>Added:</strong> ${this.formatDate(customer.created_date)}
                    </div>
                </div>
                <div class="result-actions">
                    <button class="btn-small btn-primary select-customer-btn" data-customer-id="${customer.id}">
                        Select Customer
                    </button>
                    <button class="btn-small btn-info view-details-btn" data-customer-id="${customer.id}">
                        View Details
                    </button>
                    <button class="btn-small btn-success add-subscription-btn" data-customer-id="${customer.id}">
                        Add Subscription
                    </button>
                </div>
            </div>
        `;
    }

    bindSearchResultActions() {
        // Clear results button
        const clearResultsBtn = this.$('.clear-results-btn');
        if (clearResultsBtn) {
            this.addEventListener(clearResultsBtn, 'click', () => this.clearResults());
        }

        // Select customer buttons
        this.$$('.select-customer-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const customerId = e.target.getAttribute('data-customer-id');
                this.handleSelectCustomer(customerId);
            });
        });

        // View details buttons
        this.$$('.view-details-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const customerId = e.target.getAttribute('data-customer-id');
                this.handleViewDetails(customerId);
            });
        });

        // Add subscription buttons
        this.$$('.add-subscription-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const customerId = e.target.getAttribute('data-customer-id');
                this.handleAddSubscription(customerId);
            });
        });
    }

    handleSelectCustomer(customerId) {
        const customer = this.searchResults.find(c => c.id === customerId);
        if (customer) {
            this.selectCustomer(customer);
        }
    }

    selectCustomer(customer) {
        this.selectedCustomer = customer;
        this.emit('customerSelected', { customer });

        // Update UI to show selected customer
        this.showSelectedCustomer(customer);
    }

    showSelectedCustomer(customer) {
        const notification = document.createElement('div');
        notification.className = 'customer-selected-notification';
        notification.innerHTML = `
            <div class="notification-content">
                ✅ Selected: ${this.escapeHtml(customer.name)}
                <button class="notification-close">×</button>
            </div>
        `;

        this.container.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);

        // Manual close
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => notification.remove());
    }

    handleViewDetails(customerId) {
        this.emit('viewCustomerDetails', { customerId });
    }

    handleAddSubscription(customerId) {
        this.emit('addSubscriptionRequested', { customerId });
    }

    handleKeydown(event) {
        if (event.key === 'Enter') {
            this.performSearch();
        } else if (event.key === 'Escape') {
            this.hideSuggestions();
        }
    }

    toggleAdvancedSearch() {
        const panel = this.$('.advanced-search-panel');
        const toggle = this.$('.advanced-search-toggle');

        if (panel && toggle) {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';
            toggle.textContent = isVisible ? 'Advanced Search' : 'Hide Advanced';
        }
    }

    clearSearch() {
        this.$('.main-search-input').value = '';
        this.hideSuggestions();
        this.clearResults();
    }

    clearAdvancedSearch() {
        this.$$('.advanced-field').forEach(field => {
            field.value = '';
        });
    }

    clearResults() {
        const resultsContainer = this.$('.search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }
        this.searchResults = [];
    }

    setSearchTerm(searchTerm) {
        const input = this.$('.main-search-input');
        if (input) {
            input.value = searchTerm;
        }
    }

    // Recent searches management
    saveRecentSearch(searchTerm) {
        if (!searchTerm.trim()) return;

        let recent = this.getRecentSearches();
        recent = recent.filter(search => search !== searchTerm);
        recent.unshift(searchTerm);
        recent = recent.slice(0, 5); // Keep only last 5

        localStorage.setItem('customerSearchRecent', JSON.stringify(recent));
    }

    getRecentSearches() {
        try {
            return JSON.parse(localStorage.getItem('customerSearchRecent') || '[]');
        } catch {
            return [];
        }
    }

    // Utility methods
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

    showLoading() {
        // Implementation depends on your loading system
    }

    hideLoading() {
        // Implementation depends on your loading system
    }

    showMessage(message, type) {
        // Implementation depends on your notification system
        console.log(`${type}: ${message}`);
    }

    // Public API
    getSelectedCustomer() {
        return this.selectedCustomer;
    }

    performSearchFor(searchTerm) {
        this.setSearchTerm(searchTerm);
        this.performSearch();
    }
}

window.CustomerSearchWidget = CustomerSearchWidget;
