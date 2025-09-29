class TransactionFilterWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.activeFilters = {};
        this.filterPresets = [];
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showPresets: true,
            showAdvancedFilters: true,
            showSavedFilters: true,
            compactMode: false
        };
    }

    async getTemplate() {
        return `
            <div class="transaction-filter-widget ${this.options.compactMode ? 'compact' : ''}">
                <div class="filter-header">
                    <h4>🔍 Transaction Filters</h4>
                    <div class="filter-actions">
                        <button class="btn-small btn-secondary clear-all-filters">Clear All</button>
                        ${this.options.showSavedFilters ? `
                            <button class="btn-small btn-info save-filter-btn">💾 Save Filter</button>
                        ` : ''}
                    </div>
                </div>
                
                ${this.options.showPresets ? this.getFilterPresetsTemplate() : ''}
                
                <div class="filter-groups">
                    ${this.getDateFilterTemplate()}
                    ${this.getAmountFilterTemplate()}
                    ${this.getStatusFilterTemplate()}
                    ${this.getCustomerFilterTemplate()}
                    ${this.getServiceFilterTemplate()}
                    ${this.options.showAdvancedFilters ? this.getAdvancedFiltersTemplate() : ''}
                </div>
                
                <div class="active-filters">
                    <div class="active-filters-list"></div>
                </div>
                
                ${this.options.showSavedFilters ? this.getSavedFiltersTemplate() : ''}
            </div>
        `;
    }

    getFilterPresetsTemplate() {
        return `
            <div class="filter-presets">
                <h5>🎯 Quick Filters</h5>
                <div class="preset-buttons">
                    <button class="preset-btn" data-preset="today">Today</button>
                    <button class="preset-btn" data-preset="this-week">This Week</button>
                    <button class="preset-btn" data-preset="this-month">This Month</button>
                    <button class="preset-btn" data-preset="active-only">Active Only</button>
                    <button class="preset-btn" data-preset="high-value">High Value ($100+)</button>
                    <button class="preset-btn" data-preset="expiring-soon">Expiring Soon</button>
                </div>
            </div>
        `;
    }

    getDateFilterTemplate() {
        return `
            <div class="filter-group date-filter">
                <h5>📅 Date Range</h5>
                <div class="filter-content">
                    <div class="date-inputs">
                        <div class="input-group">
                            <label>From:</label>
                            <input type="date" class="filter-date-from" name="dateFrom">
                        </div>
                        <div class="input-group">
                            <label>To:</label>
                            <input type="date" class="filter-date-to" name="dateTo">
                        </div>
                    </div>
                    <div class="date-presets">
                        <button class="date-preset-btn" data-range="7">Last 7 days</button>
                        <button class="date-preset-btn" data-range="30">Last 30 days</button>
                        <button class="date-preset-btn" data-range="90">Last 90 days</button>
                    </div>
                </div>
            </div>
        `;
    }

    getAmountFilterTemplate() {
        return `
            <div class="filter-group amount-filter">
                <h5>💰 Amount Range</h5>
                <div class="filter-content">
                    <div class="amount-inputs">
                        <div class="input-group">
                            <label>Min ($):</label>
                            <input type="number" class="filter-amount-min" name="amountMin" 
                                   step="0.01" min="0" placeholder="0.00">
                        </div>
                        <div class="input-group">
                            <label>Max ($):</label>
                            <input type="number" class="filter-amount-max" name="amountMax" 
                                   step="0.01" min="0" placeholder="No limit">
                        </div>
                    </div>
                    <div class="amount-presets">
                        <button class="amount-preset-btn" data-range="0-50">$0 - $50</button>
                        <button class="amount-preset-btn" data-range="50-100">$50 - $100</button>
                        <button class="amount-preset-btn" data-range="100+">$100+</button>
                    </div>
                </div>
            </div>
        `;
    }

    getStatusFilterTemplate() {
        return `
            <div class="filter-group status-filter">
                <h5>📊 Status</h5>
                <div class="filter-content">
                    <div class="checkbox-group">
                        <label class="checkbox-item">
                            <input type="checkbox" name="status" value="active" class="status-checkbox">
                            <span class="status-badge status-active">✅ Active</span>
                        </label>
                        <label class="checkbox-item">
                            <input type="checkbox" name="status" value="expired" class="status-checkbox">
                            <span class="status-badge status-expired">❌ Expired</span>
                        </label>
                        <label class="checkbox-item">
                            <input type="checkbox" name="status" value="cancelled" class="status-checkbox">
                            <span class="status-badge status-cancelled">🚫 Cancelled</span>
                        </label>
                        <label class="checkbox-item">
                            <input type="checkbox" name="status" value="pending" class="status-checkbox">
                            <span class="status-badge status-pending">⏳ Pending</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    getCustomerFilterTemplate() {
        return `
            <div class="filter-group customer-filter">
                <h5>👥 Customer</h5>
                <div class="filter-content">
                    <div class="customer-search">
                        <input type="text" class="customer-search-input" 
                               placeholder="Search by customer name or ID...">
                        <div class="customer-suggestions" style="display: none;"></div>
                    </div>
                    <div class="selected-customers">
                        <!-- Selected customers will appear here -->
                    </div>
                </div>
            </div>
        `;
    }

    getServiceFilterTemplate() {
        return `
            <div class="filter-group service-filter">
                <h5>🔧 Service</h5>
                <div class="filter-content">
                    <div class="service-checkboxes">
                        <!-- Service options loaded dynamically -->
                    </div>
                </div>
            </div>
        `;
    }

    getAdvancedFiltersTemplate() {
        return `
            <div class="filter-group advanced-filter">
                <h5>🔧 Advanced Filters</h5>
                <div class="filter-content">
                    <div class="advanced-options">
                        <div class="input-group">
                            <label>Credits Range:</label>
                            <div class="range-inputs">
                                <input type="number" class="credits-min" placeholder="Min" min="1">
                                <span>to</span>
                                <input type="number" class="credits-max" placeholder="Max" min="1">
                            </div>
                        </div>
                        
                        <div class="input-group">
                            <label>Classification:</label>
                            <input type="text" class="classification-filter" 
                                   placeholder="Room/location (e.g., living room)">
                        </div>
                        
                        <div class="input-group">
                            <label>MAC Address:</label>
                            <input type="text" class="mac-address-filter" 
                                   placeholder="Device MAC address">
                        </div>
                        
                        <div class="checkbox-group">
                            <label class="checkbox-item">
                                <input type="checkbox" class="has-notes-filter">
                                <span>Has Notes</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" class="recurring-filter">
                                <span>Recurring Customers</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getSavedFiltersTemplate() {
        return `
            <div class="saved-filters">
                <h5>💾 Saved Filters</h5>
                <div class="saved-filters-list">
                    <!-- Saved filters loaded dynamically -->
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Clear all filters
        const clearAllBtn = this.$('.clear-all-filters');
        if (clearAllBtn) {
            this.addEventListener(clearAllBtn, 'click', () => this.clearAllFilters());
        }

        // Save filter
        const saveFilterBtn = this.$('.save-filter-btn');
        if (saveFilterBtn) {
            this.addEventListener(saveFilterBtn, 'click', () => this.saveCurrentFilter());
        }

        // Preset buttons
        this.$$('.preset-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const preset = e.target.getAttribute('data-preset');
                this.applyPreset(preset);
            });
        });

        // Date filters
        this.bindDateFilters();

        // Amount filters
        this.bindAmountFilters();

        // Status filters
        this.bindStatusFilters();

        // Customer filters
        this.bindCustomerFilters();

        // Advanced filters
        if (this.options.showAdvancedFilters) {
            this.bindAdvancedFilters();
        }
    }

    bindDateFilters() {
        const dateFrom = this.$('.filter-date-from');
        const dateTo = this.$('.filter-date-to');

        if (dateFrom && dateTo) {
            this.addEventListener(dateFrom, 'change', () => this.updateDateFilter());
            this.addEventListener(dateTo, 'change', () => this.updateDateFilter());
        }

        // Date preset buttons
        this.$$('.date-preset-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const days = parseInt(e.target.getAttribute('data-range'));
                this.setDateRange(days);
            });
        });
    }

    bindAmountFilters() {
        const amountMin = this.$('.filter-amount-min');
        const amountMax = this.$('.filter-amount-max');

        if (amountMin && amountMax) {
            this.addEventListener(amountMin, 'input', () => this.updateAmountFilter());
            this.addEventListener(amountMax, 'input', () => this.updateAmountFilter());
        }

        // Amount preset buttons
        this.$$('.amount-preset-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const range = e.target.getAttribute('data-range');
                this.setAmountRange(range);
            });
        });
    }

    bindStatusFilters() {
        this.$$('.status-checkbox').forEach(checkbox => {
            this.addEventListener(checkbox, 'change', () => this.updateStatusFilter());
        });
    }

    bindCustomerFilters() {
        const customerSearch = this.$('.customer-search-input');
        if (customerSearch) {
            this.addEventListener(customerSearch, 'input',
                this.debounce((e) => this.searchCustomers(e.target.value), 300)
            );
        }
    }

    bindAdvancedFilters() {
        const creditsMin = this.$('.credits-min');
        const creditsMax = this.$('.credits-max');
        const classification = this.$('.classification-filter');
        const macAddress = this.$('.mac-address-filter');
        const hasNotes = this.$('.has-notes-filter');
        const recurring = this.$('.recurring-filter');

        if (creditsMin) this.addEventListener(creditsMin, 'input', () => this.updateAdvancedFilters());
        if (creditsMax) this.addEventListener(creditsMax, 'input', () => this.updateAdvancedFilters());
        if (classification) this.addEventListener(classification, 'input', () => this.updateAdvancedFilters());
        if (macAddress) this.addEventListener(macAddress, 'input', () => this.updateAdvancedFilters());
        if (hasNotes) this.addEventListener(hasNotes, 'change', () => this.updateAdvancedFilters());
        if (recurring) this.addEventListener(recurring, 'change', () => this.updateAdvancedFilters());
    }

    async onAfterRender() {
        await this.loadServiceOptions();
        await this.loadSavedFilters();
    }

    async loadServiceOptions() {
        try {
            const response = await fetch('/api/vendor-services');
            if (response.ok) {
                const services = await response.json();
                this.populateServiceCheckboxes(services);
            }
        } catch (error) {
            console.error('Failed to load services:', error);
        }
    }

    populateServiceCheckboxes(services) {
        const container = this.$('.service-checkboxes');
        if (!container) return;

        const uniqueServices = [...new Set(services.map(s => s.service_name))];

        container.innerHTML = uniqueServices.map(serviceName => `
            <label class="checkbox-item">
                <input type="checkbox" name="service" value="${serviceName}" class="service-checkbox">
                <span>${this.escapeHtml(serviceName)}</span>
            </label>
        `).join('');

        // Bind events for new checkboxes
        this.$$('.service-checkbox').forEach(checkbox => {
            this.addEventListener(checkbox, 'change', () => this.updateServiceFilter());
        });
    }

    async loadSavedFilters() {
        if (!this.options.showSavedFilters) return;

        try {
            const saved = JSON.parse(localStorage.getItem('transactionFilters') || '[]');
            this.displaySavedFilters(saved);
        } catch (error) {
            console.error('Failed to load saved filters:', error);
        }
    }

    displaySavedFilters(savedFilters) {
        const container = this.$('.saved-filters-list');
        if (!container) return;

        if (savedFilters.length === 0) {
            container.innerHTML = '<p class="no-saved-filters">No saved filters</p>';
            return;
        }

        container.innerHTML = savedFilters.map((filter, index) => `
            <div class="saved-filter-item">
                <div class="filter-info">
                    <span class="filter-name">${this.escapeHtml(filter.name)}</span>
                    <span class="filter-description">${this.getFilterDescription(filter.filters)}</span>
                </div>
                <div class="filter-actions">
                    <button class="btn-small btn-primary apply-filter-btn" data-index="${index}">
                        Apply
                    </button>
                    <button class="btn-small btn-danger delete-filter-btn" data-index="${index}">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');

        // Bind events for saved filter actions
        this.$$('.apply-filter-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.applySavedFilter(savedFilters[index]);
            });
        });

        this.$$('.delete-filter-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.deleteSavedFilter(index);
            });
        });
    }

    // Filter update methods
    updateDateFilter() {
        const dateFrom = this.$('.filter-date-from').value;
        const dateTo = this.$('.filter-date-to').value;

        if (dateFrom || dateTo) {
            this.activeFilters.dateRange = { from: dateFrom, to: dateTo };
        } else {
            delete this.activeFilters.dateRange;
        }

        this.updateActiveFiltersDisplay();
        this.emitFilterChange();
    }

    updateAmountFilter() {
        const amountMin = parseFloat(this.$('.filter-amount-min').value);
        const amountMax = parseFloat(this.$('.filter-amount-max').value);

        if (!isNaN(amountMin) || !isNaN(amountMax)) {
            this.activeFilters.amountRange = {
                min: !isNaN(amountMin) ? amountMin : null,
                max: !isNaN(amountMax) ? amountMax : null
            };
        } else {
            delete this.activeFilters.amountRange;
        }

        this.updateActiveFiltersDisplay();
        this.emitFilterChange();
    }

    updateStatusFilter() {
        const selectedStatuses = Array.from(this.$$('.status-checkbox:checked')).map(cb => cb.value);

        if (selectedStatuses.length > 0) {
            this.activeFilters.status = selectedStatuses;
        } else {
            delete this.activeFilters.status;
        }

        this.updateActiveFiltersDisplay();
        this.emitFilterChange();
    }

    updateServiceFilter() {
        const selectedServices = Array.from(this.$$('.service-checkbox:checked')).map(cb => cb.value);

        if (selectedServices.length > 0) {
            this.activeFilters.services = selectedServices;
        } else {
            delete this.activeFilters.services;
        }

        this.updateActiveFiltersDisplay();
        this.emitFilterChange();
    }

    updateAdvancedFilters() {
        const creditsMin = parseInt(this.$('.credits-min').value);
        const creditsMax = parseInt(this.$('.credits-max').value);
        const classification = this.$('.classification-filter').value.trim();
        const macAddress = this.$('.mac-address-filter').value.trim();
        const hasNotes = this.$('.has-notes-filter').checked;
        const recurring = this.$('.recurring-filter').checked;

        // Credits range
        if (!isNaN(creditsMin) || !isNaN(creditsMax)) {
            this.activeFilters.creditsRange = {
                min: !isNaN(creditsMin) ? creditsMin : null,
                max: !isNaN(creditsMax) ? creditsMax : null
            };
        } else {
            delete this.activeFilters.creditsRange;
        }

        // Classification
        if (classification) {
            this.activeFilters.classification = classification;
        } else {
            delete this.activeFilters.classification;
        }

        // MAC address
        if (macAddress) {
            this.activeFilters.macAddress = macAddress;
        } else {
            delete this.activeFilters.macAddress;
        }

        // Checkboxes
        if (hasNotes) {
            this.activeFilters.hasNotes = true;
        } else {
            delete this.activeFilters.hasNotes;
        }

        if (recurring) {
            this.activeFilters.recurring = true;
        } else {
            delete this.activeFilters.recurring;
        }

        this.updateActiveFiltersDisplay();
        this.emitFilterChange();
    }

    async searchCustomers(query) {
        if (query.length < 2) return;

        try {
            const response = await fetch(`/api/customers?search=${encodeURIComponent(query)}&limit=10`);
            if (response.ok) {
                const customers = await response.json();
                this.showCustomerSuggestions(customers);
            }
        } catch (error) {
            console.error('Customer search error:', error);
        }
    }

    showCustomerSuggestions(customers) {
        const suggestions = this.$('.customer-suggestions');
        if (!suggestions) return;

        if (customers.length === 0) {
            suggestions.style.display = 'none';
            return;
        }

        suggestions.innerHTML = customers.map(customer => `
            <div class="customer-suggestion" data-customer-id="${customer.id}">
                <div class="customer-name">${this.escapeHtml(customer.name)}</div>
                <div class="customer-email">${customer.email}</div>
            </div>
        `).join('');

        // Bind customer selection
        this.$$('.customer-suggestion').forEach(item => {
            this.addEventListener(item, 'click', (e) => {
                const customerId = e.currentTarget.getAttribute('data-customer-id');
                const customer = customers.find(c => c.id === customerId);
                this.selectCustomer(customer);
            });
        });

        suggestions.style.display = 'block';
    }

    selectCustomer(customer) {
        if (!this.activeFilters.customers) {
            this.activeFilters.customers = [];
        }

        // Avoid duplicates
        if (!this.activeFilters.customers.find(c => c.id === customer.id)) {
            this.activeFilters.customers.push(customer);
        }

        this.updateSelectedCustomersDisplay();
        this.updateActiveFiltersDisplay();
        this.emitFilterChange();

        // Clear search
        this.$('.customer-search-input').value = '';
        this.$('.customer-suggestions').style.display = 'none';
    }

    updateSelectedCustomersDisplay() {
        const container = this.$('.selected-customers');
        if (!container || !this.activeFilters.customers) return;

        container.innerHTML = this.activeFilters.customers.map(customer => `
            <div class="selected-customer">
                <span class="customer-name">${this.escapeHtml(customer.name)}</span>
                <button class="remove-customer-btn" data-customer-id="${customer.id}">×</button>
            </div>
        `).join('');

        // Bind remove buttons
        this.$$('.remove-customer-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const customerId = e.target.getAttribute('data-customer-id');
                this.removeCustomer(customerId);
            });
        });
    }

    removeCustomer(customerId) {
        if (this.activeFilters.customers) {
            this.activeFilters.customers = this.activeFilters.customers.filter(c => c.id !== customerId);

            if (this.activeFilters.customers.length === 0) {
                delete this.activeFilters.customers;
            }
        }

        this.updateSelectedCustomersDisplay();
        this.updateActiveFiltersDisplay();
        this.emitFilterChange();
    }

    // Preset methods
    applyPreset(preset) {
        this.clearAllFilters();

        switch (preset) {
            case 'today':
                this.setDateRange(0); // Today
                break;
            case 'this-week':
                this.setDateRange(7);
                break;
            case 'this-month':
                this.setDateRange(30);
                break;
            case 'active-only':
                this.$$('.status-checkbox').forEach(cb => {
                    cb.checked = cb.value === 'active';
                });
                this.updateStatusFilter();
                break;
            case 'high-value':
                this.$('.filter-amount-min').value = '100';
                this.updateAmountFilter();
                break;
            case 'expiring-soon':
                // Set date range for next 30 days
                const today = new Date();
                const future = new Date();
                future.setDate(future.getDate() + 30);

                this.$('.filter-date-from').value = today.toISOString().split('T')[0];
                this.$('.filter-date-to').value = future.toISOString().split('T')[0];
                this.updateDateFilter();
                break;
        }
    }

    setDateRange(days) {
        const today = new Date();
        const startDate = new Date();

        if (days === 0) {
            // Today only
            startDate.setHours(0, 0, 0, 0);
        } else {
            startDate.setDate(today.getDate() - days);
        }

        this.$('.filter-date-from').value = startDate.toISOString().split('T')[0];
        this.$('.filter-date-to').value = today.toISOString().split('T')[0];
        this.updateDateFilter();
    }

    setAmountRange(range) {
        const amountMin = this.$('.filter-amount-min');
        const amountMax = this.$('.filter-amount-max');

        switch (range) {
            case '0-50':
                amountMin.value = '0';
                amountMax.value = '50';
                break;
            case '50-100':
                amountMin.value = '50';
                amountMax.value = '100';
                break;
            case '100+':
                amountMin.value = '100';
                amountMax.value = '';
                break;
        }

        this.updateAmountFilter();
    }

    // Active filters display
    updateActiveFiltersDisplay() {
        const container = this.$('.active-filters-list');
        if (!container) return;

        const filterTags = [];

        // Date range
        if (this.activeFilters.dateRange) {
            const { from, to } = this.activeFilters.dateRange;
            if (from && to) {
                filterTags.push(`📅 ${this.formatDate(from)} - ${this.formatDate(to)}`);
            } else if (from) {
                filterTags.push(`📅 From ${this.formatDate(from)}`);
            } else if (to) {
                filterTags.push(`📅 Until ${this.formatDate(to)}`);
            }
        }

        // Amount range
        if (this.activeFilters.amountRange) {
            const { min, max } = this.activeFilters.amountRange;
            if (min !== null && max !== null) {
                filterTags.push(`💰 ${this.formatCurrency(min)} - ${this.formatCurrency(max)}`);
            } else if (min !== null) {
                filterTags.push(`💰 Min ${this.formatCurrency(min)}`);
            } else if (max !== null) {
                filterTags.push(`💰 Max ${this.formatCurrency(max)}`);
            }
        }

        // Status
        if (this.activeFilters.status) {
            filterTags.push(`📊 Status: ${this.activeFilters.status.join(', ')}`);
        }

        // Services
        if (this.activeFilters.services) {
            const serviceText = this.activeFilters.services.length > 2 ?
                `${this.activeFilters.services.length} services` :
                this.activeFilters.services.join(', ');
            filterTags.push(`🔧 ${serviceText}`);
        }

        // Customers
        if (this.activeFilters.customers) {
            const customerText = this.activeFilters.customers.length > 2 ?
                `${this.activeFilters.customers.length} customers` :
                this.activeFilters.customers.map(c => c.name).join(', ');
            filterTags.push(`👥 ${customerText}`);
        }

        // Advanced filters
        if (this.activeFilters.creditsRange) {
            const { min, max } = this.activeFilters.creditsRange;
            if (min !== null && max !== null) {
                filterTags.push(`📊 ${min}-${max} credits`);
            } else if (min !== null) {
                filterTags.push(`📊 Min ${min} credits`);
            } else if (max !== null) {
                filterTags.push(`📊 Max ${max} credits`);
            }
        }

        if (this.activeFilters.classification) {
            filterTags.push(`📍 ${this.activeFilters.classification}`);
        }

        if (this.activeFilters.macAddress) {
            filterTags.push(`🖥️ ${this.activeFilters.macAddress}`);
        }

        if (this.activeFilters.hasNotes) {
            filterTags.push(`📝 Has Notes`);
        }

        if (this.activeFilters.recurring) {
            filterTags.push(`🔄 Recurring`);
        }

        container.innerHTML = filterTags.map(tag => `
            <span class="filter-tag">${tag}</span>
        `).join('');
    }

    // Save/load filters
    saveCurrentFilter() {
        if (Object.keys(this.activeFilters).length === 0) {
            alert('No filters to save');
            return;
        }

        const name = prompt('Enter a name for this filter:');
        if (!name) return;

        try {
            const saved = JSON.parse(localStorage.getItem('transactionFilters') || '[]');
            saved.push({
                name: name.trim(),
                filters: { ...this.activeFilters },
                created: new Date().toISOString()
            });

            localStorage.setItem('transactionFilters', JSON.stringify(saved));
            this.loadSavedFilters();

            console.log('Filter saved successfully');
        } catch (error) {
            console.error('Failed to save filter:', error);
            alert('Failed to save filter');
        }
    }

    applySavedFilter(savedFilter) {
        this.clearAllFilters();
        this.activeFilters = { ...savedFilter.filters };
        this.populateUIFromFilters();
        this.updateActiveFiltersDisplay();
        this.emitFilterChange();
    }

    deleteSavedFilter(index) {
        if (!confirm('Delete this saved filter?')) return;

        try {
            const saved = JSON.parse(localStorage.getItem('transactionFilters') || '[]');
            saved.splice(index, 1);
            localStorage.setItem('transactionFilters', JSON.stringify(saved));
            this.loadSavedFilters();

            console.log('Filter deleted successfully');
        } catch (error) {
            console.error('Failed to delete filter:', error);
        }
    }

    populateUIFromFilters() {
        // Date range
        if (this.activeFilters.dateRange) {
            const { from, to } = this.activeFilters.dateRange;
            if (from) this.$('.filter-date-from').value = from;
            if (to) this.$('.filter-date-to').value = to;
        }

        // Amount range
        if (this.activeFilters.amountRange) {
            const { min, max } = this.activeFilters.amountRange;
            if (min !== null) this.$('.filter-amount-min').value = min;
            if (max !== null) this.$('.filter-amount-max').value = max;
        }

        // Status checkboxes
        if (this.activeFilters.status) {
            this.$$('.status-checkbox').forEach(cb => {
                cb.checked = this.activeFilters.status.includes(cb.value);
            });
        }

        // Service checkboxes
        if (this.activeFilters.services) {
            this.$$('.service-checkbox').forEach(cb => {
                cb.checked = this.activeFilters.services.includes(cb.value);
            });
        }

        // Customers
        if (this.activeFilters.customers) {
            this.updateSelectedCustomersDisplay();
        }

        // Advanced filters
        if (this.activeFilters.creditsRange) {
            const { min, max } = this.activeFilters.creditsRange;
            if (min !== null) this.$('.credits-min').value = min;
            if (max !== null) this.$('.credits-max').value = max;
        }

        if (this.activeFilters.classification) {
            this.$('.classification-filter').value = this.activeFilters.classification;
        }

        if (this.activeFilters.macAddress) {
            this.$('.mac-address-filter').value = this.activeFilters.macAddress;
        }

        if (this.activeFilters.hasNotes) {
            this.$('.has-notes-filter').checked = true;
        }

        if (this.activeFilters.recurring) {
            this.$('.recurring-filter').checked = true;
        }
    }

    clearAllFilters() {
        this.activeFilters = {};

        // Clear UI
        this.$$('input[type="date"], input[type="number"], input[type="text"]').forEach(input => {
            input.value = '';
        });

        this.$$('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });

        this.updateActiveFiltersDisplay();
        this.emitFilterChange();
    }

    getFilterDescription(filters) {
        const parts = [];

        if (filters.dateRange) parts.push('Date');
        if (filters.amountRange) parts.push('Amount');
        if (filters.status) parts.push('Status');
        if (filters.services) parts.push('Services');
        if (filters.customers) parts.push('Customers');

        return parts.join(', ') || 'Custom filter';
    }

    emitFilterChange() {
        this.emit('filtersChanged', { filters: { ...this.activeFilters } });
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

    // Public API
    getActiveFilters() {
        return { ...this.activeFilters };
    }

    setFilters(filters) {
        this.activeFilters = { ...filters };
        this.populateUIFromFilters();
        this.updateActiveFiltersDisplay();
    }

    hasActiveFilters() {
        return Object.keys(this.activeFilters).length > 0;
    }

    clearFilters() {
        this.clearAllFilters();
    }
}

window.TransactionFilterWidget = TransactionFilterWidget;
