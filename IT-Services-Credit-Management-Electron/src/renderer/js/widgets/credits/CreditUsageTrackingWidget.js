class CreditUsageTrackingWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.usageData = null;
        this.selectedPeriod = 'month';
        this.selectedVendor = 'all';
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showPeriodFilter: true,
            showVendorFilter: true,
            showChart: false,
            showExport: true,
            defaultPeriod: 'month'
        };
    }

    async getTemplate() {
        return `
            <div class="credit-usage-widget">
                <div class="usage-header">
                    <h3>📊 Credit Usage Tracking</h3>
                    <div class="header-actions">
                        <button class="btn-secondary refresh-usage-btn">🔄 Refresh</button>
                        ${this.options.showExport ? `
                            <button class="btn-info export-usage-btn">📊 Export</button>
                        ` : ''}
                    </div>
                </div>
                
                <div class="usage-filters">
                    ${this.options.showPeriodFilter ? this.getPeriodFilterTemplate() : ''}
                    ${this.options.showVendorFilter ? this.getVendorFilterTemplate() : ''}
                </div>
                
                <div class="usage-summary">
                    <div class="summary-content"></div>
                </div>
                
                <div class="usage-breakdown">
                    <div class="breakdown-content"></div>
                </div>
                
                <div class="usage-trends">
                    <h4>📈 Usage Trends</h4>
                    <div class="trends-content"></div>
                </div>
            </div>
        `;
    }

    getPeriodFilterTemplate() {
        return `
            <div class="filter-group">
                <label>📅 Time Period:</label>
                <select class="period-select">
                    <option value="week">This Week</option>
                    <option value="month" selected>This Month</option>
                    <option value="quarter">This Quarter</option>
                    <option value="year">This Year</option>
                    <option value="custom">Custom Range</option>
                </select>
                
                <div class="custom-date-range" style="display: none;">
                    <input type="date" class="date-from" placeholder="From">
                    <input type="date" class="date-to" placeholder="To">
                </div>
            </div>
        `;
    }

    getVendorFilterTemplate() {
        return `
            <div class="filter-group">
                <label>🏭 Vendor:</label>
                <select class="vendor-select">
                    <option value="all">All Vendors</option>
                    <!-- Options will be populated dynamically -->
                </select>
            </div>
        `;
    }

    bindEvents() {
        // Period filter
        const periodSelect = this.$('.period-select');
        if (periodSelect) {
            this.addEventListener(periodSelect, 'change', (e) => this.changePeriod(e.target.value));
        }

        // Vendor filter
        const vendorSelect = this.$('.vendor-select');
        if (vendorSelect) {
            this.addEventListener(vendorSelect, 'change', (e) => this.changeVendor(e.target.value));
        }

        // Custom date range
        const dateFrom = this.$('.date-from');
        const dateTo = this.$('.date-to');
        if (dateFrom && dateTo) {
            this.addEventListener(dateFrom, 'change', () => this.updateCustomRange());
            this.addEventListener(dateTo, 'change', () => this.updateCustomRange());
        }

        // Refresh button
        const refreshBtn = this.$('.refresh-usage-btn');
        if (refreshBtn) {
            this.addEventListener(refreshBtn, 'click', () => this.refresh());
        }

        // Export button
        const exportBtn = this.$('.export-usage-btn');
        if (exportBtn) {
            this.addEventListener(exportBtn, 'click', () => this.exportUsage());
        }
    }

    async onAfterRender() {
        await this.loadUsageData();
        await this.populateVendorFilter();
    }

    async loadUsageData() {
        try {
            this.log(`Loading usage data for period: ${this.selectedPeriod}, vendor: ${this.selectedVendor}`);

            const params = new URLSearchParams({
                period: this.selectedPeriod,
                vendor: this.selectedVendor
            });

            const response = await fetch(`/api/credits/usage?${params}`);
            if (!response.ok) throw new Error('Failed to fetch usage data');

            this.usageData = await response.json();
            this.displayUsageData();

        } catch (error) {
            this.handleError('Failed to load credit usage data', error);
        }
    }

    async populateVendorFilter() {
        try {
            const response = await fetch('/api/vendors');
            if (response.ok) {
                const vendors = await response.json();
                const vendorSelect = this.$('.vendor-select');

                if (vendorSelect) {
                    // Keep the "All Vendors" option and add vendor options
                    const vendorOptions = vendors.map(vendor =>
                        `<option value="${vendor.vendor_id}">${this.escapeHtml(vendor.name)}</option>`
                    ).join('');

                    vendorSelect.innerHTML = `
                        <option value="all">All Vendors</option>
                        ${vendorOptions}
                    `;
                }
            }
        } catch (error) {
            console.error('Failed to load vendors for filter:', error);
        }
    }

    displayUsageData() {
        this.displayUsageSummary();
        this.displayUsageBreakdown();
        this.displayUsageTrends();
    }

    displayUsageSummary() {
        const summaryEl = this.$('.summary-content');
        if (!summaryEl || !this.usageData) return;

        const data = this.usageData.summary || {};

        summaryEl.innerHTML = `
            <div class="usage-summary-cards">
                <div class="summary-card total-used">
                    <div class="card-icon">📊</div>
                    <div class="card-content">
                        <div class="card-value">${this.formatNumber(data.totalCreditsUsed || 0)}</div>
                        <div class="card-label">Credits Used</div>
                        <div class="card-detail">in selected period</div>
                    </div>
                </div>
                
                <div class="summary-card daily-average">
                    <div class="card-icon">📈</div>
                    <div class="card-content">
                        <div class="card-value">${this.formatNumber(data.dailyAverage || 0)}</div>
                        <div class="card-label">Daily Average</div>
                        <div class="card-detail">credits per day</div>
                    </div>
                </div>
                
                <div class="summary-card total-revenue">
                    <div class="card-icon">💰</div>
                    <div class="card-content">
                        <div class="card-value">${this.formatCurrency(data.totalRevenue || 0)}</div>
                        <div class="card-label">Revenue Generated</div>
                        <div class="card-detail">from credit usage</div>
                    </div>
                </div>
                
                <div class="summary-card efficiency">
                    <div class="card-icon">⚡</div>
                    <div class="card-content">
                        <div class="card-value">${this.formatPercentage(data.utilizationRate || 0)}</div>
                        <div class="card-label">Utilization Rate</div>
                        <div class="card-detail">credits used vs purchased</div>
                    </div>
                </div>
            </div>
        `;
    }

    displayUsageBreakdown() {
        const breakdownEl = this.$('.breakdown-content');
        if (!breakdownEl || !this.usageData) return;

        const breakdown = this.usageData.breakdown || [];

        if (breakdown.length === 0) {
            breakdownEl.innerHTML = '<div class="no-data">No usage data available for selected period</div>';
            return;
        }

        breakdownEl.innerHTML = `
            <div class="breakdown-header">
                <h4>📋 Usage Breakdown by Service</h4>
                <div class="breakdown-stats">
                    ${breakdown.length} service${breakdown.length !== 1 ? 's' : ''} used
                </div>
            </div>
            
            <div class="breakdown-table">
                <div class="breakdown-table-header">
                    <div class="col-vendor">Vendor</div>
                    <div class="col-service">Service</div>
                    <div class="col-credits">Credits Used</div>
                    <div class="col-revenue">Revenue</div>
                    <div class="col-customers">Customers</div>
                    <div class="col-avg">Avg/Customer</div>
                </div>
                
                <div class="breakdown-table-body">
                    ${breakdown.map(item => this.getBreakdownRowTemplate(item)).join('')}
                </div>
                
                <div class="breakdown-table-footer">
                    <div class="col-vendor"><strong>Total</strong></div>
                    <div class="col-service"><strong>${breakdown.length} services</strong></div>
                    <div class="col-credits"><strong>${this.formatNumber(breakdown.reduce((sum, item) => sum + item.creditsUsed, 0))}</strong></div>
                    <div class="col-revenue"><strong>${this.formatCurrency(breakdown.reduce((sum, item) => sum + item.revenue, 0))}</strong></div>
                    <div class="col-customers"><strong>${breakdown.reduce((sum, item) => sum + item.customerCount, 0)}</strong></div>
                    <div class="col-avg">-</div>
                </div>
            </div>
        `;
    }

    getBreakdownRowTemplate(item) {
        const avgPerCustomer = item.customerCount > 0 ? item.creditsUsed / item.customerCount : 0;

        return `
            <div class="breakdown-table-row">
                <div class="col-vendor">${this.escapeHtml(item.vendorName)}</div>
                <div class="col-service">${this.escapeHtml(item.serviceName)}</div>
                <div class="col-credits">${this.formatNumber(item.creditsUsed)}</div>
                <div class="col-revenue">${this.formatCurrency(item.revenue)}</div>
                <div class="col-customers">${this.formatNumber(item.customerCount)}</div>
                <div class="col-avg">${this.formatNumber(avgPerCustomer, 1)}</div>
            </div>
        `;
    }

    displayUsageTrends() {
        const trendsEl = this.$('.trends-content');
        if (!trendsEl || !this.usageData) return;

        const trends = this.usageData.trends || [];

        if (trends.length === 0) {
            trendsEl.innerHTML = '<div class="no-data">No trend data available</div>';
            return;
        }

        // Calculate trend direction
        const firstPeriod = trends[0];
        const lastPeriod = trends[trends.length - 1];
        const trendDirection = lastPeriod.creditsUsed > firstPeriod.creditsUsed ? 'up' : 'down';
        const trendPercent = firstPeriod.creditsUsed > 0 ?
            ((lastPeriod.creditsUsed - firstPeriod.creditsUsed) / firstPeriod.creditsUsed) * 100 : 0;

        trendsEl.innerHTML = `
            <div class="trends-header">
                <div class="trend-summary">
                    <span class="trend-direction ${trendDirection}">
                        ${trendDirection === 'up' ? '📈' : '📉'} 
                        ${this.formatPercentage(Math.abs(trendPercent))} 
                        ${trendDirection === 'up' ? 'increase' : 'decrease'}
                    </span>
                    <span class="trend-period">over selected period</span>
                </div>
            </div>
            
            <div class="trends-chart">
                <div class="trend-bars">
                    ${trends.map(period => this.getTrendBarTemplate(period, trends)).join('')}
                </div>
            </div>
            
            <div class="trends-insights">
                ${this.generateTrendInsights(trends)}
            </div>
        `;
    }

    getTrendBarTemplate(period, allPeriods) {
        const maxCredits = Math.max(...allPeriods.map(p => p.creditsUsed));
        const heightPercent = maxCredits > 0 ? (period.creditsUsed / maxCredits) * 100 : 0;

        return `
            <div class="trend-bar-container">
                <div class="trend-bar" style="height: ${heightPercent}%">
                    <div class="bar-value">${this.formatNumber(period.creditsUsed)}</div>
                </div>
                <div class="bar-label">${period.periodLabel}</div>
            </div>
        `;
    }

    generateTrendInsights(trends) {
        const insights = [];

        if (trends.length >= 2) {
            const recent = trends.slice(-2);
            const growth = recent[1].creditsUsed - recent[0].creditsUsed;

            if (growth > 0) {
                insights.push(`💡 Usage increased by ${this.formatNumber(growth)} credits in the most recent period`);
            } else if (growth < 0) {
                insights.push(`💡 Usage decreased by ${this.formatNumber(Math.abs(growth))} credits in the most recent period`);
            } else {
                insights.push('💡 Usage remained stable in the most recent period');
            }
        }

        // Find peak usage period
        const peakPeriod = trends.reduce((max, period) =>
            period.creditsUsed > max.creditsUsed ? period : max
        );

        insights.push(`🎯 Peak usage was ${this.formatNumber(peakPeriod.creditsUsed)} credits in ${peakPeriod.periodLabel}`);

        return `
            <div class="insights-list">
                ${insights.map(insight => `<div class="insight-item">${insight}</div>`).join('')}
            </div>
        `;
    }

    changePeriod(period) {
        this.selectedPeriod = period;

        const customRange = this.$('.custom-date-range');
        if (customRange) {
            customRange.style.display = period === 'custom' ? 'block' : 'none';
        }

        if (period !== 'custom') {
            this.loadUsageData();
        }
    }

    changeVendor(vendorId) {
        this.selectedVendor = vendorId;
        this.loadUsageData();
    }

    updateCustomRange() {
        const dateFrom = this.$('.date-from').value;
        const dateTo = this.$('.date-to').value;

        if (dateFrom && dateTo) {
            // Update the period to include custom dates
            this.selectedPeriod = `custom:${dateFrom}:${dateTo}`;
            this.loadUsageData();
        }
    }

    exportUsage() {
        if (!this.usageData) {
            console.error('No usage data to export');
            return;
        }

        const csvData = this.generateUsageCSV();
        const filename = `credit-usage-${this.selectedPeriod}-${Date.now()}.csv`;
        this.downloadFile(csvData, filename, 'text/csv');
    }

    generateUsageCSV() {
        const summary = this.usageData.summary || {};
        const breakdown = this.usageData.breakdown || [];
        const trends = this.usageData.trends || [];

        const rows = [
            ['Credit Usage Report'],
            ['Period:', this.selectedPeriod],
            ['Vendor Filter:', this.selectedVendor === 'all' ? 'All Vendors' : this.selectedVendor],
            ['Generated:', new Date().toISOString()],
            [''],
            ['SUMMARY'],
            ['Total Credits Used', summary.totalCreditsUsed || 0],
            ['Daily Average', summary.dailyAverage || 0],
            ['Total Revenue', summary.totalRevenue || 0],
            ['Utilization Rate', `${(summary.utilizationRate || 0).toFixed(1)}%`],
            [''],
            ['BREAKDOWN BY SERVICE'],
            ['Vendor', 'Service', 'Credits Used', 'Revenue', 'Customers', 'Avg per Customer'],
            ...breakdown.map(item => [
                item.vendorName,
                item.serviceName,
                item.creditsUsed,
                item.revenue,
                item.customerCount,
                (item.customerCount > 0 ? item.creditsUsed / item.customerCount : 0).toFixed(1)
            ]),
            [''],
            ['TRENDS'],
            ['Period', 'Credits Used', 'Revenue'],
            ...trends.map(trend => [
                trend.periodLabel,
                trend.creditsUsed,
                trend.revenue || 0
            ])
        ];

        return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
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

    formatPercentage(value) {
        return `${(value || 0).toFixed(1)}%`;
    }

    // Public API
    async refresh() {
        await this.loadUsageData();
    }

    setPeriod(period) {
        this.selectedPeriod = period;
        const periodSelect = this.$('.period-select');
        if (periodSelect) {
            periodSelect.value = period;
        }
        this.loadUsageData();
    }

    setVendor(vendorId) {
        this.selectedVendor = vendorId;
        const vendorSelect = this.$('.vendor-select');
        if (vendorSelect) {
            vendorSelect.value = vendorId;
        }
        this.loadUsageData();
    }

    getUsageData() {
        return this.usageData;
    }

    getUsageSummary() {
        return this.usageData?.summary;
    }
}

window.CreditUsageTrackingWidget = CreditUsageTrackingWidget;
