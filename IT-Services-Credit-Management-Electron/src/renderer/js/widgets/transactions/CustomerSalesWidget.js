class CustomerSalesWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.sales = [];
        this.filteredSales = [];
        this.searchTerm = '';
        this.dateRange = { from: null, to: null };
        this.selectedPeriod = 'month';
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showSearch: true,
            showFilters: true,
            showStats: true,
            showChart: false,
            showExport: true,
            itemsPerPage: 15
        };
    }

    async loadData() {
        try {
            this.log('Loading customer sales data...');
            const params = new URLSearchParams({
                period: this.selectedPeriod,
                ...(this.dateRange.from && { from: this.dateRange.from }),
                ...(this.dateRange.to && { to: this.dateRange.to })
            });

            const response = await fetch(`/api/sales?${params}`);
            if (!response.ok) throw new Error('Failed to fetch sales data');

            this.sales = await response.json();
            this.filteredSales = [...this.sales];
            this.log(`Loaded ${this.sales.length} sales records`);
        } catch (error) {
            this.handleError('Failed to load sales data', error);
        }
    }

    async getTemplate() {
        return `
            <div class="customer-sales-widget">
                <div class="sales-header">
                    <h3>💰 Customer Sales</h3>
                    <div class="header-actions">
                        <button class="btn-primary new-sale-btn">➕ New Sale</button>
                        <button class="btn-secondary refresh-sales-btn">🔄 Refresh</button>
                        ${this.options.showExport ? `
                            <button class="btn-info export-sales-btn">📊 Export</button>
                        ` : ''}
                    </div>
                </div>

                ${this.options.showFilters ? this.getFiltersTemplate() : ''}
                ${this.options.showStats ? this.getSalesStatsTemplate() : ''}

                <div class="sales-list-container">
                    ${this.getSalesListTemplate()}
                </div>
            </div>
        `;
    }

    getFiltersTemplate() {
        return `
            <div class="sales-filters">
                ${this.options.showSearch ? `
                    <div class="search-container">
                        <input type="text" class="sales-search" 
                               placeholder="🔍 Search by customer, service, or amount..."
                               value="${this.searchTerm}">
                        <button class="btn-clear search-clear">✕</button>
                    </div>
                ` : ''}

                <div class="filter-controls">
                    <select class="period-select">
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month" selected>This Month</option>
                        <option value="quarter">This Quarter</option>
                        <option value="year">This Year</option>
                        <option value="custom">Custom Range</option>
                    </select>

                    <select class="status-filter">
                        <option value="all">All Sales</option>
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="cancelled">Cancelled</option>
                    </select>

                    <select class="sort-filter">
                        <option value="date_desc">Newest First</option>
                        <option value="date_asc">Oldest First</option>
                        <option value="amount_desc">Highest Amount</option>
                        <option value="amount_asc">Lowest Amount</option>
                        <option value="customer">By Customer</option>
                    </select>
                </div>

                <div class="date-range-picker" style="display: none;">
                    <input type="date" class="date-from" placeholder="From">
                    <input type="date" class="date-to" placeholder="To">
                    <button class="btn-secondary apply-range">Apply</button>
                </div>
            </div>
        `;
    }

    getSalesStatsTemplate() {
        const stats = this.calculateSalesStats();

        return `
            <div class="sales-stats">
                <div class="stats-cards">
                    <div class="stat-card total-sales">
                        <div class="stat-icon">💰</div>
                        <div class="stat-content">
                            <div class="stat-value">${this.formatCurrency(stats.totalRevenue)}</div>
                            <div class="stat-label">Total Revenue</div>
                            <div class="stat-period">${this.getPeriodLabel()}</div>
                        </div>
                    </div>

                    <div class="stat-card avg-sale">
                        <div class="stat-icon">📊</div>
                        <div class="stat-content">
                            <div class="stat-value">${this.formatCurrency(stats.avgSaleAmount)}</div>
                            <div class="stat-label">Avg Sale Amount</div>
                            <div class="stat-detail">${stats.totalSales} sales</div>
                        </div>
                    </div>

                    <div class="stat-card top-customer">
                        <div class="stat-icon">🏆</div>
                        <div class="stat-content">
                            <div class="stat-value">${stats.topCustomer.name}</div>
                            <div class="stat-label">Top Customer</div>
                            <div class="stat-detail">${this.formatCurrency(stats.topCustomer.amount)}</div>
                        </div>
                    </div>

                    <div class="stat-card credits-sold">
                        <div class="stat-icon">💳</div>
                        <div class="stat-content">
                            <div class="stat-value">${this.formatNumber(stats.totalCredits)}</div>
                            <div class="stat-label">Credits Sold</div>
                            <div class="stat-detail">${this.formatCurrency(stats.avgPricePerCredit)}/credit</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getSalesListTemplate() {
        if (this.filteredSales.length === 0) {
            return `
                <div class="no-sales">
                    <div class="no-data-icon">💰</div>
                    <h4>No Sales Found</h4>
                    <p>No sales match your current search or filter criteria.</p>
                    <button class="btn-primary add-first-sale">💰 Record Your First Sale</button>
                </div>
            `;
        }

        return `
            <div class="sales-list">
                <div class="list-header">
                    <span class="result-count">${this.filteredSales.length} sales found</span>
                    <div class="list-view-options">
                        <button class="view-btn active" data-view="card">📋 Card</button>
                        <button class="view-btn" data-view="table">📊 Table</button>
                    </div>
                </div>

                <div class="sales-cards">
                    ${this.filteredSales.map(sale => this.getSaleCardTemplate(sale)).join('')}
                </div>
            </div>
        `;
    }

    getSaleCardTemplate(sale) {
        const statusClass = this.getStatusClass(sale.status);
        const isProfitable = sale.profit && sale.profit > 0;

        return `
            <div class="sale-card ${statusClass}" data-sale-id="${sale.id}">
                <div class="sale-header">
                    <div class="customer-info">
                        <h4 class="customer-name">${this.escapeHtml(sale.customer_name)}</h4>
                        <span class="customer-id">ID: ${sale.customer_id}</span>
                    </div>
                    <div class="sale-amount">
                        <span class="amount">${this.formatCurrency(sale.amount_paid)}</span>
                        <span class="profit ${isProfitable ? 'positive' : 'negative'}">
                            ${isProfitable ? '📈' : '📉'} ${this.formatCurrency(Math.abs(sale.profit || 0))}
                        </span>
                    </div>
                </div>

                <div class="sale-details">
                    <div class="service-info">
                        <div class="service-name">🔧 ${this.escapeHtml(sale.service_name)}</div>
                        ${sale.classification ? `
                            <div class="service-location">📍 ${this.escapeHtml(sale.classification)}</div>
                        ` : ''}
                        ${sale.mac_address ? `
                            <div class="device-info">🖥️ ${sale.mac_address}</div>
                        ` : ''}
                    </div>

                    <div class="service-period">
                        <div class="period-dates">
                            <span class="start-date">${this.formatDate(sale.start_date)}</span>
                            <span class="period-separator">→</span>
                            <span class="end-date">${this.formatDate(sale.expiration_date)}</span>
                        </div>
                        <div class="period-duration">
                            ${sale.credits_used} month${sale.credits_used !== 1 ? 's' : ''} 
                            (${this.formatCurrency(sale.amount_paid / sale.credits_used)}/month)
                        </div>
                    </div>

                    <div class="sale-metrics">
                        <div class="metric">
                            <span class="metric-label">Status:</span>
                            <span class="status-badge ${statusClass}">
                                ${this.getStatusIcon(sale.status)} ${sale.status}
                            </span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Sale Date:</span>
                            <span class="metric-value">${this.formatDate(sale.created_date)}</span>
                        </div>
                        ${sale.profit ? `
                            <div class="metric">
                                <span class="metric-label">Profit Margin:</span>
                                <span class="metric-value ${isProfitable ? 'positive' : 'negative'}">
                                    ${((sale.profit / sale.amount_paid) * 100).toFixed(1)}%
                                </span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="sale-actions">
                    <button class="btn-small btn-info view-details-btn" data-sale-id="${sale.id}">
                        👁️ Details
                    </button>
                    <button class="btn-small btn-primary print-receipt-btn" data-sale-id="${sale.id}">
                        🧾 Receipt
                    </button>
                    <button class="btn-small btn-secondary edit-sale-btn" data-sale-id="${sale.id}">
                        ✏️ Edit
                    </button>
                    <div class="more-actions">
                        <button class="btn-small btn-secondary more-btn">⋯</button>
                        <div class="actions-dropdown">
                            <button class="dropdown-item" data-action="extend" data-sale-id="${sale.id}">
                                ⏰ Extend Service
                            </button>
                            <button class="dropdown-item" data-action="duplicate" data-sale-id="${sale.id}">
                                📋 Duplicate Sale
                            </button>
                            <button class="dropdown-item" data-action="refund" data-sale-id="${sale.id}">
                                💸 Process Refund
                            </button>
                            <hr>
                            <button class="dropdown-item danger" data-action="cancel" data-sale-id="${sale.id}">
                                🚫 Cancel Sale
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Header actions
        const newSaleBtn = this.$('.new-sale-btn');
        if (newSaleBtn) {
            this.addEventListener(newSaleBtn, 'click', () => this.handleNewSale());
        }

        const refreshBtn = this.$('.refresh-sales-btn');
        if (refreshBtn) {
            this.addEventListener(refreshBtn, 'click', () => this.refresh());
        }

        const exportBtn = this.$('.export-sales-btn');
        if (exportBtn) {
            this.addEventListener(exportBtn, 'click', () => this.exportSales());
        }

        // Filter events
        this.bindFilterEvents();

        // Sale actions
        this.bindSaleActions();

        // View options
        this.$$('.view-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const view = e.target.getAttribute('data-view');
                this.setViewMode(view);
            });
        });
    }

    bindFilterEvents() {
        // Search
        const searchInput = this.$('.sales-search');
        if (searchInput) {
            this.addEventListener(searchInput, 'input', (e) => this.handleSearch(e.target.value));
        }

        const searchClear = this.$('.search-clear');
        if (searchClear) {
            this.addEventListener(searchClear, 'click', () => this.clearSearch());
        }

        // Period filter
        const periodSelect = this.$('.period-select');
        if (periodSelect) {
            this.addEventListener(periodSelect, 'change', (e) => this.changePeriod(e.target.value));
        }

        // Status filter
        const statusFilter = this.$('.status-filter');
        if (statusFilter) {
            this.addEventListener(statusFilter, 'change', (e) => this.setStatusFilter(e.target.value));
        }

        // Sort filter
        const sortFilter = this.$('.sort-filter');
        if (sortFilter) {
            this.addEventListener(sortFilter, 'change', (e) => this.setSortFilter(e.target.value));
        }

        // Date range
        const dateFrom = this.$('.date-from');
        const dateTo = this.$('.date-to');
        const applyRange = this.$('.apply-range');

        if (applyRange) {
            this.addEventListener(applyRange, 'click', () => {
                this.setDateRange(dateFrom.value, dateTo.value);
            });
        }
    }

    bindSaleActions() {
        // View details buttons
        this.$$('.view-details-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const saleId = e.target.getAttribute('data-sale-id');
                this.handleViewDetails(saleId);
            });
        });

        // Print receipt buttons
        this.$$('.print-receipt-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const saleId = e.target.getAttribute('data-sale-id');
                this.handlePrintReceipt(saleId);
            });
        });

        // Edit buttons
        this.$$('.edit-sale-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const saleId = e.target.getAttribute('data-sale-id');
                this.handleEditSale(saleId);
            });
        });

        // More actions
        this.$$('.more-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                e.stopPropagation();
                this.toggleMoreActions(btn);
            });
        });

        // Dropdown actions
        this.$$('.dropdown-item').forEach(item => {
            this.addEventListener(item, 'click', (e) => {
                const action = e.target.getAttribute('data-action');
                const saleId = e.target.getAttribute('data-sale-id');
                this.handleDropdownAction(action, saleId);
            });
        });

        // Add first sale button
        const addFirstBtn = this.$('.add-first-sale');
        if (addFirstBtn) {
            this.addEventListener(addFirstBtn, 'click', () => this.handleNewSale());
        }

        // Click outside to close dropdowns
        this.addEventListener(document, 'click', (e) => {
            if (!e.target.closest('.more-actions')) {
                this.$$('.actions-dropdown').forEach(dropdown => {
                    dropdown.style.display = 'none';
                });
            }
        });
    }

    // Filter and search methods
    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.applyFilters();
    }

    clearSearch() {
        this.searchTerm = '';
        const searchInput = this.$('.sales-search');
        if (searchInput) {
            searchInput.value = '';
        }
        this.applyFilters();
    }

    changePeriod(period) {
        this.selectedPeriod = period;

        const dateRangePicker = this.$('.date-range-picker');
        if (dateRangePicker) {
            dateRangePicker.style.display = period === 'custom' ? 'flex' : 'none';
        }

        if (period !== 'custom') {
            this.loadData();
        }
    }

    setStatusFilter(status) {
        this.statusFilter = status;
        this.applyFilters();
    }

    setSortFilter(sort) {
        this.sortBy = sort;
        this.applyFilters();
    }

    setDateRange(from, to) {
        if (from && to) {
            this.dateRange = { from, to };
            this.selectedPeriod = 'custom';
            this.loadData();
        }
    }

    applyFilters() {
        let filtered = [...this.sales];

        // Apply search filter
        if (this.searchTerm.trim()) {
            filtered = filtered.filter(sale => {
                const searchFields = [
                    sale.customer_name || '',
                    sale.service_name || '',
                    sale.classification || '',
                    (sale.amount_paid || 0).toString(),
                    sale.customer_id || ''
                ].map(field => field.toLowerCase());

                return searchFields.some(field => field.includes(this.searchTerm));
            });
        }

        // Apply status filter
        if (this.statusFilter && this.statusFilter !== 'all') {
            filtered = filtered.filter(sale => sale.status === this.statusFilter);
        }

        // Apply sorting
        if (this.sortBy) {
            filtered.sort((a, b) => {
                switch (this.sortBy) {
                    case 'date_desc':
                        return new Date(b.created_date) - new Date(a.created_date);
                    case 'date_asc':
                        return new Date(a.created_date) - new Date(b.created_date);
                    case 'amount_desc':
                        return (b.amount_paid || 0) - (a.amount_paid || 0);
                    case 'amount_asc':
                        return (a.amount_paid || 0) - (b.amount_paid || 0);
                    case 'customer':
                        return (a.customer_name || '').localeCompare(b.customer_name || '');
                    default:
                        return new Date(b.created_date) - new Date(a.created_date);
                }
            });
        }

        this.filteredSales = filtered;
        this.updateDisplay();
    }

    async updateDisplay() {
        const container = this.$('.sales-list-container');
        const stats = this.$('.sales-stats');

        if (container) {
            container.innerHTML = this.getSalesListTemplate();
            this.bindSaleActions();
        }

        if (stats) {
            stats.innerHTML = this.getSalesStatsTemplate();
        }
    }

    // Utility methods
    calculateSalesStats() {
        const totalRevenue = this.filteredSales.reduce((sum, sale) => sum + (sale.amount_paid || 0), 0);
        const totalSales = this.filteredSales.length;
        const avgSaleAmount = totalSales > 0 ? totalRevenue / totalSales : 0;
        const totalCredits = this.filteredSales.reduce((sum, sale) => sum + (sale.credits_used || 0), 0);
        const avgPricePerCredit = totalCredits > 0 ? totalRevenue / totalCredits : 0;

        // Find top customer
        const customerTotals = {};
        this.filteredSales.forEach(sale => {
            const name = sale.customer_name || 'Unknown';
            customerTotals[name] = (customerTotals[name] || 0) + (sale.amount_paid || 0);
        });

        const topCustomer = Object.entries(customerTotals).reduce(
            (max, [name, amount]) => amount > max.amount ? { name, amount } : max,
            { name: 'None', amount: 0 }
        );

        return {
            totalRevenue,
            totalSales,
            avgSaleAmount,
            totalCredits,
            avgPricePerCredit,
            topCustomer
        };
    }

    getStatusClass(status) {
        switch ((status || '').toLowerCase()) {
            case 'active': return 'status-active';
            case 'expired': return 'status-expired';
            case 'cancelled': return 'status-cancelled';
            default: return 'status-unknown';
        }
    }

    getStatusIcon(status) {
        switch ((status || '').toLowerCase()) {
            case 'active': return '✅';
            case 'expired': return '❌';
            case 'cancelled': return '🚫';
            default: return '❓';
        }
    }

    getPeriodLabel() {
        switch (this.selectedPeriod) {
            case 'today': return 'Today';
            case 'week': return 'This Week';
            case 'month': return 'This Month';
            case 'quarter': return 'This Quarter';
            case 'year': return 'This Year';
            case 'custom': return 'Custom Period';
            default: return 'Selected Period';
        }
    }

    setViewMode(view) {
        // Update view buttons
        this.$$('.view-btn').forEach(btn => btn.classList.remove('active'));
        this.$(`[data-view="${view}"]`).classList.add('active');

        // Apply view mode (card vs table)
        const salesContainer = this.$('.sales-cards');
        if (salesContainer) {
            salesContainer.className = view === 'table' ? 'sales-table' : 'sales-cards';
        }
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

    // Action handlers
    handleNewSale() {
        this.emit('newSaleRequested');
        console.log('New sale requested');
    }

    handleViewDetails(saleId) {
        const sale = this.sales.find(s => s.id.toString() === saleId.toString());
        if (sale) {
            this.showSaleDetails(sale);
        }
    }

    showSaleDetails(sale) {
        const modal = WidgetManager.getWidget('confirmation-modal');
        if (modal) {
            modal.show({
                title: 'Sale Details',
                message: this.getSaleDetailsContent(sale),
                confirmText: 'Close',
                cancelText: null,
                onConfirm: () => { }
            });
        }
    }

    getSaleDetailsContent(sale) {
        const isProfitable = sale.profit && sale.profit > 0;

        return `
            <div class="sale-details-modal">
                <div class="detail-section">
                    <h5>Customer Information</h5>
                    <div class="detail-row"><strong>Name:</strong> ${this.escapeHtml(sale.customer_name)}</div>
                    <div class="detail-row"><strong>Customer ID:</strong> ${sale.customer_id}</div>
                    <div class="detail-row"><strong>Email:</strong> ${sale.customer_email || 'N/A'}</div>
                </div>
                
                <div class="detail-section">
                    <h5>Service Information</h5>
                    <div class="detail-row"><strong>Service:</strong> ${this.escapeHtml(sale.service_name)}</div>
                    ${sale.classification ? `<div class="detail-row"><strong>Location:</strong> ${this.escapeHtml(sale.classification)}</div>` : ''}
                    ${sale.mac_address ? `<div class="detail-row"><strong>Device:</strong> ${sale.mac_address}</div>` : ''}
                    <div class="detail-row"><strong>Period:</strong> ${this.formatDate(sale.start_date)} - ${this.formatDate(sale.expiration_date)}</div>
                    <div class="detail-row"><strong>Duration:</strong> ${sale.credits_used} month${sale.credits_used !== 1 ? 's' : ''}</div>
                </div>
                
                <div class="detail-section">
                    <h5>Financial Information</h5>
                    <div class="detail-row"><strong>Amount Paid:</strong> ${this.formatCurrency(sale.amount_paid)}</div>
                    <div class="detail-row"><strong>Per Month:</strong> ${this.formatCurrency(sale.amount_paid / sale.credits_used)}</div>
                    ${sale.cost ? `<div class="detail-row"><strong>Cost:</strong> ${this.formatCurrency(sale.cost)}</div>` : ''}
                    ${sale.profit ? `<div class="detail-row ${isProfitable ? 'profit' : 'loss'}"><strong>Profit:</strong> ${this.formatCurrency(sale.profit)} (${((sale.profit / sale.amount_paid) * 100).toFixed(1)}%)</div>` : ''}
                </div>
                
                <div class="detail-section">
                    <h5>Transaction Details</h5>
                    <div class="detail-row"><strong>Sale Date:</strong> ${this.formatDate(sale.created_date)}</div>
                    <div class="detail-row"><strong>Status:</strong> ${sale.status}</div>
                    <div class="detail-row"><strong>Transaction ID:</strong> ${sale.id}</div>
                </div>
                
                ${sale.notes ? `
                    <div class="detail-section">
                        <h5>Notes</h5>
                        <div class="detail-row">${this.escapeHtml(sale.notes)}</div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    handlePrintReceipt(saleId) {
        this.emit('printReceiptRequested', { saleId });
        console.log('Print receipt requested for sale:', saleId);
    }

    handleEditSale(saleId) {
        this.emit('editSaleRequested', { saleId });
        console.log('Edit sale requested:', saleId);
    }

    handleDropdownAction(action, saleId) {
        switch (action) {
            case 'extend':
                this.handleExtendService(saleId);
                break;
            case 'duplicate':
                this.handleDuplicateSale(saleId);
                break;
            case 'refund':
                this.handleProcessRefund(saleId);
                break;
            case 'cancel':
                this.handleCancelSale(saleId);
                break;
        }

        // Hide dropdown
        this.$$('.actions-dropdown').forEach(dropdown => {
            dropdown.style.display = 'none';
        });
    }

    handleExtendService(saleId) {
        this.emit('extendServiceRequested', { saleId });
        console.log('Extend service requested:', saleId);
    }

    handleDuplicateSale(saleId) {
        const sale = this.sales.find(s => s.id.toString() === saleId.toString());
        if (sale) {
            this.emit('duplicateSaleRequested', { sale });
            console.log('Duplicate sale requested:', saleId);
        }
    }

    handleProcessRefund(saleId) {
        this.emit('processRefundRequested', { saleId });
        console.log('Process refund requested:', saleId);
    }

    async handleCancelSale(saleId) {
        const sale = this.sales.find(s => s.id.toString() === saleId.toString());
        if (!sale) return;

        const modal = WidgetManager.getWidget('confirmation-modal');
        if (modal) {
            modal.show({
                title: 'Cancel Sale',
                message: `Are you sure you want to cancel the sale to ${sale.customer_name}?`,
                icon: '🚫',
                confirmText: 'Cancel Sale',
                confirmClass: 'btn-danger',
                onConfirm: async () => {
                    try {
                        const response = await fetch(`/api/sales/${saleId}/cancel`, {
                            method: 'PUT'
                        });

                        if (!response.ok) {
                            const result = await response.json();
                            throw new Error(result.error || 'Failed to cancel sale');
                        }

                        // Update local data
                        const saleIndex = this.sales.findIndex(s => s.id.toString() === saleId.toString());
                        if (saleIndex !== -1) {
                            this.sales[saleIndex].status = 'cancelled';
                        }

                        this.applyFilters();
                        this.showSuccessMessage('Sale cancelled successfully');
                    } catch (error) {
                        this.showErrorMessage(error.message);
                    }
                }
            });
        }
    }

    exportSales() {
        const csvData = this.generateSalesCSV();
        const filename = `sales-${this.selectedPeriod}-${Date.now()}.csv`;
        this.downloadFile(csvData, filename, 'text/csv');
    }

    generateSalesCSV() {
        const headers = [
            'Sale ID', 'Date', 'Customer', 'Service', 'Classification',
            'Amount', 'Credits', 'Per Credit', 'Status', 'Profit', 'Profit %'
        ];

        const rows = this.filteredSales.map(sale => [
            sale.id,
            sale.created_date,
            sale.customer_name,
            sale.service_name,
            sale.classification || '',
            sale.amount_paid || 0,
            sale.credits_used || 0,
            sale.credits_used > 0 ? (sale.amount_paid / sale.credits_used) : 0,
            sale.status,
            sale.profit || 0,
            sale.profit && sale.amount_paid ? ((sale.profit / sale.amount_paid) * 100).toFixed(1) + '%' : '0%'
        ]);

        return [headers, ...rows].map(row =>
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    showSuccessMessage(message) {
        console.log('Success:', message);
    }

    showErrorMessage(message) {
        console.error('Error:', message);
    }

    // Public API
    async refresh() {
        await this.loadData();
        this.applyFilters();
    }

    setPeriod(period) {
        this.selectedPeriod = period;
        const periodSelect = this.$('.period-select');
        if (periodSelect) {
            periodSelect.value = period;
        }
        this.loadData();
    }

    searchSales(query) {
        this.handleSearch(query);
    }

    getSalesStats() {
        return this.calculateSalesStats();
    }

    getTopCustomers(limit = 5) {
        const customerTotals = {};
        this.filteredSales.forEach(sale => {
            const name = sale.customer_name || 'Unknown';
            customerTotals[name] = (customerTotals[name] || 0) + (sale.amount_paid || 0);
        });

        return Object.entries(customerTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([name, amount]) => ({ name, amount }));
    }
}

window.CustomerSalesWidget = CustomerSalesWidget;
