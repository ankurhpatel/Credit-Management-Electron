class BusinessBalanceWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.balance = 0;
        this.transactions = [];
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            autoRefresh: true,
            refreshInterval: 60000, // 1 minute
            showRecentTransactions: true,
            showBalanceChart: false,
            animateNumbers: true
        };
    }

    async loadData() {
        try {
            this.log('Loading business balance...');
            const response = await fetch('/api/business/transactions');
            if (!response.ok) throw new Error('Failed to fetch business transactions');

            const data = await response.json();
            this.transactions = data.transactions || [];
            this.balance = data.balance || 0;

            this.log(`Business balance loaded: ${this.formatCurrency(this.balance)}`);
        } catch (error) {
            this.handleError('Failed to load business balance', error);
        }
    }

    async getTemplate() {
        return `
            <div class="business-balance-widget">
                <div class="balance-header">
                    <h4>💰 Business Balance</h4>
                    <button class="btn-small btn-secondary refresh-balance-btn">🔄 Refresh</button>
                </div>
                
                <div class="balance-display">
                    <div class="balance-amount ${this.getBalanceClass()}">
                        <span class="balance-value" data-value="${this.balance}">
                            ${this.formatCurrency(this.balance)}
                        </span>
                        <div class="balance-status">
                            ${this.getBalanceStatusIcon()} ${this.getBalanceStatus()}
                        </div>
                    </div>
                </div>
                
                <div class="balance-summary">
                    ${this.getBalanceSummaryTemplate()}
                </div>
                
                ${this.options.showRecentTransactions ? this.getRecentTransactionsTemplate() : ''}
                
                <div class="balance-actions">
                    <button class="btn-success add-money-btn">💰 Add Money</button>
                    <button class="btn-danger withdraw-money-btn">💸 Withdraw</button>
                    <button class="btn-info view-history-btn">📊 View History</button>
                </div>
            </div>
        `;
    }

    getBalanceSummaryTemplate() {
        const recentTransactions = this.transactions.slice(0, 10);
        const totalAdded = recentTransactions
            .filter(t => t.type === 'add')
            .reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalWithdrawn = recentTransactions
            .filter(t => t.type === 'withdraw')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        return `
            <div class="summary-cards">
                <div class="summary-card positive">
                    <div class="summary-icon">📈</div>
                    <div class="summary-content">
                        <div class="summary-amount">${this.formatCurrency(totalAdded)}</div>
                        <div class="summary-label">Recent Deposits</div>
                    </div>
                </div>
                <div class="summary-card negative">
                    <div class="summary-icon">📉</div>
                    <div class="summary-content">
                        <div class="summary-amount">${this.formatCurrency(totalWithdrawn)}</div>
                        <div class="summary-label">Recent Withdrawals</div>
                    </div>
                </div>
                <div class="summary-card neutral">
                    <div class="summary-icon">📊</div>
                    <div class="summary-content">
                        <div class="summary-amount">${this.transactions.length}</div>
                        <div class="summary-label">Total Transactions</div>
                    </div>
                </div>
            </div>
        `;
    }

    getRecentTransactionsTemplate() {
        const recentTransactions = this.transactions.slice(0, 5);

        return `
            <div class="recent-transactions">
                <h5>Recent Transactions</h5>
                <div class="transactions-list">
                    ${recentTransactions.length > 0 ?
                recentTransactions.map(transaction => this.getTransactionItemTemplate(transaction)).join('') :
                '<div class="no-transactions">No recent transactions</div>'
            }
                </div>
            </div>
        `;
    }

    getTransactionItemTemplate(transaction) {
        const isAdd = transaction.type === 'add';
        const amountClass = isAdd ? 'positive' : 'negative';
        const icon = isAdd ? '💰' : '💸';
        const sign = isAdd ? '+' : '-';

        return `
            <div class="transaction-item ${amountClass}">
                <div class="transaction-icon">${icon}</div>
                <div class="transaction-details">
                    <div class="transaction-amount ${amountClass}">
                        ${sign}${this.formatCurrency(Math.abs(transaction.amount))}
                    </div>
                    <div class="transaction-description">
                        ${this.escapeHtml(transaction.description || (isAdd ? 'Money Added' : 'Money Withdrawn'))}
                    </div>
                    <div class="transaction-date">
                        ${this.formatDate(transaction.transaction_date)}
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Refresh button
        const refreshBtn = this.$('.refresh-balance-btn');
        if (refreshBtn) {
            this.addEventListener(refreshBtn, 'click', () => this.refresh());
        }

        // Action buttons
        const addMoneyBtn = this.$('.add-money-btn');
        if (addMoneyBtn) {
            this.addEventListener(addMoneyBtn, 'click', () => this.handleAddMoney());
        }

        const withdrawBtn = this.$('.withdraw-money-btn');
        if (withdrawBtn) {
            this.addEventListener(withdrawBtn, 'click', () => this.handleWithdrawMoney());
        }

        const historyBtn = this.$('.view-history-btn');
        if (historyBtn) {
            this.addEventListener(historyBtn, 'click', () => this.handleViewHistory());
        }
    }

    async onAfterRender() {
        if (this.options.animateNumbers) {
            this.animateBalance();
        }

        if (this.options.autoRefresh) {
            this.startAutoRefresh();
        }
    }

    animateBalance() {
        const balanceElement = this.$('.balance-value');
        if (!balanceElement) return;

        const targetValue = this.balance;
        const duration = 1500; // 1.5 seconds
        const startTime = Date.now();
        const startValue = 0;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = startValue + (targetValue - startValue) * easeOut;

            balanceElement.textContent = this.formatCurrency(currentValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(async () => {
            await this.refresh();
        }, this.options.refreshInterval);
    }

    getBalanceClass() {
        if (this.balance > 1000) return 'high-balance';
        if (this.balance > 0) return 'good-balance';
        if (this.balance === 0) return 'zero-balance';
        return 'negative-balance';
    }

    getBalanceStatus() {
        if (this.balance > 10000) return 'Excellent';
        if (this.balance > 5000) return 'Very Good';
        if (this.balance > 1000) return 'Good';
        if (this.balance > 0) return 'Fair';
        if (this.balance === 0) return 'Empty';
        return 'Overdrawn';
    }

    getBalanceStatusIcon() {
        if (this.balance > 5000) return '🟢';
        if (this.balance > 1000) return '🟡';
        if (this.balance > 0) return '🟠';
        return '🔴';
    }

    // Action handlers
    handleAddMoney() {
        this.emit('addMoneyRequested');
        console.log('Add money to business requested');
    }

    handleWithdrawMoney() {
        if (this.balance <= 0) {
            this.showErrorMessage('Cannot withdraw money - insufficient balance');
            return;
        }
        this.emit('withdrawMoneyRequested');
        console.log('Withdraw money from business requested');
    }

    handleViewHistory() {
        this.emit('viewHistoryRequested');
        console.log('View transaction history requested');
    }

    showErrorMessage(message) {
        console.error('Error:', message);
        // Integration with notification system would go here
    }

    destroy() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        super.destroy();
    }

    // Public API
    async refresh() {
        const oldBalance = this.balance;
        await this.loadData();
        await this.render();

        // Emit balance change event
        if (oldBalance !== this.balance) {
            this.emit('balanceChanged', {
                oldBalance,
                newBalance: this.balance,
                change: this.balance - oldBalance
            });
        }
    }

    getBalance() {
        return this.balance;
    }

    getTransactions() {
        return [...this.transactions];
    }

    updateBalance(newBalance) {
        const oldBalance = this.balance;
        this.balance = newBalance;
        this.render();

        this.emit('balanceChanged', {
            oldBalance,
            newBalance,
            change: newBalance - oldBalance
        });
    }
}

window.BusinessBalanceWidget = BusinessBalanceWidget;
