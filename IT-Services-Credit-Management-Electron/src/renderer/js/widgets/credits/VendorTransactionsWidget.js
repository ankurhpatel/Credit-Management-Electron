class VendorTransactionsWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.transactions = [];
        this.filteredTransactions = [];
        this.vendors = [];
        this.searchTerm = '';
        this.selectedVendor = 'all';
        this.dateRange = { from: null, to: null };
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showSearch: true,
            showFilters: true,
            showStats: true,
            showExport: true,
            showVendorSummary: true,
            itemsPerPage: 20
        };
    }

    async loadData() {
        try {
            this.log('Loading vendor transactions...');

            // Load transactions and vendors in parallel
            const [transactionsResponse, vendorsResponse] = await Promise.all([
                fetch('/api/vendor-transactions'),
                fetch('/api/vendors')
            ]);

            if (!transactionsResponse.ok || !vendorsResponse.ok) {
                throw new Error('Failed to fetch vendor data');
            }

            this.transactions = await transactionsResponse.json();
            this.vendors = await vendorsResponse.json();
            this.filteredTransactions = [...this.transactions];

            this.log(`Loaded ${this.transactions.length} vendor transactions`);
        } catch (error) {
            this.handleError('Failed to load vendor transactions', error);
        }
    }

    async getTemplate() {
        return `
            <div class="vendor-transactions-widget">
                <div class="transactions-header">
                    <h3>🏭 Vendor Transactions</h3>
                    <div class="header-actions">
                        <button class="btn-primary new-purchase-btn">💸 New Purchase</button>
                        <button class="btn-secondary refresh-transactions-btn">🔄 Refresh</button>
                        ${this.options.showExport ? `
                            <button class="btn-info export-transactions-btn">📊 Export</button>
                        ` : ''}
                    </div>
                </div>

                ${this.options.showFilters ? this.getFiltersTemplate() : ''}
                ${this.options.showStats ? this.getTransactionStatsTemplate() : ''}
                ${this.options.showVendorSummary ? this.getVendorSummaryTemplate() : ''}

                <div class="transactions-list-container">
                    ${this.getTransactionsListTemplate()}
                </div>
            </div>
        `;
    }

    getFiltersTemplate() {
        return `
            <div class="transactions-filters">
                ${this.options.showSearch ? `
                    <div class="search-container">
                        <input type="text" class="transactions-search" 
                               placeholder="🔍 Search by vendor, service, or amount..."
                               value="${this.searchTerm}">
                        <button class="btn-clear search-clear">✕</button>
                    </div>
                ` : ''}

                <div class="filter-controls">
                    <select class="vendor-filter">
                        <option value="all">All Vendors</option>
                        ${this.getVendorFilterOptions()}
                    </select>

                    <select class="period-filter">
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="quarter">This Quarter</option>
                        <option value="year">This Year</option>
                        <option value="custom">Custom Range</option>
                    </select>

                    <select class="sort-filter">
                        <option value="date_desc">Newest First</option>
                        <option value="date_asc">Oldest First</option>
                        <option value="amount_desc">Highest Amount</option>
                        <option value="amount_asc">Lowest Amount</option>
                        <option value="vendor">By Vendor</option>
                        <option value="credits_desc">Most Credits</option>
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

    getVendorFilterOptions() {
        return this.vendors.map(vendor => `
            <option value="${vendor.vendor_id}">
                ${this.escapeHtml(vendor.name)}
            </option>
        `).join('');
    }

    getTransactionStatsTemplate() {
        const stats = this.calculateTransactionStats();

        return `
            <div class="transaction-stats">
                <div class="stats-cards">
                    <div class="stat-card total-spent">
                        <div class="stat-icon">💰</div>
                        <div class="stat-content">
                            <div class="stat-value">${this.formatCurrency(stats.totalSpent)}</div>
                            <div class="stat-label">Total Spent</div>
                            <div class="stat-detail">${stats.totalTransactions} transactions</div>
                        </div>
                    </div>

                    <div class="stat-card credits-purchased">
                        <div class="stat-icon">💳</div>
                        <div class="stat-content">
                            <div class="stat-value">${this.formatNumber(stats.totalCredits)}</div>
                            <div class="stat-label">Credits Purchased</div>
                            <div class="stat-detail">${this.formatCurrency(stats.avgCostPerCredit)}/credit</div>
                        </div>
                    </div>

                    <div class="stat-card avg-purchase">
                        <div class="stat-icon">📊</div>
                        <div class="stat-content">
                            <div class="stat-value">${this.formatCurrency(stats.avgPurchaseAmount)}</div>
                            <div class="stat-label">Avg Purchase</div>
                            <div class="stat-detail">${this.formatNumber(stats.avgCreditsPerPurchase)} credits</div>
                        </div>
                    </div>

                    <div class="stat-card top-vendor">
                        <div class="stat-icon">🏆</div>
                        <div class="stat-content">
                            <div class="stat-value">${stats.topVendor.name}</div>
                            <div class="stat-label">Top Vendor</div>
                            <div class="stat-detail">${this.formatCurrency(stats.topVendor.amount)}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getVendorSummaryTemplate() {
        const vendorSummary = this.calculateVendorSummary();

        return `
            <div class="vendor-summary">
                <h4>📈 Vendor Performance Summary</h4>
                <div class="vendor-performance-list">
                    ${vendorSummary.map(vendor => this.getVendorPerformanceTemplate(vendor)).join('')}
                </div>
            </div>
        `;
    }

    getVendorPerformanceTemplate(vendor) {
        return `
            <div class="vendor-performance-item">
                <div class="vendor-info">
                    <div class="vendor-name">${this.escapeHtml(vendor.name)}</div>
                    <div class="vendor-stats">
                        ${vendor.transactionCount} transaction${vendor.transactionCount !== 1 ? 's' : ''} • 
                        ${this.formatNumber(vendor.totalCredits)} credits
                    </div>
                </div>
                <div class="vendor-amounts">
                    <div class="total-spent">${this.formatCurrency(vendor.totalSpent)}</div>
                    <div class="avg-cost">${this.formatCurrency(vendor.avgCostPerCredit)}/credit</div>
                </div>
                <div class="vendor-trend">
                    ${this.getVendorTrendIcon(vendor.trend)} ${vendor.trend}
                </div>
            </div>
        `;
    }

    getTransactionsListTemplate() {
        if (this.filteredTransactions.length === 0) {
            return `
                <div class="no-transactions">
                    <div class="no-data-icon">🏭</div>
                    <h4>No Vendor Transactions Found</h4>
                    <p>No vendor transactions match your current search or filter criteria.</p>
                    <button class="btn-primary add-first-transaction">💸 Record First Purchase</button>
                </div>
            `;
        }

        return `
            <div class="transactions-list">
                <div class="list-header">
                    <span class="result-count">${this.filteredTransactions.length} transactions found</span>
                </div>

                <div class="transactions-table">
                    <div class="table-header">
                        <div class="col-date">Date</div>
                        <div class="col-vendor">Vendor</div>
                        <div class="col-service">Service</div>
                        <div class="col-credits">Credits</div>
                        <div class="col-amount">Amount</div>
                        <div class="col-rate">Rate</div>
                        <div class="col-actions">Actions</div>
                    </div>
                    
                    <div class="table-body">
                        ${this.filteredTransactions.map(transaction => this.getTransactionRowTemplate(transaction)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    getTransactionRowTemplate(transaction) {
        const costPerCredit = transaction.credits > 0 ? transaction.price_usd / transaction.credits : 0;

        return `
            <div class="transaction-row" data-transaction-id="${transaction.id}">
                <div class="col-date">
                    <div class="date-main">${this.formatDate(transaction.purchase_date)}</div>
                    <div class="date-time">${this.formatTime(transaction.created_date)}</div>
                </div>

                <div class="col-vendor">
                    <div class="vendor-name">${this.escapeHtml(transaction.vendor_name)}</div>
                    <div class="vendor-id">ID: ${transaction.vendor_id}</div>
                </div>

                <div class="col-service">
                    <div class="service-name">${this.escapeHtml(transaction.service_name)}</div>
                    ${transaction.notes ? `
                        <div class="service-notes">${this.escapeHtml(transaction.notes.substring(0, 50))}${transaction.notes.length > 50 ? '...' : ''}</div>
                    ` : ''}
                </div>

                <div class="col-credits">
                    <div class="credits-amount">${this.formatNumber(transaction.credits)}</div>
                    <div class="credits-label">credits</div>
                </div>

                <div class="col-amount">
                    <div class="amount-main">${this.formatCurrency(transaction.price_usd)}</div>
                    <div class="amount-detail">USD</div>
                </div>

                <div class="col-rate">
                    <div class="rate-amount">${this.formatCurrency(costPerCredit)}</div>
                    <div class="rate-label">per credit</div>
                </div>

                <div class="col-actions">
                    <div class="transaction-actions">
                        <button class="btn-small btn-info view-details-btn" 
                                data-transaction-id="${transaction.id}"
                                title="View Details">
                            👁️
                        </button>
                        <button class="btn-small btn-secondary edit-transaction-btn" 
                                data-transaction-id="${transaction.id}"
                                title="Edit Transaction">
                            ✏️
                        </button>
                        <div class="more-actions">
                            <button class="btn-small btn-secondary more-actions-btn" title="More Actions">⋯</button>
                            <div class="actions-dropdown">
                                <button class="dropdown-item" data-action="duplicate" data-transaction-id="${transaction.id}">
                                    📋 Duplicate
                                </button>
                                <button class="dropdown-item" data-action="receipt" data-transaction-id="${transaction.id}">
                                    🧾 Generate Receipt
                                </button>
                                <button class="dropdown-item" data-action="notes" data-transaction-id="${transaction.id}">
                                    📝 Edit Notes
                                </button>
                                <hr>
                                <button class="dropdown-item danger" data-action="delete" data-transaction-id="${transaction.id}">
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Header actions
        const newPurchaseBtn = this.$('.new-purchase-btn');
        if (newPurchaseBtn) {
            this.addEventListener(newPurchaseBtn, 'click', () => this.handleNewPurchase());
        }

        const refreshBtn = this.$('.refresh-transactions-btn');
        if (refreshBtn) {
            this.addEventListener(refreshBtn, 'click', () => this.refresh());
        }

        const exportBtn = this.$('.export-transactions-btn');
        if (exportBtn) {
            this.addEventListener(exportBtn, 'click', () => this.exportTransactions());
        }

        // Filter events
        this.bindFilterEvents();

        // Transaction actions
        this.bindTransactionActions();
    }

    bindFilterEvents() {
        // Search
        const searchInput = this.$('.transactions-search');
        if (searchInput) {
            this.addEventListener(searchInput, 'input', (e) => this.handleSearch(e.target.value));
        }

        const searchClear = this.$('.search-clear');
        if (searchClear) {
            this.addEventListener(searchClear, 'click', () => this.clearSearch());
        }

        // Vendor filter
        const vendorFilter = this.$('.vendor-filter');
        if (vendorFilter) {
            this.addEventListener(vendorFilter, 'change', (e) => this.setVendorFilter(e.target.value));
        }

        // Period filter
        const periodFilter = this.$('.period-filter');
        if (periodFilter) {
            this.addEventListener(periodFilter, 'change', (e) => this.setPeriodFilter(e.target.value));
        }

        // Sort filter
        const sortFilter = this.$('.sort-filter');
        if (sortFilter) {
            this.addEventListener(sortFilter, 'change', (e) => this.setSortFilter(e.target.value));
        }

        // Date range
        const applyRange = this.$('.apply-range');
        if (applyRange) {
            this.addEventListener(applyRange, 'click', () => {
                const dateFrom = this.$('.date-from').value;
                const dateTo = this.$('.date-to').value;
                this.setDateRange(dateFrom, dateTo);
            });
        }
    }

    bindTransactionActions() {
        // View details buttons
        this.$$('.view-details-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const transactionId = e.target.getAttribute('data-transaction-id');
                this.handleViewDetails(transactionId);
            });
        });

        // Edit buttons
        this.$$('.edit-transaction-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const transactionId = e.target.getAttribute('data-transaction-id');
                this.handleEditTransaction(transactionId);
            });
        });

        // More actions
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
                const transactionId = e.target.getAttribute('data-transaction-id');
                this.handleDropdownAction(action, transactionId);
            });
        });

        // Add first transaction button
        const addFirstBtn = this.$('.add-first-transaction');
        if (addFirstBtn) {
            this.addEventListener(addFirstBtn, 'click', () => this.handleNewPurchase());
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
        const searchInput = this.$('.transactions-search');
        if (searchInput) {
            searchInput.value = '';
        }
        this.applyFilters();
    }

    setVendorFilter(vendorId) {
        this.selectedVendor = vendorId;
        this.applyFilters();
    }

    setPeriodFilter(period) {
        this.selectedPeriod = period;

        const dateRangePicker = this.$('.date-range-picker');
        if (dateRangePicker) {
            dateRangePicker.style.display = period === 'custom' ? 'flex' : 'none';
        }

        if (period !== 'custom') {
            this.setDateRangeByPeriod(period);
        }
    }

    setDateRangeByPeriod(period) {
        const now = new Date();
        let fromDate = null;

        switch (period) {
            case 'today':
                fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                fromDate = new Date(now.getFullYear(), quarter * 3, 1);
                break;
            case 'year':
                fromDate = new Date(now.getFullYear(), 0, 1);
                break;
            case 'all':
            default:
                this.dateRange = { from: null, to: null };
                this.applyFilters();
                return;
        }

        this.dateRange = {
            from: fromDate.toISOString().split('T')[0],
            to: now.toISOString().split('T')[0]
        };
        this.applyFilters();
    }

    setDateRange(from, to) {
        if (from && to) {
            this.dateRange = { from, to };
            this.applyFilters();
        }
    }

    setSortFilter(sort) {
        this.sortBy = sort;
        this.applyFilters();
    }

    applyFilters() {
        let filtered = [...this.transactions];

        // Apply search filter
        if (this.searchTerm.trim()) {
            filtered = filtered.filter(transaction => {
                const searchFields = [
                    transaction.vendor_name || '',
                    transaction.service_name || '',
                    transaction.notes || '',
                    (transaction.price_usd || 0).toString(),
                    (transaction.credits || 0).toString()
                ].map(field => field.toLowerCase());

                return searchFields.some(field => field.includes(this.searchTerm));
            });
        }

        // Apply vendor filter
        if (this.selectedVendor && this.selectedVendor !== 'all') {
            filtered = filtered.filter(transaction =>
                transaction.vendor_id.toString() === this.selectedVendor.toString()
            );
        }

        // Apply date range filter
        if (this.dateRange.from || this.dateRange.to) {
            filtered = filtered.filter(transaction => {
                const transactionDate = new Date(transaction.purchase_date);

                if (this.dateRange.from && transactionDate < new Date(this.dateRange.from)) return false;
                if (this.dateRange.to && transactionDate > new Date(this.dateRange.to)) return false;

                return true;
            });
        }

        // Apply sorting
        if (this.sortBy) {
            filtered.sort((a, b) => {
                switch (this.sortBy) {
                    case 'date_desc':
                        return new Date(b.purchase_date) - new Date(a.purchase_date);
                    case 'date_asc':
                        return new Date(a.purchase_date) - new Date(b.purchase_date);
                    case 'amount_desc':
                        return (b.price_usd || 0) - (a.price_usd || 0);
                    case 'amount_asc':
                        return (a.price_usd || 0) - (b.price_usd || 0);
                    case 'vendor':
                        return (a.vendor_name || '').localeCompare(b.vendor_name || '');
                    case 'credits_desc':
                        return (b.credits || 0) - (a.credits || 0);
                    default:
                        return new Date(b.purchase_date) - new Date(a.purchase_date);
                }
            });
        }

        this.filteredTransactions = filtered;
        this.updateDisplay();
    }

    async updateDisplay() {
        const container = this.$('.transactions-list-container');
        const stats = this.$('.transaction-stats');
        const summary = this.$('.vendor-summary');

        if (container) {
            container.innerHTML = this.getTransactionsListTemplate();
            this.bindTransactionActions();
        }

        if (stats) {
            stats.innerHTML = this.getTransactionStatsTemplate();
        }

        if (summary) {
            summary.innerHTML = this.getVendorSummaryTemplate();
        }
    }

    // Calculation methods
    calculateTransactionStats() {
        const totalSpent = this.filteredTransactions.reduce((sum, t) => sum + (t.price_usd || 0), 0);
        const totalCredits = this.filteredTransactions.reduce((sum, t) => sum + (t.credits || 0), 0);
        const totalTransactions = this.filteredTransactions.length;

        const avgPurchaseAmount = totalTransactions > 0 ? totalSpent / totalTransactions : 0;
        const avgCreditsPerPurchase = totalTransactions > 0 ? totalCredits / totalTransactions : 0;
        const avgCostPerCredit = totalCredits > 0 ? totalSpent / totalCredits : 0;

        // Find top vendor
        const vendorTotals = {};
        this.filteredTransactions.forEach(transaction => {
            const name = transaction.vendor_name || 'Unknown';
            vendorTotals[name] = (vendorTotals[name] || 0) + (transaction.price_usd || 0);
        });

        const topVendor = Object.entries(vendorTotals).reduce(
            (max, [name, amount]) => amount > max.amount ? { name, amount } : max,
            { name: 'None', amount: 0 }
        );

        return {
            totalSpent,
            totalCredits,
            totalTransactions,
            avgPurchaseAmount,
            avgCreditsPerPurchase,
            avgCostPerCredit,
            topVendor
        };
    }

    calculateVendorSummary() {
        const vendorMap = new Map();

        // Group transactions by vendor
        this.filteredTransactions.forEach(transaction => {
            const vendorId = transaction.vendor_id;
            const vendorName = transaction.vendor_name || 'Unknown';

            if (!vendorMap.has(vendorId)) {
                vendorMap.set(vendorId, {
                    id: vendorId,
                    name: vendorName,
                    transactions: [],
                    totalSpent: 0,
                    totalCredits: 0
                });
            }

            const vendor = vendorMap.get(vendorId);
            vendor.transactions.push(transaction);
            vendor.totalSpent += transaction.price_usd || 0;
            vendor.totalCredits += transaction.credits || 0;
        });

        // Calculate summary metrics for each vendor
        return Array.from(vendorMap.values()).map(vendor => {
            const transactionCount = vendor.transactions.length;
            const avgCostPerCredit = vendor.totalCredits > 0 ? vendor.totalSpent / vendor.totalCredits : 0;

            // Simple trend calculation (last 3 vs previous 3 transactions)
            const recent = vendor.transactions.slice(-3);
            const previous = vendor.transactions.slice(-6, -3);
            const recentAvg = recent.length > 0 ? recent.reduce((sum, t) => sum + (t.price_usd || 0), 0) / recent.length : 0;
            const previousAvg = previous.length > 0 ? previous.reduce((sum, t) => sum + (t.price_usd || 0), 0) / previous.length : 0;

            let trend = 'stable';
            if (recentAvg > previousAvg * 1.1) trend = 'increasing';
            else if (recentAvg < previousAvg * 0.9) trend = 'decreasing';

            return {
                ...vendor,
                transactionCount,
                avgCostPerCredit,
                trend
            };
        }).sort((a, b) => b.totalSpent - a.totalSpent); // Sort by total spent
    }

    getVendorTrendIcon(trend) {
        switch (trend) {
            case 'increasing': return '📈';
            case 'decreasing': return '📉';
            default: return '➖';
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

    formatTime(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Action handlers
    handleNewPurchase() {
        this.emit('newPurchaseRequested');
        console.log('New purchase requested');
    }

    handleViewDetails(transactionId) {
        const transaction = this.transactions.find(t => t.id.toString() === transactionId.toString());
        if (transaction) {
            this.showTransactionDetails(transaction);
        }
    }

    showTransactionDetails(transaction) {
        const modal = WidgetManager.getWidget('confirmation-modal');
        if (modal) {
            modal.show({
                title: 'Transaction Details',
                message: this.getTransactionDetailsContent(transaction),
                confirmText: 'Close',
                cancelText: null,
                onConfirm: () => { }
            });
        }
    }

    getTransactionDetailsContent(transaction) {
        const costPerCredit = transaction.credits > 0 ? transaction.price_usd / transaction.credits : 0;

        return `
            <div class="transaction-details-modal">
                <div class="detail-section">
                    <h5>Transaction Information</h5>
                    <div class="detail-row"><strong>Transaction ID:</strong> ${transaction.id}</div>
                    <div class="detail-row"><strong>Purchase Date:</strong> ${this.formatDate(transaction.purchase_date)}</div>
                    <div class="detail-row"><strong>Created:</strong> ${this.formatDate(transaction.created_date)}</div>
                </div>
                
                <div class="detail-section">
                    <h5>Vendor Information</h5>
                    <div class="detail-row"><strong>Vendor:</strong> ${this.escapeHtml(transaction.vendor_name)}</div>
                    <div class="detail-row"><strong>Vendor ID:</strong> ${transaction.vendor_id}</div>
                    <div class="detail-row"><strong>Service:</strong> ${this.escapeHtml(transaction.service_name)}</div>
                </div>
                
                <div class="detail-section">
                    <h5>Purchase Details</h5>
                    <div class="detail-row"><strong>Credits Purchased:</strong> ${this.formatNumber(transaction.credits)}</div>
                    <div class="detail-row"><strong>Total Amount:</strong> ${this.formatCurrency(transaction.price_usd)}</div>
                    <div class="detail-row"><strong>Cost per Credit:</strong> ${this.formatCurrency(costPerCredit)}</div>
                </div>
                
                ${transaction.notes ? `
                    <div class="detail-section">
                        <h5>Notes</h5>
                        <div class="detail-row">${this.escapeHtml(transaction.notes)}</div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    handleEditTransaction(transactionId) {
        this.emit('editTransactionRequested', { transactionId });
        console.log('Edit transaction requested:', transactionId);
    }

    handleDropdownAction(action, transactionId) {
        switch (action) {
            case 'duplicate':
                this.handleDuplicateTransaction(transactionId);
                break;
            case 'receipt':
                this.handleGenerateReceipt(transactionId);
                break;
            case 'notes':
                this.handleEditNotes(transactionId);
                break;
            case 'delete':
                this.handleDeleteTransaction(transactionId);
                break;
        }

        // Hide dropdown
        this.$$('.actions-dropdown').forEach(dropdown => {
            dropdown.style.display = 'none';
        });
    }

    handleDuplicateTransaction(transactionId) {
        const transaction = this.transactions.find(t => t.id.toString() === transactionId.toString());
        if (transaction) {
            this.emit('duplicateTransactionRequested', { transaction });
            console.log('Duplicate transaction requested:', transactionId);
        }
    }

    handleGenerateReceipt(transactionId) {
        this.emit('generateReceiptRequested', { transactionId });
        console.log('Generate receipt requested:', transactionId);
    }

    async handleEditNotes(transactionId) {
        const transaction = this.transactions.find(t => t.id.toString() === transactionId.toString());
        if (!transaction) return;

        const newNotes = prompt('Edit notes:', transaction.notes || '');
        if (newNotes === null) return; // User cancelled

        try {
            const response = await fetch(`/api/vendor-transactions/${transactionId}/notes`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: newNotes })
            });

            if (!response.ok) {
                throw new Error('Failed to update notes');
            }

            // Update local data
            transaction.notes = newNotes;
            this.updateDisplay();

            this.showSuccessMessage('Notes updated successfully');
        } catch (error) {
            this.showErrorMessage('Failed to update notes');
        }
    }

    async handleDeleteTransaction(transactionId) {
        const transaction = this.transactions.find(t => t.id.toString() === transactionId.toString());
        if (!transaction) return;

        const modal = WidgetManager.getWidget('confirmation-modal');
        if (modal) {
            modal.confirmDelete(`this transaction (${this.formatCurrency(transaction.price_usd)})`, async () => {
                try {
                    const response = await fetch(`/api/vendor-transactions/${transactionId}`, {
                        method: 'DELETE'
                    });

                    if (!response.ok) {
                        throw new Error('Failed to delete transaction');
                    }

                    // Remove from local data
                    this.transactions = this.transactions.filter(t => t.id.toString() !== transactionId.toString());
                    this.applyFilters();

                    this.showSuccessMessage('Transaction deleted successfully');
                } catch (error) {
                    this.showErrorMessage('Failed to delete transaction');
                }
            });
        }
    }

    exportTransactions() {
        const csvData = this.generateTransactionsCSV();
        const filename = `vendor-transactions-${Date.now()}.csv`;
        this.downloadFile(csvData, filename, 'text/csv');
    }

    generateTransactionsCSV() {
        const headers = [
            'Transaction ID', 'Date', 'Vendor', 'Service', 'Credits',
            'Amount USD', 'Cost per Credit', 'Notes'
        ];

        const rows = this.filteredTransactions.map(transaction => [
            transaction.id,
            transaction.purchase_date,
            transaction.vendor_name,
            transaction.service_name,
            transaction.credits,
            transaction.price_usd,
            transaction.credits > 0 ? (transaction.price_usd / transaction.credits) : 0,
            transaction.notes || ''
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

    searchTransactions(query) {
        this.handleSearch(query);
    }

    filterByVendor(vendorId) {
        this.setVendorFilter(vendorId);
    }

    getTransactionStats() {
        return this.calculateTransactionStats();
    }

    getVendorSummary() {
        return this.calculateVendorSummary();
    }

    exportVendorSummary() {
        const summary = this.calculateVendorSummary();
        const headers = ['Vendor', 'Transactions', 'Total Spent', 'Credits', 'Avg Cost/Credit', 'Trend'];

        const rows = summary.map(vendor => [
            vendor.name,
            vendor.transactionCount,
            vendor.totalSpent,
            vendor.totalCredits,
            vendor.avgCostPerCredit,
            vendor.trend
        ]);

        const csvData = [headers, ...rows].map(row =>
            row.map(field => `"${field}"`).join(',')
        ).join('\n');

        this.downloadFile(csvData, `vendor-summary-${Date.now()}.csv`, 'text/csv');
    }
}

window.VendorTransactionsWidget = VendorTransactionsWidget;
