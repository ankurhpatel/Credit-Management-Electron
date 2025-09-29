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
            const response = await fetch('/api/dashboard/stats');
            if (!response.ok) throw new Error('Failed to fetch stats');

            this.stats = await response.json();
            this.log('Dashboard stats loaded:', this.stats);
        } catch (error) {
            this.handleError('Failed to load dashboard statistics', error);
        }
    }

    async getTemplate() {
        if (!this.stats || Object.keys(this.stats).length === 0) {
            return '<div class="dashboard-loading">Loading statistics...</div>';
        }

        return `
            <div class="dashboard-section">
                <h2>?? Dashboard & Analytics</h2>
                
                <div class="dashboard-stats">
                    ${this.getStatCard('totalCustomers', 'Total Customers', '??')}
                    ${this.getStatCard('totalCreditsUsed', 'Credits Sold', '??')}
                    ${this.getStatCard('netProfitFromCreditSales', 'Net Profit from Sales', '??', true)}
                    ${this.getStatCard('avgProfitPerCredit', 'Profit per Credit', '??', true)}
                    ${this.getStatCard('avgRevenuePerCredit', 'Revenue per Credit', '??', true)}
                    ${this.getStatCard('avgCostPerCredit', 'Cost per Credit', '??', true)}
                    ${this.getStatCard('totalRevenue', 'Total Revenue', '??', true)}
                    ${this.getStatCard('totalVendorCosts', 'Vendor Costs', '??', true)}
                    ${this.getStatCard('finalNetProfit', 'Final Net Profit', '??', true)}
                    ${this.getStatCard('totalCreditsRemaining', 'Credits Remaining', '??')}
                    ${this.getAlertCard('lowCreditAlerts', 'Low Credit Alerts', '??')}
                </div>
            </div>
        `;
    }

    getStatCard(key, label, icon, isCurrency = false) {
        const value = this.stats[key] || 0;
        const displayValue = isCurrency ? this.formatCurrency(value) : this.formatNumber(value);

        return `
            <div class="stat-card" data-stat="${key}">
                <div class="stat-icon">${icon}</div>
                <div class="stat-number" id="${key}">${displayValue}</div>
                <div class="stat-label">${label}</div>
            </div>
        `;
    }

    getAlertCard(key, label, icon) {
        const value = this.stats[key] || 0;
        const hasAlerts = value > 0;

        return `
            <div class="stat-card ${hasAlerts ? 'alert' : ''}" data-stat="${key}">
                <div class="stat-icon">${icon}</div>
                <div class="stat-number" id="${key}">${value}</div>
                <div class="stat-label">${label}</div>
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
        statCards.forEach((card, index) => {
            setTimeout(() => {
                card.style.animation = 'fadeInUp 0.5s ease-out';
            }, index * 100);
        });
    }

    destroy() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        super.destroy();
    }
}

window.DashboardStatsWidget = DashboardStatsWidget;
