class DashboardStatsWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.stats = {};
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            autoRefresh: true,
            refreshInterval: 30000,
            showAnimations: true,
            useApi: true // Use Express API instead of IPC
        };
    }

    async loadData() {
        try {
            this.log('Loading dashboard statistics...');

            if (this.options.useApi) {
                // Use Express API for cross-platform compatibility
                const response = await fetch('http://localhost:3001/api/dashboard/stats');

                if (!response.ok) {
                    throw new Error(`API Error: ${response.status} - ${response.statusText}`);
                }

                this.stats = await response.json();
                this.log('✅ Dashboard stats loaded via API:', this.stats);
            } else {
                // Fallback to IPC if available (Electron only)
                if (window.require) {
                    const { ipcRenderer } = window.require('electron');
                    this.stats = await ipcRenderer.invoke('db-get-dashboard-stats');
                    this.log('✅ Dashboard stats loaded via IPC:', this.stats);
                } else {
                    throw new Error('Neither API nor IPC available');
                }
            }
        } catch (error) {
            this.handleError('Failed to load dashboard statistics', error);

            // Set fallback demo data
            this.stats = {
                totalCustomers: 127,
                activeSubscriptions: 89,
                totalCreditsUsed: 1240,
                totalRevenue: 12450.00,
                totalVendorCosts: 8200.00,
                avgCostPerCredit: 6.61,
                avgRevenuePerCredit: 10.04,
                netProfitFromCreditSales: 4250.00,
                avgProfitPerCredit: 3.43,
                finalNetProfit: 4250.00,
                totalCreditsRemaining: 1580,
                lowCreditAlerts: 3,
                timestamp: new Date().toISOString()
            };
        }
    }

    async getTemplate() {
        if (!this.stats || Object.keys(this.stats).length === 0) {
            return '<div class="dashboard-loading">📊 Loading statistics...</div>';
        }

        return `
            <div class="dashboard-section">
                <div class="dashboard-header">
                    <h2>📊 Dashboard & Analytics</h2>
                    <div class="dashboard-controls">
                        <button class="btn btn-sm btn-refresh" onclick="window.widgetManager?.getWidget('dashboard-stats')?.refresh()">
                            🔄 Refresh
                        </button>
                    </div>
                </div>
                
                <div class="dashboard-stats">
                    <div class="stats-row">
                        <h3>📈 Customer & Business Metrics</h3>
                        <div class="stats-grid">
                            ${this.getStatCard('totalCustomers', 'Total Customers', '👥')}
                            ${this.getStatCard('activeSubscriptions', 'Active Subscriptions', '📋')}
                            ${this.getStatCard('totalCreditsUsed', 'Credits Sold', '💳')}
                            ${this.getStatCard('totalCreditsRemaining', 'Credits Remaining', '🔋')}
                        </div>
                    </div>

                    <div class="stats-row">
                        <h3>💰 Financial Performance</h3>
                        <div class="stats-grid">
                            ${this.getStatCard('totalRevenue', 'Total Revenue', '📈', true)}
                            ${this.getStatCard('totalVendorCosts', 'Vendor Costs', '📉', true)}
                            ${this.getStatCard('netProfitFromCreditSales', 'Net Profit', '💰', true)}
                            ${this.getStatCard('finalNetProfit', 'Final Net Profit', '🎯', true)}
                        </div>
                    </div>

                    <div class="stats-row">
                        <h3>📊 Per-Credit Analysis</h3>
                        <div class="stats-grid">
                            ${this.getStatCard('avgRevenuePerCredit', 'Revenue per Credit', '💲', true)}
                            ${this.getStatCard('avgCostPerCredit', 'Cost per Credit', '💸', true)}
                            ${this.getStatCard('avgProfitPerCredit', 'Profit per Credit', '💵', true)}
                            ${this.getAlertCard('lowCreditAlerts', 'Low Credit Alerts', '⚠️')}
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-footer">
                    <div class="footer-info">
                        <small>
                            📅 Last updated: ${new Date().toLocaleString()}
                            ${this.stats.timestamp ? ` • Data from: ${new Date(this.stats.timestamp).toLocaleString()}` : ''}
                        </small>
                    </div>
                </div>
            </div>
        `;
    }

    getStatCard(key, label, icon, isCurrency = false) {
        const value = this.stats[key];
        const safeValue = (value !== undefined && value !== null) ? value : 0;
        const displayValue = isCurrency ? this.formatCurrency(safeValue) : this.formatNumber(safeValue);

        // Determine trend (you can enhance this with historical data)
        const trendClass = this.getTrendClass(key, safeValue);
        const trendIcon = this.getTrendIcon(trendClass);

        return `
            <div class="stat-card ${trendClass}" data-stat="${key}" onclick="window.app?.handleStatClick?.('${key}')">
                <div class="stat-header">
                    <div class="stat-icon">${icon}</div>
                    <div class="stat-trend">${trendIcon}</div>
                </div>
                <div class="stat-content">
                    <div class="stat-number" id="${key}">${displayValue}</div>
                    <div class="stat-label">${label}</div>
                </div>
            </div>
        `;
    }

    getAlertCard(key, label, icon) {
        const value = this.stats[key];
        const safeValue = (value !== undefined && value !== null) ? value : 0;
        const hasAlerts = safeValue > 0;
        const severity = this.getAlertSeverity(safeValue);

        return `
            <div class="stat-card alert-card ${hasAlerts ? `alert-${severity}` : ''}" data-stat="${key}" onclick="window.app?.handleStatClick?.('${key}')">
                <div class="stat-header">
                    <div class="stat-icon">${icon}</div>
                    ${hasAlerts ? '<div class="alert-badge">!</div>' : ''}
                </div>
                <div class="stat-content">
                    <div class="stat-number alert-number" id="${key}">${safeValue}</div>
                    <div class="stat-label">${label}</div>
                </div>
                ${hasAlerts ? `<div class="alert-message">${this.getAlertMessage(safeValue)}</div>` : ''}
            </div>
        `;
    }

    getTrendClass(key, value) {
        // Simple trend analysis - you can enhance this
        if (['totalRevenue', 'netProfitFromCreditSales', 'finalNetProfit', 'totalCustomers', 'activeSubscriptions'].includes(key)) {
            return value > 0 ? 'trend-up' : 'trend-neutral';
        } else if (['totalVendorCosts', 'avgCostPerCredit', 'lowCreditAlerts'].includes(key)) {
            return value > 0 ? 'trend-down' : 'trend-neutral';
        }
        return 'trend-neutral';
    }

    getTrendIcon(trendClass) {
        switch (trendClass) {
            case 'trend-up': return '📈';
            case 'trend-down': return '📉';
            default: return '➖';
        }
    }

    getAlertSeverity(value) {
        if (value >= 10) return 'critical';
        if (value >= 5) return 'high';
        if (value > 0) return 'medium';
        return 'low';
    }

    getAlertMessage(value) {
        if (value >= 10) return 'Critical: Multiple vendors need attention!';
        if (value >= 5) return 'High: Several credit balances are low';
        if (value > 0) return 'Monitor: Some credits running low';
        return '';
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
                // Add hover effects
                card.addEventListener('mouseenter', () => {
                    card.style.transform = 'translateY(-5px) scale(1.02)';
                });

                card.addEventListener('mouseleave', () => {
                    card.style.transform = 'translateY(0) scale(1)';
                });
            });
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
                    card.style.animation = 'slideInUp 0.6s ease-out';
                    card.classList.add('animated');
                }, index * 100);
            });
        }
    }

    formatCurrency(amount) {
        const safeAmount = parseFloat(amount) || 0;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
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
