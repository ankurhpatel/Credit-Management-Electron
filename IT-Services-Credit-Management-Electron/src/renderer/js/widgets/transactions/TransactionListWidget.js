class TransactionListWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.transactions = [];
        this.filteredTransactions = [];
        this.searchTerm = '';
        this.filterType = 'all';
        this.dateRange = { from: null, to: null };
        this.currentPage = 1;
        this.itemsPerPage = 20;
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showSearch: true,
            showFilters: true,
            showPagination: true,
            showExport: true,
            showActions: true,
            itemsPerPage: 20,
            autoRefresh: false,
            refreshInterval: 60000
        };
    }

    async loadData() {
        try {
            this.log('Loading transactions...');
            const response = await fetch('/api/transactions');
            if (!response.ok) throw new Error('Failed to fetch transactions');

            this.transactions = await response.json();
            this.filteredTransactions = [...this.transactions];
            this.log(`Loaded ${this.transactions.length} transactions`);
        } catch (error) {
            this.handleError('Failed to load transactions', error);
        }
    }

    async getTemplate() {
        return `
            <div class="transactions-widget">
                <div class="transactions-header">
                    <h3>💳 Transaction History</h3>
                    <div class="header-actions">
                        <button class="btn-primary add-transaction-btn">➕ Add Transaction</button>
                        <button class="btn-secondary refresh-transactions-btn">🔄 Refresh</button>
                        ${this.options.showExport ? `
                            <button class="btn-info export-transactions-btn">📊 Export</button>
                        ` : ''}
                    </div>
                </div>
                
                ${this.getFiltersTemplate()}
                
                <div class="transactions-summary">
                    ${this.getTransactionsSummaryTemplate()}
                </div>
                
                <div class="transactions-list-container">
                    ${this.getTransactionsListTemplate()}
                </div>
                
                ${this.options.showPagination ? this.getPaginationTemplate() : ''}
            </div>
        `;
    }

    getFiltersTemplate() {
        return `
            <div class="transactions-filters">
                ${this.options.showSearch ? `
                    <div class="search-container">
                        <input type="text" class="transactions-search" 
                               placeholder="🔍 Search by customer, service, amount..."
                               value="${this.searchTerm}">
                        <button class="btn-clear search-clear">✕</button>
                    </div>
                ` : ''}
                
                ${this.options.showFilters ? `
                    <div class="filter-controls">
                        <select class="type-filter">
                            <option value="all">All Transactions</option>
                            <option value="subscription">Subscriptions</option>
                            <option value="purchase">Credit Purchases</option>
                            <option value="business">Business Transactions</option>
                        </select>
                        
                        <select class="status-filter">
                            <option value="all">All Status</option>
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
                ` : ''}
                
                <div class="date-filters">
                    <input type="date" class="date-from" placeholder="From">
                    <input type="date" class="date-to" placeholder="To">
                    <button class="btn-secondary clear-dates">Clear Dates</button>
                </div>
            </div>
        `;
    }

    getTransactionsSummaryTemplate() {
        const summary = this.calculateTransactionsSummary();

        return `
            <div class="summary-cards">
                <div class="summary-card total-transactions">
                    <div class="card-icon">📊</div>
                    <div class="card-content">
                        <div class="card-value">${summary.totalCount}</div>
                        <div class="card-label">Total Transactions</div>
                        <div class="card-detail">in selected period</div>
                    </div>
                </div>
                
                <div class="summary-card total-revenue">
                    <div class="card-icon">💰</div>
                    <div class="card-content">
                        <div class="card-value">${this.formatCurrency(summary.totalRevenue)}</div>
                        <div class="card-label">Total Revenue</div>
                        <div class="card-detail">from customer sales</div>
                    </div>
                </div>
                
                <div class="summary-card avg-transaction">
                    <div class="card-icon">📈</div>
                    <div class="card-content">
                        <div class="card-value">${this.formatCurrency(summary.avgTransaction)}</div>
                        <div class="card-label">Avg Transaction</div>
                        <div class="card-detail">per sale</div>
                    </div>
                </div>
                
                <div class="summary-card active-customers">
                    <div class="card-icon">👥</div>
                    <div class="card-content">
                        <div class="card-value">${summary.activeCustomers}</div>
                        <div class="card-label">Active Customers</div>
                        <div class="card-detail">with transactions</div>
                    </div>
                </div>
            </div>
        `;
    }

    getTransactionsListTemplate() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageTransactions = this.filteredTransactions.slice(startIndex, endIndex);

        if (this.filteredTransactions.length === 0) {
            return `
                <div class="no-transactions">
                    <div class="no-data-icon">💳</div>
                    <h4>No Transactions Found</h4>
                    <p>No transactions match your current search or filter criteria.</p>
                    <button class="btn-primary add-first-transaction">➕ Add First Transaction</button>
                </div>
            `;
        }

        return `
            <div class="transactions-list">
                <div class="list-header">
                    <span class="result-count">
                        Showing ${startIndex + 1}-${Math.min(endIndex, this.filteredTransactions.length)} 
                        of ${this.filteredTransactions.length} transactions
                    </span>
                </div>
                
                <div class="transactions-table">
                    <div class="table-header">
                        <div class="col-date">Date</div>
                        <div class="col-customer">Customer</div>
                        <div class="col-service">Service</div>
                        <div class="col-amount">Amount</div>
                        <div class="col-status">Status</div>
                        <div class="col-actions">Actions</div>
                    </div>
                    
                    <div class="table-body">
                        ${pageTransactions.map(transaction => this.getTransactionRowTemplate(transaction)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    getTransactionRowTemplate(transaction) {
        const transactionType = this.getTransactionType(transaction);
        const statusClass = this.getStatusClass(transaction.status);

        return `
            <div class="transaction-row ${statusClass}" data-transaction-id="${transaction.id}">
                <div class="col-date">
                    <div class="date-main">${this.formatDate(transaction.start_date || transaction.transaction_date)}</div>
                    <div class="date-time">${this.formatTime(transaction.created_date)}</div>
                </div>
                
                <div class="col-customer">
                    <div class="customer-name">${this.escapeHtml(transaction.customer_name || 'N/A')}</div>
                    <div class="customer-id">ID: ${transaction.customer_id || 'N/A'}</div>
                </div>
                
                <div class="col-service">
                    <div class="service-name">${this.escapeHtml(transaction.service_name || transactionType)}</div>
                    <div class="service-details">
                        ${transaction.classification ? `📍 ${this.escapeHtml(transaction.classification)}` : ''}
                        ${transaction.credits_used ? `📊 ${transaction.credits_used} credits` : ''}
                    </div>
                </div>
                
                <div class="col-amount">
                    <div class="amount-main">${this.formatCurrency(transaction.amount_paid || transaction.amount || 0)}</div>
                    ${transaction.credits_used ? `
                        <div class="amount-detail">${this.formatCurrency((transaction.amount_paid || 0) / transaction.credits_used)}/credit</div>
                    ` : ''}
                </div>
                
                <div class="col-status">
                    <span class="status-badge ${statusClass}">
                        ${this.getStatusIcon(transaction.status)} ${transaction.status || 'Unknown'}
                    </span>
                    ${transaction.expiration_date ? `
                        <div class="expiry-date">Expires: ${this.formatDate(transaction.expiration_date)}</div>
                    ` : ''}
                </div>
                
                <div class="col-actions">
                    ${this.options.showActions ? this.getTransactionActionsTemplate(transaction) : ''}
                </div>
            </div>
        `;
    }

    getTransactionActionsTemplate(transaction) {
        return `
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
                <button class="btn-small btn-primary print-receipt-btn" 
                        data-transaction-id="${transaction.id}"
                        title="Print Receipt">
                    🖨️
                </button>
                <div class="more-actions">
                    <button class="btn-small btn-secondary more-actions-btn" title="More Actions">⋯</button>
                    <div class="actions-dropdown">
                        <button class="dropdown-item" data-action="duplicate" data-transaction-id="${transaction.id}">
                            📋 Duplicate
                        </button>
                        <button class="dropdown-item" data-action="extend" data-transaction-id="${transaction.id}">
                            ⏰ Extend
                        </button>
                        <button class="dropdown-item" data-action="cancel" data-transaction-id="${transaction.id}">
                            🚫 Cancel
                        </button>
                        <hr>
                        <button class="dropdown-item danger" data-action="delete" data-transaction-id="${transaction.id}">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getPaginationTemplate() {
        const totalPages = Math.ceil(this.filteredTransactions.length / this.itemsPerPage);

        if (totalPages <= 1) return '';

        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        return `
            <div class="pagination">
                <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} 
                        data-page="${this.currentPage - 1}">
                    ← Previous
                </button>
                
                ${startPage > 1 ? `
                    <button class="pagination-btn" data-page="1">1</button>
                    ${startPage > 2 ? '<span class="pagination-dots">...</span>' : ''}
                ` : ''}
                
                ${Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(page => `
                    <button class="pagination-btn ${page === this.currentPage ? 'active' : ''}" 
                            data-page="${page}">
                        ${page}
                    </button>
                `).join('')}
                
                ${endPage < totalPages ? `
                    ${endPage < totalPages - 1 ? '<span class="pagination-dots">...</span>' : ''}
                    <button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>
                ` : ''}
                
                <button class="pagination-btn" ${this.currentPage === totalPages ? 'disabled' : ''} 
                        data-page="${this.currentPage + 1}">
                    Next →
                </button>
            </div>
        `;
    }

    bindEvents() {
        // Header actions
        const addBtn = this.$('.add-transaction-btn');
        if (addBtn) {
            this.addEventListener(addBtn, 'click', () => this.handleAddTransaction());
        }

        const refreshBtn = this.$('.refresh-transactions-btn');
        if (refreshBtn) {
            this.addEventListener(refreshBtn, 'click', () => this.refresh());
        }

        const exportBtn = this.$('.export-transactions-btn');
        if (exportBtn) {
            this.addEventListener(exportBtn, 'click', () => this.exportTransactions());
        }

        // Search and filters
        this.bindFilters();

        // Transaction actions
        this.bindTransactionActions();

        // Pagination
        this.bindPagination();
    }

    bindFilters() {
        // Search
        const searchInput = this.$('.transactions-search');
        if (searchInput) {
            this.addEventListener(searchInput, 'input', (e) => this.handleSearch(e.target.value));
        }

        const searchClear = this.$('.search-clear');
        if (searchClear) {
            this.addEventListener(searchClear, 'click', () => this.clearSearch());
        }

        // Filter controls
        const typeFilter = this.$('.type-filter');
        if (typeFilter) {
            this.addEventListener(typeFilter, 'change', (e) => this.setTypeFilter(e.target.value));
        }

        const statusFilter = this.$('.status-filter');
        if (statusFilter) {
            this.addEventListener(statusFilter, 'change', (e) => this.setStatusFilter(e.target.value));
        }

        const sortFilter = this.$('.sort-filter');
        if (sortFilter) {
            this.addEventListener(sortFilter, 'change', (e) => this.setSortFilter(e.target.value));
        }

        // Date filters
        const dateFrom = this.$('.date-from');
        const dateTo = this.$('.date-to');
        if (dateFrom && dateTo) {
            this.addEventListener(dateFrom, 'change', () => this.updateDateFilter());
            this.addEventListener(dateTo, 'change', () => this.updateDateFilter());
        }

        const clearDates = this.$('.clear-dates');
        if (clearDates) {
            this.addEventListener(clearDates, 'click', () => this.clearDateFilter());
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

        // Print receipt buttons
        this.$$('.print-receipt-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const transactionId = e.target.getAttribute('data-transaction-id');
                this.handlePrintReceipt(transactionId);
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
                const transactionId = e.target.getAttribute('data-transaction-id');
                this.handleDropdownAction(action, transactionId);
            });
        });

        // Click outside to close dropdowns
        this.addEventListener(document, 'click', (e) => {
            if (!e.target.closest('.more-actions')) {
                this.$$('.actions-dropdown').forEach(dropdown => {
                    dropdown.style.display = 'none';
                });
            }
        });

        // Add first transaction button
        const addFirstBtn = this.$('.add-first-transaction');
        if (addFirstBtn) {
            this.addEventListener(addFirstBtn, 'click', () => this.handleAddTransaction());
        }
    }

    bindPagination() {
        this.$$('.pagination-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const page = parseInt(e.target.getAttribute('data-page'));
                if (page && page !== this.currentPage) {
                    this.goToPage(page);
                }
            });
        });
    }

    // Filter and search methods
    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.currentPage = 1;
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

    setTypeFilter(type) {
        this.filterType = type;
        this.currentPage = 1;
        this.applyFilters();
    }

    setStatusFilter(status) {
        this.filterStatus = status;
        this.currentPage = 1;
        this.applyFilters();
    }

    setSortFilter(sort) {
        this.sortBy = sort;
        this.applyFilters();
    }

    updateDateFilter() {
        const dateFrom = this.$('.date-from').value;
        const dateTo = this.$('.date-to').value;

        this.dateRange.from = dateFrom ? new Date(dateFrom) : null;
        this.dateRange.to = dateTo ? new Date(dateTo) : null;

        this.currentPage = 1;
        this.applyFilters();
    }

    clearDateFilter() {
        this.dateRange = { from: null, to: null };
        this.$('.date-from').value = '';
        this.$('.date-to').value = '';
        this.applyFilters();
    }

    applyFilters() {
        let filtered = [...this.transactions];

        // Apply search filter
        if (this.searchTerm.trim()) {
            filtered = filtered.filter(transaction => {
                const searchFields = [
                    transaction.customer_name || '',
                    transaction.service_name || '',
                    transaction.classification || '',
                    transaction.notes || '',
                    (transaction.amount_paid || transaction.amount || 0).toString(),
                    transaction.id || ''
                ].map(field => field.toLowerCase());

                return searchFields.some(field => field.includes(this.searchTerm));
            });
        }

        // Apply type filter
        if (this.filterType && this.filterType !== 'all') {
            filtered = filtered.filter(transaction => {
                const type = this.getTransactionType(transaction);
                return type === this.filterType;
            });
        }

        // Apply status filter
        if (this.filterStatus && this.filterStatus !== 'all') {
            filtered = filtered.filter(transaction =>
                (transaction.status || '').toLowerCase() === this.filterStatus
            );
        }

        // Apply date filter
        if (this.dateRange.from || this.dateRange.to) {
            filtered = filtered.filter(transaction => {
                const transactionDate = new Date(transaction.start_date || transaction.transaction_date);

                if (this.dateRange.from && transactionDate < this.dateRange.from) return false;
                if (this.dateRange.to && transactionDate > this.dateRange.to) return false;

                return true;
            });
        }

        // Apply sorting
        if (this.sortBy) {
            filtered.sort((a, b) => {
                switch (this.sortBy) {
                    case 'date_desc':
                        return new Date(b.start_date || b.transaction_date) - new Date(a.start_date || a.transaction_date);
                    case 'date_asc':
                        return new Date(a.start_date || a.transaction_date) - new Date(b.start_date || b.transaction_date);
                    case 'amount_desc':
                        return (b.amount_paid || b.amount || 0) - (a.amount_paid || a.amount || 0);
                    case 'amount_asc':
                        return (a.amount_paid || a.amount || 0) - (b.amount_paid || b.amount || 0);
                    case 'customer':
                        return (a.customer_name || '').localeCompare(b.customer_name || '');
                    default:
                        return new Date(b.start_date || b.transaction_date) - new Date(a.start_date || a.transaction_date);
                }
            });
        }

        this.filteredTransactions = filtered;
        this.updateDisplay();
    }

    async updateDisplay() {
        const container = this.$('.transactions-list-container');
        const summary = this.$('.transactions-summary');
        const pagination = this.$('.pagination');

        if (container) {
            container.innerHTML = this.getTransactionsListTemplate();
            this.bindTransactionActions();
        }

        if (summary) {
            summary.innerHTML = this.getTransactionsSummaryTemplate();
        }

        if (pagination) {
            pagination.outerHTML = this.getPaginationTemplate();
            this.bindPagination();
        }
    }

    // Utility methods
    calculateTransactionsSummary() {
        const customerTransactions = this.filteredTransactions.filter(t =>
            this.getTransactionType(t) === 'subscription'
        );

        const totalRevenue = customerTransactions.reduce((sum, t) =>
            sum + (t.amount_paid || 0), 0
        );

        const avgTransaction = customerTransactions.length > 0 ?
            totalRevenue / customerTransactions.length : 0;

        const activeCustomers = new Set(
            customerTransactions
                .filter(t => t.status === 'active')
                .map(t => t.customer_id)
        ).size;

        return {
            totalCount: this.filteredTransactions.length,
            totalRevenue,
            avgTransaction,
            activeCustomers
        };
    }

    getTransactionType(transaction) {
        if (transaction.customer_id && transaction.service_name) return 'subscription';
        if (transaction.vendor_id && transaction.credits) return 'purchase';
        return 'business';
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

    formatTime(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    goToPage(page) {
        this.currentPage = page;
        this.updateDisplay();

        // Scroll to top of list
        const container = this.$('.transactions-list-container');
        if (container) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Action handlers
    handleAddTransaction() {
        this.emit('addTransactionRequested');
        console.log('Add transaction requested');
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
        return `
            <div class="transaction-details-modal">
                <div class="detail-section">
                    <h5>Transaction Information</h5>
                    <div class="detail-row"><strong>ID:</strong> ${transaction.id}</div>
                    <div class="detail-row"><strong>Type:</strong> ${this.getTransactionType(transaction)}</div>
                    <div class="detail-row"><strong>Date:</strong> ${this.formatDate(transaction.start_date || transaction.transaction_date)}</div>
                    <div class="detail-row"><strong>Amount:</strong> ${this.formatCurrency(transaction.amount_paid || transaction.amount || 0)}</div>
                    <div class="detail-row"><strong>Status:</strong> ${transaction.status || 'Unknown'}</div>
                </div>
                
                ${transaction.customer_name ? `
                    <div class="detail-section">
                        <h5>Customer Information</h5>
                        <div class="detail-row"><strong>Name:</strong> ${this.escapeHtml(transaction.customer_name)}</div>
                        <div class="detail-row"><strong>Customer ID:</strong> ${transaction.customer_id}</div>
                    </div>
                ` : ''}
                
                ${transaction.service_name ? `
                    <div class="detail-section">
                        <h5>Service Information</h5>
                        <div class="detail-row"><strong>Service:</strong> ${this.escapeHtml(transaction.service_name)}</div>
                        ${transaction.classification ? `<div class="detail-row"><strong>Location:</strong> ${this.escapeHtml(transaction.classification)}</div>` : ''}
                        ${transaction.credits_used ? `<div class="detail-row"><strong>Credits:</strong> ${transaction.credits_used}</div>` : ''}
                        ${transaction.expiration_date ? `<div class="detail-row"><strong>Expires:</strong> ${this.formatDate(transaction.expiration_date)}</div>` : ''}
                    </div>
                ` : ''}
                
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

    handlePrintReceipt(transactionId) {
        const transaction = this.transactions.find(t => t.id.toString() === transactionId.toString());
        if (transaction) {
            this.emit('printReceiptRequested', { transaction });
            console.log('Print receipt requested for transaction:', transactionId);
        }
    }

    handleDropdownAction(action, transactionId) {
        switch (action) {
            case 'duplicate':
                this.handleDuplicateTransaction(transactionId);
                break;
            case 'extend':
                this.handleExtendTransaction(transactionId);
                break;
            case 'cancel':
                this.handleCancelTransaction(transactionId);
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

    handleDuplicateTransaction(transactionId) {
        const transaction = this.transactions.find(t => t.id.toString() === transactionId.toString());
        if (transaction) {
            this.emit('duplicateTransactionRequested', { transaction });
            console.log('Duplicate transaction requested:', transactionId);
        }
    }

    handleExtendTransaction(transactionId) {
        this.emit('extendTransactionRequested', { transactionId });
        console.log('Extend transaction requested:', transactionId);
    }

    async handleCancelTransaction(transactionId) {
        const transaction = this.transactions.find(t => t.id.toString() === transactionId.toString());
        if (!transaction) return;

        const modal = WidgetManager.getWidget('confirmation-modal');
        if (modal) {
            modal.show({
                title: 'Cancel Transaction',
                message: `Are you sure you want to cancel this transaction?`,
                icon: '🚫',
                confirmText: 'Cancel Transaction',
                confirmClass: 'btn-warning',
                onConfirm: async () => {
                    try {
                        const response = await fetch(`/api/transactions/${transactionId}/cancel`, {
                            method: 'PUT'
                        });

                        if (!response.ok) {
                            const result = await response.json();
                            throw new Error(result.error || 'Failed to cancel transaction');
                        }

                        // Update local data
                        transaction.status = 'cancelled';
                        this.applyFilters();

                        this.showSuccessMessage('Transaction cancelled successfully');
                    } catch (error) {
                        this.showErrorMessage(error.message);
                    }
                }
            });
        }
    }

    async handleDeleteTransaction(transactionId) {
        const transaction = this.transactions.find(t => t.id.toString() === transactionId.toString());
        if (!transaction) return;

        const modal = WidgetManager.getWidget('confirmation-modal');
        if (modal) {
            modal.confirmDelete(`this transaction`, async () => {
                try {
                    const response = await fetch(`/api/transactions/${transactionId}`, {
                        method: 'DELETE'
                    });

                    if (!response.ok) {
                        const result = await response.json();
                        throw new Error(result.error || 'Failed to delete transaction');
                    }

                    // Remove from local data
                    this.transactions = this.transactions.filter(t => t.id.toString() !== transactionId.toString());
                    this.applyFilters();

                    this.showSuccessMessage('Transaction deleted successfully');
                } catch (error) {
                    this.showErrorMessage(error.message);
                }
            });
        }
    }

    exportTransactions() {
        const csvData = this.generateTransactionsCSV();
        const filename = `transactions-${Date.now()}.csv`;
        this.downloadFile(csvData, filename, 'text/csv');
    }

    generateTransactionsCSV() {
        const headers = [
            'Date', 'Customer', 'Service', 'Classification', 'Amount',
            'Credits', 'Status', 'Expiration', 'Notes', 'ID'
        ];

        const rows = this.filteredTransactions.map(transaction => [
            transaction.start_date || transaction.transaction_date,
            transaction.customer_name || '',
            transaction.service_name || '',
            transaction.classification || '',
            transaction.amount_paid || transaction.amount || 0,
            transaction.credits_used || '',
            transaction.status || '',
            transaction.expiration_date || '',
            transaction.notes || '',
            transaction.id
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

    filterByType(type) {
        this.setTypeFilter(type);
    }

    filterByStatus(status) {
        this.setStatusFilter(status);
    }

    setDateRange(from, to) {
        this.dateRange.from = from ? new Date(from) : null;
        this.dateRange.to = to ? new Date(to) : null;

        if (this.$('.date-from')) this.$('.date-from').value = from || '';
        if (this.$('.date-to')) this.$('.date-to').value = to || '';

        this.applyFilters();
    }

    getFilteredTransactions() {
        return [...this.filteredTransactions];
    }

    getTransactionById(transactionId) {
        return this.transactions.find(t => t.id.toString() === transactionId.toString());
    }
}

window.TransactionListWidget = TransactionListWidget;
