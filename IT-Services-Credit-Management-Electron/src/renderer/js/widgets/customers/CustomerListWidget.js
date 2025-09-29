class CustomerListWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.customers = [];
        this.filteredCustomers = [];
        this.searchTerm = '';
        this.currentFilter = 'all';
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showSearch: true,
            showFilters: true,
            showActions: true,
            itemsPerPage: 20,
            sortBy: 'name',
            sortOrder: 'asc'
        };
    }

    async loadData() {
        try {
            this.log('Loading customers...');
            const response = await fetch('/api/customers');
            if (!response.ok) throw new Error('Failed to fetch customers');

            this.customers = await response.json();
            this.filteredCustomers = [...this.customers];
            this.log(`Loaded ${this.customers.length} customers`);
        } catch (error) {
            this.handleError('Failed to load customers', error);
        }
    }

    async getTemplate() {
        return `
            <div class="customer-tab-content">
                <h3>📋 Customer Directory</h3>
                
                ${this.options.showSearch ? this.getSearchTemplate() : ''}
                ${this.options.showFilters ? this.getFiltersTemplate() : ''}
                
                <div class="customer-stats">
                    <span class="customer-count">${this.filteredCustomers.length}</span> customers found
                    <div class="customer-actions-bar">
                        <button class="btn-primary add-customer-btn">➕ Add Customer</button>
                        <button class="btn-secondary export-btn">📊 Export</button>
                    </div>
                </div>
                
                <div class="customer-list-container">
                    ${this.getCustomerListTemplate()}
                </div>
            </div>
        `;
    }

    getSearchTemplate() {
        return `
            <div class="search-container">
                <div class="search-bar">
                    <input type="text" 
                           class="customer-search-input" 
                           placeholder="🔍 Search customers by name, email, phone, or ID..."
                           value="${this.searchTerm}">
                    <button class="btn-clear search-clear-btn">✕ Clear</button>
                </div>
            </div>
        `;
    }

    getFiltersTemplate() {
        return `
            <div class="filter-container">
                <div class="filter-buttons">
                    <button class="filter-btn ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">
                        All Customers
                    </button>
                    <button class="filter-btn ${this.currentFilter === 'active' ? 'active' : ''}" data-filter="active">
                        Active Only
                    </button>
                    <button class="filter-btn ${this.currentFilter === 'inactive' ? 'active' : ''}" data-filter="inactive">
                        Inactive Only
                    </button>
                </div>
                <div class="sort-controls">
                    <select class="sort-select">
                        <option value="name">Sort by Name</option>
                        <option value="email">Sort by Email</option>
                        <option value="created_date">Sort by Date Added</option>
                    </select>
                    <button class="sort-direction-btn" data-direction="${this.options.sortOrder}">
                        ${this.options.sortOrder === 'asc' ? '⬆️' : '⬇️'}
                    </button>
                </div>
            </div>
        `;
    }

    getCustomerListTemplate() {
        if (this.filteredCustomers.length === 0) {
            return `
                <div class="no-customers">
                    <div class="no-data-icon">👥</div>
                    <h4>No Customers Found</h4>
                    <p>No customers match your current search or filter criteria.</p>
                    <button class="btn-primary add-first-customer-btn">Add Your First Customer</button>
                </div>
            `;
        }

        return `
            <div class="customer-grid">
                ${this.filteredCustomers.map(customer => this.getCustomerCardTemplate(customer)).join('')}
            </div>
        `;
    }

    getCustomerCardTemplate(customer) {
        const isActive = this.getCustomerStatus(customer) === 'active';
        const subscriptionCount = customer.subscription_count || 0;

        return `
            <div class="customer-card ${!isActive ? 'inactive' : ''}" data-customer-id="${customer.id}">
                <div class="customer-header">
                    <h4 class="customer-name">${this.escapeHtml(customer.name)}</h4>
                    <div class="customer-status ${isActive ? 'active' : 'inactive'}">
                        ${isActive ? '✅ Active' : '❌ Inactive'}
                    </div>
                </div>
                
                <div class="customer-details">
                    <div class="customer-info">
                        <div class="info-row">
                            <strong>🆔 ID:</strong> ${customer.id}
                        </div>
                        <div class="info-row">
                            <strong>📧 Email:</strong> 
                            <a href="mailto:${customer.email}">${this.escapeHtml(customer.email)}</a>
                        </div>
                        ${customer.phone ? `
                            <div class="info-row">
                                <strong>📱 Phone:</strong> 
                                <a href="tel:${customer.phone}">${this.escapeHtml(customer.phone)}</a>
                            </div>
                        ` : ''}
                        <div class="info-row">
                            <strong>📅 Added:</strong> ${this.formatDate(customer.created_date)}
                        </div>
                        ${customer.address ? `
                            <div class="info-row">
                                <strong>🏠 Address:</strong> ${this.escapeHtml(customer.address)}
                            </div>
                        ` : ''}
                        <div class="info-row">
                            <strong>📊 Subscriptions:</strong> ${subscriptionCount}
                        </div>
                    </div>
                </div>
                
                ${this.options.showActions ? this.getCustomerActionsTemplate(customer, isActive) : ''}
            </div>
        `;
    }

    getCustomerActionsTemplate(customer, isActive) {
        return `
            <div class="customer-actions">
                <button class="btn-small btn-primary edit-customer-btn" 
                        data-customer-id="${customer.id}">
                    ✏️ Edit
                </button>
                <button class="btn-small btn-info view-receipts-btn" 
                        data-customer-id="${customer.id}">
                    📄 Receipts
                </button>
                <button class="btn-small btn-secondary print-receipt-btn" 
                        data-customer-id="${customer.id}">
                    🖨️ Print
                </button>
                ${isActive ? `
                    <button class="btn-small btn-success add-subscription-btn" 
                            data-customer-id="${customer.id}">
                        📝 Add Subscription
                    </button>
                ` : `
                    <span class="inactive-label">Customer Inactive</span>
                `}
                <div class="more-actions">
                    <button class="btn-small btn-secondary more-actions-btn">⋯</button>
                    <div class="actions-dropdown">
                        <button class="dropdown-item" data-action="duplicate" data-customer-id="${customer.id}">
                            📋 Duplicate
                        </button>
                        <button class="dropdown-item" data-action="export" data-customer-id="${customer.id}">
                            📊 Export Data
                        </button>
                        <button class="dropdown-item" data-action="merge" data-customer-id="${customer.id}">
                            🔗 Merge Customer
                        </button>
                        <hr>
                        <button class="dropdown-item danger" data-action="delete" data-customer-id="${customer.id}">
                            🗑️ Delete Customer
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Search functionality
        const searchInput = this.$('.customer-search-input');
        if (searchInput) {
            this.addEventListener(searchInput, 'input', (e) => this.handleSearch(e.target.value));
        }

        // Clear search
        const clearBtn = this.$('.search-clear-btn');
        if (clearBtn) {
            this.addEventListener(clearBtn, 'click', () => this.clearSearch());
        }

        // Filter buttons
        this.$$('.filter-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const filter = e.target.getAttribute('data-filter');
                this.setFilter(filter);
            });
        });

        // Sort controls
        const sortSelect = this.$('.sort-select');
        if (sortSelect) {
            this.addEventListener(sortSelect, 'change', (e) => this.setSortBy(e.target.value));
        }

        const sortDirectionBtn = this.$('.sort-direction-btn');
        if (sortDirectionBtn) {
            this.addEventListener(sortDirectionBtn, 'click', () => this.toggleSortDirection());
        }

        // Add customer button
        const addBtn = this.$('.add-customer-btn');
        if (addBtn) {
            this.addEventListener(addBtn, 'click', () => this.handleAddCustomer());
        }

        // Export button
        const exportBtn = this.$('.export-btn');
        if (exportBtn) {
            this.addEventListener(exportBtn, 'click', () => this.handleExport());
        }

        // Customer action buttons
        this.bindCustomerActions();
    }

    bindCustomerActions() {
        // Edit buttons
        this.$$('.edit-customer-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const customerId = e.target.getAttribute('data-customer-id');
                this.handleEditCustomer(customerId);
            });
        });

        // View receipts buttons
        this.$$('.view-receipts-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const customerId = e.target.getAttribute('data-customer-id');
                this.handleViewReceipts(customerId);
            });
        });

        // Print receipt buttons
        this.$$('.print-receipt-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const customerId = e.target.getAttribute('data-customer-id');
                this.handlePrintReceipt(customerId);
            });
        });

        // Add subscription buttons
        this.$$('.add-subscription-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const customerId = e.target.getAttribute('data-customer-id');
                this.handleAddSubscription(customerId);
            });
        });

        // More actions dropdowns
        this.$$('.more-actions-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                e.stopPropagation();
                this.toggleMoreActions(btn);
            });
        });

        // Dropdown actions
        this.$$('.dropdown-item').forEach(item => {
            this.addEventListener(item, 'click', (e) => {
                const action = e.target.getAttribute('data-action');
                const customerId = e.target.getAttribute('data-customer-id');
                this.handleDropdownAction(action, customerId);
            });
        });
    }

    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.applyFilters();
    }

    clearSearch() {
        this.searchTerm = '';
        const searchInput = this.$('.customer-search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        this.applyFilters();
    }

    setFilter(filter) {
        this.currentFilter = filter;

        // Update filter button states
        this.$$('.filter-btn').forEach(btn => btn.classList.remove('active'));
        this.$(`[data-filter="${filter}"]`).classList.add('active');

        this.applyFilters();
    }

    setSortBy(sortBy) {
        this.options.sortBy = sortBy;
        this.applyFilters();
    }

    toggleSortDirection() {
        this.options.sortOrder = this.options.sortOrder === 'asc' ? 'desc' : 'asc';
        const btn = this.$('.sort-direction-btn');
        if (btn) {
            btn.setAttribute('data-direction', this.options.sortOrder);
            btn.textContent = this.options.sortOrder === 'asc' ? '⬆️' : '⬇️';
        }
        this.applyFilters();
    }

    applyFilters() {
        let filtered = [...this.customers];

        // Apply search filter
        if (this.searchTerm.trim()) {
            filtered = filtered.filter(customer => {
                const searchFields = [
                    customer.name || '',
                    customer.email || '',
                    customer.phone || '',
                    customer.id || '',
                    customer.address || ''
                ].map(field => field.toLowerCase());

                return searchFields.some(field => field.includes(this.searchTerm));
            });
        }

        // Apply status filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(customer => {
                const status = this.getCustomerStatus(customer);
                return status === this.currentFilter;
            });
        }

        // Apply sorting
        filtered.sort((a, b) => {
            const aValue = a[this.options.sortBy] || '';
            const bValue = b[this.options.sortBy] || '';

            let comparison = 0;
            if (aValue > bValue) comparison = 1;
            if (aValue < bValue) comparison = -1;

            return this.options.sortOrder === 'desc' ? -comparison : comparison;
        });

        this.filteredCustomers = filtered;
        this.updateDisplay();
    }

    async updateDisplay() {
        const container = this.$('.customer-list-container');
        const countEl = this.$('.customer-count');

        if (container) {
            container.innerHTML = this.getCustomerListTemplate();
            this.bindCustomerActions(); // Re-bind events after DOM update
        }

        if (countEl) {
            countEl.textContent = this.filteredCustomers.length;
        }
    }

    // Action handlers
    handleAddCustomer() {
        this.emit('addCustomerRequested');
        // Navigate to add customer widget or show modal
        console.log('Add customer requested');
    }

    handleEditCustomer(customerId) {
        this.emit('editCustomerRequested', { customerId });
        console.log('Edit customer:', customerId);
    }

    async handleViewReceipts(customerId) {
        try {
            const response = await fetch(`/api/customers/${customerId}/transactions`);
            if (!response.ok) throw new Error('Failed to load customer transactions');

            const data = await response.json();
            this.emit('viewReceiptsRequested', { customerId, data });
        } catch (error) {
            this.showErrorMessage('Failed to load customer receipts');
        }
    }

    handlePrintReceipt(customerId) {
        this.emit('printReceiptRequested', { customerId });
        console.log('Print receipt for:', customerId);
    }

    handleAddSubscription(customerId) {
        this.emit('addSubscriptionRequested', { customerId });
        console.log('Add subscription for:', customerId);
    }

    handleExport() {
        const csvData = this.exportToCSV();
        this.downloadCSV(csvData, 'customers.csv');
    }

    handleDropdownAction(action, customerId) {
        switch (action) {
            case 'duplicate':
                this.handleDuplicateCustomer(customerId);
                break;
            case 'export':
                this.handleExportCustomer(customerId);
                break;
            case 'merge':
                this.handleMergeCustomer(customerId);
                break;
            case 'delete':
                this.handleDeleteCustomer(customerId);
                break;
        }

        // Hide dropdown
        this.$$('.actions-dropdown').forEach(dropdown => {
            dropdown.style.display = 'none';
        });
    }

    toggleMoreActions(button) {
        const dropdown = button.nextElementSibling;
        const isVisible = dropdown.style.display === 'block';

        // Hide all dropdowns first
        this.$$('.actions-dropdown').forEach(d => d.style.display = 'none');

        // Show this dropdown if it wasn't visible
        if (!isVisible) {
            dropdown.style.display = 'block';
        }
    }

    async handleDeleteCustomer(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;

        const modal = WidgetManager.getWidget('confirmation-modal');
        if (modal) {
            modal.confirmDelete(customer.name, async () => {
                try {
                    const response = await fetch(`/api/customers/${customerId}`, {
                        method: 'DELETE'
                    });

                    if (!response.ok) {
                        const result = await response.json();
                        throw new Error(result.error || 'Failed to delete customer');
                    }

                    // Remove from local data
                    this.customers = this.customers.filter(c => c.id !== customerId);
                    this.applyFilters();

                    this.showSuccessMessage('Customer deleted successfully');
                } catch (error) {
                    this.showErrorMessage(error.message);
                }
            });
        }
    }

    // Utility methods
    getCustomerStatus(customer) {
        return (customer.status || 'active').toLowerCase();
    }

    exportToCSV() {
        const headers = ['ID', 'Name', 'Email', 'Phone', 'Address', 'Status', 'Created Date'];
        const rows = this.filteredCustomers.map(customer => [
            customer.id,
            customer.name,
            customer.email,
            customer.phone || '',
            customer.address || '',
            customer.status || 'active',
            customer.created_date
        ]);

        return [headers, ...rows].map(row =>
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
    }

    downloadCSV(csvData, filename) {
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    showSuccessMessage(message) {
        // Implementation depends on your notification system
        console.log('Success:', message);
    }

    showErrorMessage(message) {
        // Implementation depends on your notification system
        console.error('Error:', message);
    }

    // Public API
    async refresh() {
        await this.loadData();
        this.applyFilters();
    }

    getSelectedCustomers() {
        // For future implementation of bulk actions
        return [];
    }

    searchCustomers(query) {
        this.handleSearch(query);
    }
}

window.CustomerListWidget = CustomerListWidget;
