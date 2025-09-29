class DashboardStatsWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.stats = {};
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            autoRefresh: true,
            refreshInterval: 30000, // 30 seconds
            showAnimations: true
        };
    }

    async loadData() {
        try {
            this.log('Loading dashboard statistics...');

            // Use IPC instead of HTTP fetch
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                this.stats = await ipcRenderer.invoke('db-get-dashboard-stats');
            } else {
                // Fallback for browser testing
                this.stats = {
                    totalCustomers: 0,
                    activeSubscriptions: 0,
                    totalCreditsUsed: 0,
                    totalRevenue: 0,
                    totalVendorCosts: 0,
                    avgCostPerCredit: 0,
                    avgRevenuePerCredit: 0,
                    netProfitFromCreditSales: 0,
                    avgProfitPerCredit: 0,
                    finalNetProfit: 0,
                    totalCreditsRemaining: 0,
                    lowCreditAlerts: 0
                };
            }

            this.log('Dashboard stats loaded:', this.stats);
        } catch (error) {
            this.handleError('Failed to load dashboard statistics', error);
            // Set default stats to prevent blank dashboard
            this.stats = {
                totalCustomers: 0,
                activeSubscriptions: 0,
                totalCreditsUsed: 0,
                totalRevenue: 0,
                totalVendorCosts: 0,
                avgCostPerCredit: 0,
                avgRevenuePerCredit: 0,
                netProfitFromCreditSales: 0,
                avgProfitPerCredit: 0,
                finalNetProfit: 0,
                totalCreditsRemaining: 0,
                lowCreditAlerts: 0
            };
        }
    }

    async getTemplate() {
        if (!this.stats || Object.keys(this.stats).length === 0) {
            return '<div class="dashboard-loading">Loading statistics...</div>';
        }

        return `
            <div class="dashboard-section">
                <h2>📊 Dashboard & Analytics</h2>
                
                <div class="dashboard-stats">
                    ${this.getStatCard('totalCustomers', 'Total Customers', '👥')}
                    ${this.getStatCard('activeSubscriptions', 'Active Subscriptions', '📋')}
                    ${this.getStatCard('totalCreditsUsed', 'Credits Sold', '💳')}
                    ${this.getStatCard('netProfitFromCreditSales', 'Net Profit from Sales', '💰', true)}
                    ${this.getStatCard('avgProfitPerCredit', 'Profit per Credit', '💵', true)}
                    ${this.getStatCard('avgRevenuePerCredit', 'Revenue per Credit', '💲', true)}
                    ${this.getStatCard('avgCostPerCredit', 'Cost per Credit', '💸', true)}
                    ${this.getStatCard('totalRevenue', 'Total Revenue', '📈', true)}
                    ${this.getStatCard('totalVendorCosts', 'Vendor Costs', '📉', true)}
                    ${this.getStatCard('finalNetProfit', 'Final Net Profit', '🎯', true)}
                    ${this.getStatCard('totalCreditsRemaining', 'Credits Remaining', '🔋')}
                    ${this.getAlertCard('lowCreditAlerts', 'Low Credit Alerts', '⚠️')}
                </div>
                
                <div class="dashboard-footer">
                    <small>Last updated: ${new Date().toLocaleString()}</small>
                    <button class="btn-refresh" onclick="window.widgetManager?.getWidget('dashboard-stats')?.refresh()">🔄 Refresh</button>
                </div>
            </div>
        `;
    }

    getStatCard(key, label, icon, isCurrency = false) {
        const value = this.stats[key];
        const safeValue = (value !== undefined && value !== null) ? value : 0;
        const displayValue = isCurrency ? this.formatCurrency(safeValue) : this.formatNumber(safeValue);

        return `
            <div class="stat-card" data-stat="${key}">
                <div class="stat-icon">${icon}</div>
                <div class="stat-number" id="${key}">${displayValue}</div>
                <div class="stat-label">${label}</div>
            </div>
        `;
    }

    getAlertCard(key, label, icon) {
        const value = this.stats[key];
        const safeValue = (value !== undefined && value !== null) ? value : 0;
        const hasAlerts = safeValue > 0;

        return `
            <div class="stat-card ${hasAlerts ? 'alert' : ''}" data-stat="${key}">
                <div class="stat-icon">${icon}</div>
                <div class="stat-number" id="${key}">${safeValue}</div>
                <div class="stat-label">${label}</div>
                ${hasAlerts ? '<div class="alert-badge">!</div>' : ''}
            </div>
        `;
    }

    async onAfterRender() {
        if (this.options.autoRefresh) {
            this.startAutoRefresh();
        }

        if (this.options.showAnimations) {
            this.animateCounters();
        }

        this.addStatCardHandlers();
    }

    addStatCardHandlers() {
        const cards = this.$$('.stat-card');
        if (cards) {
            cards.forEach(card => {
                card.addEventListener('click', () => {
                    const stat = card.dataset.stat;
                    this.handleStatCardClick(stat);
                });
            });
        }
    }

    handleStatCardClick(stat) {
        switch (stat) {
            case 'totalCustomers':
                window.app?.showTab('customers');
                break;
            case 'activeSubscriptions':
                window.app?.showTab('transactions');
                break;
            case 'totalCreditsRemaining':
            case 'lowCreditAlerts':
                window.app?.showTab('credits');
                break;
            case 'totalVendorCosts':
                window.app?.showTab('vendors');
                break;
            default:
                this.log(`Clicked on ${stat} stat`);
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

    animateCounters() {
        const statCards = this.$$('.stat-card');
        if (statCards) {
            statCards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.animation = 'fadeInUp 0.5s ease-out';
                    card.classList.add('animated');
                }, index * 100);
            });
        }
    }

    formatCurrency(amount) {
        const safeAmount = parseFloat(amount) || 0;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(safeAmount);
    }

    formatNumber(number) {
        const safeNumber = parseFloat(number) || 0;
        return new Intl.NumberFormat('en-US').format(safeNumber);
    }

    destroy() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        super.destroy();
    }
}

window.DashboardStatsWidget = DashboardStatsWidget;
