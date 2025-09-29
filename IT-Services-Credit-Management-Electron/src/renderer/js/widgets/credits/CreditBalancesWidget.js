class CreditBalancesWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.balances = [];
        this.filteredBalances = [];
        this.searchTerm = '';
        this.filterStatus = 'all';
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            autoRefresh: true,
            refreshInterval: 30000, // 30 seconds
            showSearch: true,
            showFilters: true,
            showLowStockAlerts: true,
            lowStockThreshold: 10,
            showActions: true
        };
    }

    async loadData() {
        try {
            this.log('Loading credit balances...');
            const response = await fetch('/api/credit-balances');
            if (!response.ok) throw new Error('Failed to fetch credit balances');

            this.balances = await response.json();
            this.filteredBalances = [...this.balances];
            this.log(`Loaded ${this.balances.length} credit balances`);
        } catch (error) {
            this.handleError('Failed to load credit balances', error);
        }
    }

    async getTemplate() {
        return `
            <div class="credit-balances-widget">
                <div class="balances-header">
                    <h3>💳 Credit Balances</h3>
                    <div class="header-actions">
                        <button class="btn-primary purchase-credits-btn">💸 Purchase Credits</button>
                        <button class="btn-secondary refresh-balances-btn">🔄 Refresh</button>
                    </div>
                </div>
                
                ${this.getFiltersTemplate()}
                ${this.options.showLowStockAlerts ? this.getLowStockAlertsTemplate() : ''}
                
                <div class="balances-summary">
                    ${this.getBalancesSummaryTemplate()}
                </div>
                
                <div class="balances-list-container">
                    ${this.getBalancesListTemplate()}
                </div>
            </div>
        `;
    }

    getFiltersTemplate() {
        return `
            <div class="balances-filters">
                ${this.options.showSearch ? `
                    <div class="search-container">
                        <input type="text" class="balances-search" 
                               placeholder="🔍 Search by vendor or service..."
                               value="${this.searchTerm}">
                        <button class="btn-clear search-clear">✕</button>
                    </div>
                ` : ''}
                
                ${this.options.showFilters ? `
                    <div class="filter-controls">
                        <select class="status-filter">
                            <option value="all">All Balances</option>
                            <option value="good">Good Stock (>50)</option>
                            <option value="low">Low Stock (≤50)</option>
                            <option value="critical">Critical Stock (≤10)</option>
                            <option value="empty">Empty (0)</option>
                        </select>
                        
                        <select class="sort-filter">
                            <option value="vendor">Sort by Vendor</option>
                            <option value="service">Sort by Service</option>
                            <option value="balance_desc">Highest Balance</option>
                            <option value="balance_asc">Lowest Balance</option>
                        </select>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getLowStockAlertsTemplate() {
        const lowStockItems = this.balances.filter(b =>
            b.remaining_credits <= this.options.lowStockThreshold && b.remaining_credits > 0
        );
        const emptyItems = this.balances.filter(b => b.remaining_credits === 0);

        if (lowStockItems.length === 0 && emptyItems.length === 0) {
            return '';
        }

        return `
            <div class="low-stock-alerts">
                <h4>⚠️ Stock Alerts</h4>
                <div class="alerts-container">
                    ${emptyItems.length > 0 ? `
                        <div class="alert-group critical">
                            <div class="alert-title">🔴 Out of Stock (${emptyItems.length})</div>
                            <div class="alert-items">
                                ${emptyItems.slice(0, 3).map(item => `
                                    <span class="alert-item">${item.vendor_name} - ${item.service_name}</span>
                                `).join('')}
                                ${emptyItems.length > 3 ? `<span class="alert-more">+${emptyItems.length - 3} more</span>` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${lowStockItems.length > 0 ? `
                        <div class="alert-group warning">
                            <div class="alert-title">🟡 Low Stock (${lowStockItems.length})</div>
                            <div class="alert-items">
                                ${lowStockItems.slice(0, 3).map(item => `
                                    <span class="alert-item">${item.vendor_name} - ${item.service_name} (${item.remaining_credits})</span>
                                `).join('')}
                                ${lowStockItems.length > 3 ? `<span class="alert-more">+${lowStockItems.length - 3} more</span>` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getBalancesSummaryTemplate() {
        const totalCredits = this.filteredBalances.reduce((sum, b) => sum + b.remaining_credits, 0);
        const totalValue = this.filteredBalances.reduce((sum, b) => sum + (b.remaining_credits * (b.avg_cost_per_credit || 0)), 0);
        const lowStockCount = this.filteredBalances.filter(b => b.remaining_credits <= this.options.lowStockThreshold).length;
        const vendorCount = new Set(this.filteredBalances.map(b => b.vendor_name)).size;

        return `
            <div class="summary-cards">
                <div class="summary-card total-credits">
                    <div class="card-icon">💳</div>
                    <div class="card-content">
                        <div class="card-value">${this.formatNumber(totalCredits)}</div>
                        <div class="card-label">Total Credits</div>
                    </div>
                </div>
                
                <div class="summary-card total-value">
                    <div class="card-icon">💰</div>
                    <div class="card-content">
                        <div class="card-value">${this.formatCurrency(totalValue)}</div>
                        <div class="card-label">Total Value</div>
                    </div>
                </div>
                
                <div class="summary-card vendor-count">
                    <div class="card-icon">🏭</div>
                    <div class="card-content">
                        <div class="card-value">${vendorCount}</div>
                        <div class="card-label">Active Vendors</div>
                    </div>
                </div>
                
                <div class="summary-card alerts ${lowStockCount > 0 ? 'has-alerts' : ''}">
                    <div class="card-icon">${lowStockCount > 0 ? '⚠️' : '✅'}</div>
                    <div class="card-content">
                        <div class="card-value">${lowStockCount}</div>
                        <div class="card-label">Low Stock Items</div>
                    </div>
                </div>
            </div>
        `;
    }

    getBalancesListTemplate() {
        if (this.filteredBalances.length === 0) {
            return `
                <div class="no-balances">
                    <div class="no-data-icon">💳</div>
                    <h4>No Credit Balances Found</h4>
                    <p>No credit balances match your current search or filter criteria.</p>
                    <button class="btn-primary purchase-first-credits">💸 Purchase Your First Credits</button>
                </div>
            `;
        }

        return `
            <div class="balances-list">
                <div class="list-header">
                    <span class="result-count">${this.filteredBalances.length} balances found</span>
                    <div class="list-actions">
                        <button class="btn-secondary export-balances">📊 Export</button>
                    </div>
                </div>
                
                <div class="balances-grid">
                    ${this.filteredBalances.map(balance => this.getBalanceCardTemplate(balance)).join('')}
                </div>
            </div>
        `;
    }

    getBalanceCardTemplate(balance) {
        const stockLevel = this.getStockLevel(balance.remaining_credits);
        const costPerCredit = balance.avg_cost_per_credit || 0;
        const totalValue = balance.remaining_credits * costPerCredit;

        return `
            <div class="balance-card ${stockLevel}" data-balance-id="${balance.id}">
                <div class="balance-header">
                    <div class="vendor-service">
                        <h4 class="vendor-name">${this.escapeHtml(balance.vendor_name)}</h4>
                        <div class="service-name">${this.escapeHtml(balance.service_name)}</div>
                    </div>
                    <div class="stock-indicator ${stockLevel}">
                        ${this.getStockIcon(stockLevel)}
                    </div>
                </div>
                
                <div class="balance-details">
                    <div class="balance-main">
                        <div class="credits-count">
                            <span class="credits-number">${this.formatNumber(balance.remaining_credits)}</span>
                            <span class="credits-label">credits</span>
                        </div>
                        <div class="balance-value">
                            Value: ${this.formatCurrency(totalValue)}
                        </div>
                    </div>
                    
                    <div class="balance-metadata">
                        <div class="metadata-row">
                            <span class="label">Cost/Credit:</span>
                            <span class="value">${this.formatCurrency(costPerCredit)}</span>
                        </div>
                        <div class="metadata-row">
                            <span class="label">Last Purchase:</span>
                            <span class="value">${balance.last_purchase_date ? this.formatDate(balance.last_purchase_date) : 'Never'}</span>
                        </div>
                        <div class="metadata-row">
                            <span class="label">Total Purchased:</span>
                            <span class="value">${this.formatNumber(balance.total_purchased_credits || 0)}</span>
                        </div>
                        <div class="metadata-row">
                            <span class="label">Total Used:</span>
                            <span class="value">${this.formatNumber(balance.total_used_credits || 0)}</span>
                        </div>
                    </div>
                </div>
                
                ${this.options.showActions ? this.getBalanceActionsTemplate(balance, stockLevel) : ''}
            </div>
        `;
    }

    getBalanceActionsTemplate(balance, stockLevel) {
        return `
            <div class="balance-actions">
                <button class="btn-primary purchase-more-btn" 
                        data-vendor-id="${balance.vendor_id}"
                        data-service-name="${balance.service_name}">
                    💸 Purchase More
                </button>
                <button class="btn-info view-history-btn" 
                        data-vendor-id="${balance.vendor_id}"
                        data-service-name="${balance.service_name}">
                    📊 View History
                </button>
                <button class="btn-secondary usage-report-btn" 
                        data-vendor-id="${balance.vendor_id}"
                        data-service-name="${balance.service_name}">
                    📈 Usage Report
                </button>
                
                ${stockLevel === 'critical' || stockLevel === 'empty' ? `
                    <div class="urgent-action">
                        <button class="btn-warning urgent-purchase-btn" 
                                data-vendor-id="${balance.vendor_id}"
                                data-service-name="${balance.service_name}">
                            🚨 Urgent Purchase
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getStockLevel(credits) {
        if (credits === 0) return 'empty';
        if (credits <= this.options.lowStockThreshold) return 'critical';
        if (credits <= 50) return 'low';
        return 'good';
    }

    getStockIcon(stockLevel) {
        switch (stockLevel) {
            case 'good': return '🟢';
            case 'low': return '🟡';
            case 'critical': return '🟠';
            case 'empty': return '🔴';
            default: return '❓';
        }
    }

    bindEvents() {
        // Header actions
        const purchaseBtn = this.$('.purchase-credits-btn');
        if (purchaseBtn) {
            this.addEventListener(purchaseBtn, 'click', () => this.handlePurchaseCredits());
        }

        const refreshBtn = this.$('.refresh-balances-btn');
        if (refreshBtn) {
            this.addEventListener(refreshBtn, 'click', () => this.refresh());
        }

        // Search and filters
        const searchInput = this.$('.balances-search');
        if (searchInput) {
            this.addEventListener(searchInput, 'input', (e) => this.handleSearch(e.target.value));
        }

        const searchClear = this.$('.search-clear');
        if (searchClear) {
            this.addEventListener(searchClear, 'click', () => this.clearSearch());
        }

        const statusFilter = this.$('.status-filter');
        if (statusFilter) {
            this.addEventListener(statusFilter, 'change', (e) => this.setStatusFilter(e.target.value));
        }

        const sortFilter = this.$('.sort-filter');
        if (sortFilter) {
            this.addEventListener(sortFilter, 'change', (e) => this.setSortFilter(e.target.value));
        }

        // Export button
        const exportBtn = this.$('.export-balances');
        if (exportBtn) {
            this.addEventListener(exportBtn, 'click', () => this.exportBalances());
        }

        // Balance actions
        this.bindBalanceActions();
    }

    bindBalanceActions() {
        // Purchase more buttons
        this.$$('.purchase-more-btn, .urgent-purchase-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const vendorId = e.target.getAttribute('data-vendor-id');
                const serviceName = e.target.getAttribute('data-service-name');
                this.handlePurchaseMore(vendorId, serviceName);
            });
        });

        // View history buttons
        this.$$('.view-history-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const vendorId = e.target.getAttribute('data-vendor-id');
                const serviceName = e.target.getAttribute('data-service-name');
                this.handleViewHistory(vendorId, serviceName);
            });
        });

        // Usage report buttons
        this.$$('.usage-report-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const vendorId = e.target.getAttribute('data-vendor-id');
                const serviceName = e.target.getAttribute('data-service-name');
                this.handleUsageReport(vendorId, serviceName);
            });
        });

        // Purchase first credits button
        const purchaseFirstBtn = this.$('.purchase-first-credits');
        if (purchaseFirstBtn) {
            this.addEventListener(purchaseFirstBtn, 'click', () => this.handlePurchaseCredits());
        }
    }

    async onAfterRender() {
        if (this.options.autoRefresh) {
            this.startAutoRefresh();
        }
    }

    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(async () => {
            await this.refresh();
        }, this.options.refreshInterval);
    }

    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.applyFilters();
    }

    clearSearch() {
        this.searchTerm = '';
        const searchInput = this.$('.balances-search');
        if (searchInput) {
            searchInput.value = '';
        }
        this.applyFilters();
    }

    setStatusFilter(status) {
        this.filterStatus = status;
        this.applyFilters();
    }

    setSortFilter(sort) {
        this.sortBy = sort;
        this.applyFilters();
    }

    applyFilters() {
        let filtered = [...this.balances];

        // Apply search filter
        if (this.searchTerm.trim()) {
            filtered = filtered.filter(balance => {
                const searchFields = [
                    balance.vendor_name || '',
                    balance.service_name || ''
                ].map(field => field.toLowerCase());

                return searchFields.some(field => field.includes(this.searchTerm));
            });
        }

        // Apply status filter
        if (this.filterStatus !== 'all') {
            filtered = filtered.filter(balance => {
                const credits = balance.remaining_credits;
                switch (this.filterStatus) {
                    case 'good': return credits > 50;
                    case 'low': return credits <= 50 && credits > 10;
                    case 'critical': return credits <= 10 && credits > 0;
                    case 'empty': return credits === 0;
                    default: return true;
                }
            });
        }

        // Apply sorting
        if (this.sortBy) {
            filtered.sort((a, b) => {
                switch (this.sortBy) {
                    case 'vendor':
                        return a.vendor_name.localeCompare(b.vendor_name);
                    case 'service':
                        return a.service_name.localeCompare(b.service_name);
                    case 'balance_desc':
                        return b.remaining_credits - a.remaining_credits;
                    case 'balance_asc':
                        return a.remaining_credits - b.remaining_credits;
                    default:
                        return a.vendor_name.localeCompare(b.vendor_name);
                }
            });
        }

        this.filteredBalances = filtered;
        this.updateDisplay();
    }

    async updateDisplay() {
        const container = this.$('.balances-list-container');
        const summary = this.$('.balances-summary');
        const alerts = this.$('.low-stock-alerts');

        if (container) {
            container.innerHTML = this.getBalancesListTemplate();
            this.bindBalanceActions();
        }

        if (summary) {
            summary.innerHTML = this.getBalancesSummaryTemplate();
        }

        if (alerts) {
            alerts.outerHTML = this.getLowStockAlertsTemplate();
        }
    }

    // Action handlers
    handlePurchaseCredits() {
        this.emit('purchaseCreditsRequested');
        console.log('Purchase credits requested');
    }

    handlePurchaseMore(vendorId, serviceName) {
        this.emit('purchaseCreditsRequested', { vendorId, serviceName });
        console.log('Purchase more credits requested:', { vendorId, serviceName });
    }

    handleViewHistory(vendorId, serviceName) {
        this.emit('viewHistoryRequested', { vendorId, serviceName });
        console.log('View history requested:', { vendorId, serviceName });
    }

    handleUsageReport(vendorId, serviceName) {
        this.emit('usageReportRequested', { vendorId, serviceName });
        console.log('Usage report requested:', { vendorId, serviceName });
    }

    exportBalances() {
        const csvData = this.generateBalancesCSV();
        this.downloadFile(csvData, 'credit-balances.csv', 'text/csv');
    }

    generateBalancesCSV() {
        const headers = [
            'Vendor', 'Service', 'Remaining Credits', 'Cost Per Credit',
            'Total Value', 'Total Purchased', 'Total Used', 'Stock Level', 'Last Purchase'
        ];

        const rows = this.filteredBalances.map(balance => [
            balance.vendor_name,
            balance.service_name,
            balance.remaining_credits,
            balance.avg_cost_per_credit || 0,
            balance.remaining_credits * (balance.avg_cost_per_credit || 0),
            balance.total_purchased_credits || 0,
            balance.total_used_credits || 0,
            this.getStockLevel(balance.remaining_credits),
            balance.last_purchase_date || 'Never'
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

    destroy() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        super.destroy();
    }

    // Public API
    async refresh() {
        await this.loadData();
        this.applyFilters();
    }

    searchBalances(query) {
        this.handleSearch(query);
    }

    filterByStatus(status) {
        this.setStatusFilter(status);
    }

    getBalance(vendorId, serviceName) {
        return this.balances.find(b =>
            b.vendor_id === vendorId && b.service_name === serviceName
        );
    }

    getTotalCredits() {
        return this.balances.reduce((sum, b) => sum + b.remaining_credits, 0);
    }

    getLowStockItems() {
        return this.balances.filter(b =>
            b.remaining_credits <= this.options.lowStockThreshold
        );
    }

    setLowStockThreshold(threshold) {
        this.options.lowStockThreshold = threshold;
        this.render();
    }
}

window.CreditBalancesWidget = CreditBalancesWidget;
