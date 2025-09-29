class BusinessTransactionHistoryWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.transactions = [];
        this.filteredTransactions = [];
        this.filterType = 'all';
        this.searchTerm = '';
        this.dateRange = { from: null, to: null };
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showSearch: true,
            showFilters: true,
            showDateFilter: true,
            showExport: true,
            itemsPerPage: 20,
            showPagination: false
        };
    }

    async loadData() {
        try {
            this.log('Loading business transaction history...');
            const response = await fetch('/api/business/transactions');
            if (!response.ok) throw new Error('Failed to fetch business transactions');

            const data = await response.json();
            this.transactions = data.transactions || [];
            this.filteredTransactions = [...this.transactions];

            this.log(`Loaded ${this.transactions.length} business transactions`);
        } catch (error) {
            this.handleError('Failed to load business transaction history', error);
        }
    }

    async getTemplate() {
        return `
            <div class="business-transaction-history">
                <h3>📊 Business Transactions History</h3>
                
                ${this.getFiltersTemplate()}
                
                <div class="transaction-summary">
                    ${this.getSummaryTemplate()}
                </div>
                
                <div class="transactions-list-container">
                    ${this.getTransactionsListTemplate()}
                </div>
            </div>
        `;
    }

    getFiltersTemplate() {
        return `
            <div class="filters-section">
                ${this.options.showSearch ? `
                    <div class="search-container">
                        <input type="text" class="transaction-search" 
                               placeholder="🔍 Search transactions by description..."
                               value="${this.searchTerm}">
                        <button class="btn-clear search-clear">✕</button>
                    </div>
                ` : ''}
                
                ${this.options.showFilters ? `
                    <div class="filter-controls">
                        <select class="type-filter">
                            <option value="all">All Transactions</option>
                            <option value="add">Money Added</option>
                            <option value="withdraw">Money Withdrawn</option>
                        </select>
                        
                        <select class="sort-filter">
                            <option value="date_desc">Newest First</option>
                            <option value="date_asc">Oldest First</option>
                            <option value="amount_desc">Highest Amount</option>
                            <option value="amount_asc">Lowest Amount</option>
                        </select>
                    </div>
                ` : ''}
                
                ${this.options.showDateFilter ? `
                    <div class="date-filters">
                        <input type="date" class="date-from" placeholder="From">
                        <input type="date" class="date-to" placeholder="To">
                        <button class="btn-secondary clear-dates">Clear Dates</button>
                    </div>
                ` : ''}
                
                ${this.options.showExport ? `
                    <div class="export-controls">
                        <button class="btn-info export-csv">📊 Export CSV</button>
                        <button class="btn-secondary export-pdf">📄 Export PDF</button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getSummaryTemplate() {
        const summary = this.calculateSummary();

        return `
            <div class="summary-cards">
                <div class="summary-card total">
                    <div class="summary-icon">📊</div>
                    <div class="summary-content">
                        <div class="summary-number">${summary.totalTransactions}</div>
                        <div class="summary-label">Total Transactions</div>
                    </div>
                </div>
                
                <div class="summary-card positive">
                    <div class="summary-icon">💰</div>
                    <div class="summary-content">
                        <div class="summary-number">${this.formatCurrency(summary.totalAdded)}</div>
                        <div class="summary-label">Money Added</div>
                        <div class="summary-count">${summary.addTransactions} transactions</div>
                    </div>
                </div>
                
                <div class="summary-card negative">
                    <div class="summary-icon">💸</div>
                    <div class="summary-content">
                        <div class="summary-number">${this.formatCurrency(summary.totalWithdrawn)}</div>
                        <div class="summary-label">Money Withdrawn</div>
                        <div class="summary-count">${summary.withdrawTransactions} transactions</div>
                    </div>
                </div>
                
                <div class="summary-card balance">
                    <div class="summary-icon">${summary.netChange >= 0 ? '📈' : '📉'}</div>
                    <div class="summary-content">
                        <div class="summary-number ${summary.netChange >= 0 ? 'positive' : 'negative'}">
                            ${this.formatCurrency(Math.abs(summary.netChange))}
                        </div>
                        <div class="summary-label">Net Change</div>
                        <div class="summary-direction">${summary.netChange >= 0 ? 'Increase' : 'Decrease'}</div>
                    </div>
                </div>
            </div>
        `;
    }

    getTransactionsListTemplate() {
        if (this.filteredTransactions.length === 0) {
            return `
                <div class="no-transactions">
                    <div class="no-data-icon">📊</div>
                    <h4>No Transactions Found</h4>
                    <p>No business transactions match your current filters.</p>
                    <button class="btn-primary add-first-transaction">💰 Add Money</button>
                </div>
            `;
        }

        return `
            <div class="transactions-list">
                <div class="list-header">
                    <span class="result-count">${this.filteredTransactions.length} transactions found</span>
                </div>
                
                <div class="transactions-grid">
                    ${this.filteredTransactions.map(transaction => this.getTransactionItemTemplate(transaction)).join('')}
                </div>
            </div>
        `;
    }

    getTransactionItemTemplate(transaction) {
        const isAdd = transaction.type === 'add';
        const amountClass = isAdd ? 'positive' : 'negative';
        const icon = isAdd ? '💰' : '💸';
        const sign = isAdd ? '+' : '-';
        const typeLabel = isAdd ? 'Added' : 'Withdrawn';

        return `
            <div class="transaction-item ${amountClass}" data-transaction-id="${transaction.id}">
                <div class="transaction-header">
                    <div class="transaction-type">
                        <span class="transaction-icon">${icon}</span>
                        <span class="transaction-type-label">${typeLabel}</span>
                    </div>
                    <div class="transaction-amount ${amountClass}">
                        ${sign}${this.formatCurrency(Math.abs(transaction.amount))}
                    </div>
                </div>
                
                <div class="transaction-details">
                    <div class="transaction-description">
                        ${this.escapeHtml(transaction.description || (isAdd ? 'Money added to business' : 'Money withdrawn from business'))}
                    </div>
                    
                    <div class="transaction-metadata">
                        <div class="metadata-item">
                            <strong>Date:</strong> ${this.formatDate(transaction.transaction_date)}
                        </div>
                        <div class="metadata-item">
                            <strong>Time:</strong> ${this.formatTime(transaction.created_date)}
                        </div>
                        ${transaction.source ? `
                            <div class="metadata-item">
                                <strong>Source:</strong> ${this.escapeHtml(transaction.source)}
                            </div>
                        ` : ''}
                        ${transaction.purpose ? `
                            <div class="metadata-item">
                                <strong>Purpose:</strong> ${this.escapeHtml(transaction.purpose)}
                            </div>
                        ` : ''}
                        <div class="metadata-item">
                            <strong>ID:</strong> ${transaction.id}
                        </div>
                    </div>
                </div>
                
                <div class="transaction-actions">
                    <button class="btn-small btn-info view-details-btn" data-id="${transaction.id}">
                        👁️ Details
                    </button>
                    <button class="btn-small btn-secondary edit-transaction-btn" data-id="${transaction.id}">
                        ✏️ Edit
                    </button>
                    <button class="btn-small btn-danger delete-transaction-btn" data-id="${transaction.id}">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Search functionality
        const searchInput = this.$('.transaction-search');
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

        // Export controls
        const exportCSV = this.$('.export-csv');
        const exportPDF = this.$('.export-pdf');
        if (exportCSV) {
            this.addEventListener(exportCSV, 'click', () => this.exportToCSV());
        }
        if (exportPDF) {
            this.addEventListener(exportPDF, 'click', () => this.exportToPDF());
        }

        // Transaction actions
        this.bindTransactionActions();
    }

    bindTransactionActions() {
        // View details buttons
        this.$$('.view-details-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const transactionId = e.target.getAttribute('data-id');
                this.handleViewDetails(transactionId);
            });
        });

        // Edit buttons
        this.$$('.edit-transaction-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const transactionId = e.target.getAttribute('data-id');
                this.handleEditTransaction(transactionId);
            });
        });

        // Delete buttons
        this.$$('.delete-transaction-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const transactionId = e.target.getAttribute('data-id');
                this.handleDeleteTransaction(transactionId);
            });
        });

        // Add first transaction button
        const addFirstBtn = this.$('.add-first-transaction');
        if (addFirstBtn) {
            this.addEventListener(addFirstBtn, 'click', () => this.handleAddFirstTransaction());
        }
    }

    calculateSummary() {
        const addTransactions = this.filteredTransactions.filter(t => t.type === 'add');
        const withdrawTransactions = this.filteredTransactions.filter(t => t.type === 'withdraw');

        const totalAdded = addTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const totalWithdrawn = withdrawTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

        return {
            totalTransactions: this.filteredTransactions.length,
            addTransactions: addTransactions.length,
            withdrawTransactions: withdrawTransactions.length,
            totalAdded,
            totalWithdrawn,
            netChange: totalAdded - totalWithdrawn
        };
    }

    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.applyFilters();
    }

    clearSearch() {
        this.searchTerm = '';
        const searchInput = this.$('.transaction-search');
        if (searchInput) {
            searchInput.value = '';
        }
        this.applyFilters();
    }

    setTypeFilter(type) {
        this.filterType = type;
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
                    transaction.description || '',
                    transaction.source || '',
                    transaction.purpose || '',
                    transaction.id || ''
                ].map(field => field.toLowerCase());

                return searchFields.some(field => field.includes(this.searchTerm));
            });
        }

        // Apply type filter
        if (this.filterType !== 'all') {
            filtered = filtered.filter(transaction => transaction.type === this.filterType);
        }

        // Apply date filter
        if (this.dateRange.from || this.dateRange.to) {
            filtered = filtered.filter(transaction => {
                const transactionDate = new Date(transaction.transaction_date);

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
                        return new Date(b.transaction_date) - new Date(a.transaction_date);
                    case 'date_asc':
                        return new Date(a.transaction_date) - new Date(b.transaction_date);
                    case 'amount_desc':
                        return Math.abs(b.amount) - Math.abs(a.amount);
                    case 'amount_asc':
                        return Math.abs(a.amount) - Math.abs(b.amount);
                    default:
                        return new Date(b.transaction_date) - new Date(a.transaction_date);
                }
            });
        }

        this.filteredTransactions = filtered;
        this.updateDisplay();
    }

    async updateDisplay() {
        const container = this.$('.transactions-list-container');
        const summary = this.$('.transaction-summary');

        if (container) {
            container.innerHTML = this.getTransactionsListTemplate();
            this.bindTransactionActions();
        }

        if (summary) {
            summary.innerHTML = this.getSummaryTemplate();
        }
    }

    // Action handlers
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
        const isAdd = transaction.type === 'add';
        return `
            <div class="transaction-details-modal">
                <div class="detail-row">
                    <strong>Type:</strong> ${isAdd ? 'Money Added' : 'Money Withdrawn'}
                </div>
                <div class="detail-row">
                    <strong>Amount:</strong> ${this.formatCurrency(Math.abs(transaction.amount))}
                </div>
                <div class="detail-row">
                    <strong>Date:</strong> ${this.formatDate(transaction.transaction_date)}
                </div>
                <div class="detail-row">
                    <strong>Description:</strong> ${this.escapeHtml(transaction.description || 'No description')}
                </div>
                ${transaction.source ? `
                    <div class="detail-row">
                        <strong>Source:</strong> ${this.escapeHtml(transaction.source)}
                    </div>
                ` : ''}
                ${transaction.purpose ? `
                    <div class="detail-row">
                        <strong>Purpose:</strong> ${this.escapeHtml(transaction.purpose)}
                    </div>
                ` : ''}
                <div class="detail-row">
                    <strong>Transaction ID:</strong> ${transaction.id}
                </div>
                <div class="detail-row">
                    <strong>Created:</strong> ${this.formatDate(transaction.created_date)} at ${this.formatTime(transaction.created_date)}
                </div>
            </div>
        `;
    }

    handleEditTransaction(transactionId) {
        this.emit('editTransactionRequested', { transactionId });
        console.log('Edit transaction requested:', transactionId);
    }

    async handleDeleteTransaction(transactionId) {
        const transaction = this.transactions.find(t => t.id.toString() === transactionId.toString());
        if (!transaction) return;

        const modal = WidgetManager.getWidget('confirmation-modal');
        if (modal) {
            modal.confirmDelete(`this ${transaction.type === 'add' ? 'deposit' : 'withdrawal'} of ${this.formatCurrency(Math.abs(transaction.amount))}`, async () => {
                try {
                    const response = await fetch(`/api/business/transactions/${transactionId}`, {
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
                    this.emit('transactionDeleted', { transactionId });
                } catch (error) {
                    this.showErrorMessage(error.message);
                }
            });
        }
    }

    handleAddFirstTransaction() {
        this.emit('addMoneyRequested');
    }

    exportToCSV() {
        const headers = ['Date', 'Type', 'Amount', 'Description', 'Source', 'Purpose', 'ID'];
        const rows = this.filteredTransactions.map(transaction => [
            transaction.transaction_date,
            transaction.type === 'add' ? 'Added' : 'Withdrawn',
            transaction.amount,
            transaction.description || '',
            transaction.source || '',
            transaction.purpose || '',
            transaction.id
        ]);

        const csvData = [headers, ...rows].map(row =>
            row.map(field => `"${field}"`).join(',')
        ).join('\n');

        this.downloadFile(csvData, 'business-transactions.csv', 'text/csv');
    }

    exportToPDF() {
        // Generate PDF content
        const pdfContent = this.generatePDFContent();
        console.log('PDF export requested - content generated');
        // In a real implementation, you would use a PDF library like jsPDF
        this.showInfoMessage('PDF export feature will be implemented with a PDF library');
    }

    generatePDFContent() {
        const summary = this.calculateSummary();
        return {
            title: 'Business Transaction History',
            dateRange: this.getDateRangeText(),
            summary,
            transactions: this.filteredTransactions
        };
    }

    getDateRangeText() {
        if (this.dateRange.from && this.dateRange.to) {
            return `${this.formatDate(this.dateRange.from)} - ${this.formatDate(this.dateRange.to)}`;
        } else if (this.dateRange.from) {
            return `From ${this.formatDate(this.dateRange.from)}`;
        } else if (this.dateRange.to) {
            return `Until ${this.formatDate(this.dateRange.to)}`;
        }
        return 'All Time';
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

    formatTime(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showSuccessMessage(message) {
        console.log('Success:', message);
    }

    showErrorMessage(message) {
        console.error('Error:', message);
    }

    showInfoMessage(message) {
        console.log('Info:', message);
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

    setDateRange(from, to) {
        this.dateRange.from = from ? new Date(from) : null;
        this.dateRange.to = to ? new Date(to) : null;

        if (this.$('.date-from')) this.$('.date-from').value = from || '';
        if (this.$('.date-to')) this.$('.date-to').value = to || '';

        this.applyFilters();
    }
}

window.BusinessTransactionHistoryWidget = BusinessTransactionHistoryWidget;
