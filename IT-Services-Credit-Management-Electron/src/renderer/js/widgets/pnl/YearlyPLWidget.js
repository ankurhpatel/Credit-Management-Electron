class YearlyPLWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.selectedYear = new Date().getFullYear();
        this.plData = null;
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showChart: false,
            showComparison: true,
            showMonthlyBreakdown: true,
            showExport: true,
            autoLoadCurrent: false
        };
    }

    async getTemplate() {
        return `
            <div class="yearly-pl-widget">
                <h3>📆 Yearly P&L Analysis</h3>
                
                <form class="yearly-pl-form">
                    <div class="form-inline">
                        <div class="form-group">
                            <label>📆 Select Year:</label>
                            <select name="year" class="year-select" required>
                                ${this.getYearOptions()}
                            </select>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn-primary">📊 Load Yearly P&L</button>
                            <button type="button" class="btn-secondary current-year-btn">📅 Current Year</button>
                        </div>
                    </div>
                </form>
                
                <div class="yearly-pl-results" style="display: none;">
                    <div class="pl-header">
                        <h4 class="pl-title"></h4>
                        <div class="pl-actions">
                            ${this.options.showExport ? `
                                <button class="btn-info export-yearly-pl-btn">📊 Export</button>
                            ` : ''}
                            <button class="btn-secondary print-yearly-pl-btn">🖨️ Print</button>
                        </div>
                    </div>
                    
                    <div class="yearly-pl-summary">
                        <div class="summary-content"></div>
                    </div>
                    
                    <div class="yearly-pl-content"></div>
                    
                    ${this.options.showMonthlyBreakdown ? `
                        <div class="monthly-breakdown">
                            <div class="breakdown-header">
                                <h5>📊 Monthly Breakdown</h5>
                                <button class="btn-small btn-secondary toggle-breakdown">Show Details</button>
                            </div>
                            <div class="breakdown-content" style="display: none;"></div>
                        </div>
                    ` : ''}
                    
                    ${this.options.showComparison ? `
                        <div class="yearly-comparison" style="display: none;">
                            <h5>📊 Year-over-Year Comparison</h5>
                            <div class="comparison-content"></div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getYearOptions() {
        const currentYear = new Date().getFullYear();
        const years = [];

        // Generate years from 5 years ago to current year
        for (let year = currentYear - 5; year <= currentYear; year++) {
            years.push(year);
        }

        return years.map(year => `
            <option value="${year}" ${year === this.selectedYear ? 'selected' : ''}>
                ${year}
            </option>
        `).join('');
    }

    bindEvents() {
        const form = this.$('.yearly-pl-form');
        if (form) {
            this.addEventListener(form, 'submit', (e) => this.handleSubmit(e));
        }

        const currentYearBtn = this.$('.current-year-btn');
        if (currentYearBtn) {
            this.addEventListener(currentYearBtn, 'click', () => this.loadCurrentYear());
        }

        const exportBtn = this.$('.export-yearly-pl-btn');
        if (exportBtn) {
            this.addEventListener(exportBtn, 'click', () => this.exportYearlyPL());
        }

        const printBtn = this.$('.print-yearly-pl-btn');
        if (printBtn) {
            this.addEventListener(printBtn, 'click', () => this.printYearlyPL());
        }

        const toggleBreakdownBtn = this.$('.toggle-breakdown');
        if (toggleBreakdownBtn) {
            this.addEventListener(toggleBreakdownBtn, 'click', () => this.toggleMonthlyBreakdown());
        }
    }

    async onAfterRender() {
        if (this.options.autoLoadCurrent) {
            this.loadCurrentYear();
        }
    }

    loadCurrentYear() {
        this.selectedYear = new Date().getFullYear();
        this.$('.year-select').value = this.selectedYear;
        this.loadYearlyPL();
    }

    async handleSubmit(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        this.selectedYear = parseInt(formData.get('year'));

        await this.loadYearlyPL();
    }

    async loadYearlyPL() {
        const submitBtn = this.$('button[type="submit"]');
        const originalText = submitBtn?.textContent;

        try {
            if (submitBtn) {
                submitBtn.textContent = '⏳ Loading...';
                submitBtn.disabled = true;
            }

            this.log(`Loading yearly P&L for ${this.selectedYear}`);

            const response = await fetch(`/api/pnl/yearly?year=${this.selectedYear}`);
            if (!response.ok) throw new Error('Failed to fetch yearly P&L data');

            this.plData = await response.json();
            this.displayYearlyPLResults();

            // Load comparison data if enabled
            if (this.options.showComparison) {
                await this.loadYearlyComparisonData();
            }

        } catch (error) {
            this.handleError('Failed to load yearly P&L', error);
            this.hideYearlyPLResults();
        } finally {
            if (submitBtn) {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        }
    }

    displayYearlyPLResults() {
        const resultsDiv = this.$('.yearly-pl-results');
        const titleEl = this.$('.pl-title');
        const summaryEl = this.$('.summary-content');
        const contentEl = this.$('.yearly-pl-content');

        if (!resultsDiv || !titleEl || !contentEl) return;

        titleEl.textContent = `Annual P&L Statement - ${this.selectedYear}`;

        if (summaryEl) {
            summaryEl.innerHTML = this.getYearlySummaryTemplate();
        }

        contentEl.innerHTML = this.getYearlyPLContentTemplate();

        if (this.options.showMonthlyBreakdown) {
            this.displayMonthlyBreakdown();
        }

        resultsDiv.style.display = 'block';
    }

    getYearlySummaryTemplate() {
        if (!this.plData) return '';

        const data = this.plData;

        return `
            <div class="yearly-summary-cards">
                <div class="summary-card revenue-card">
                    <div class="card-icon">💰</div>
                    <div class="card-content">
                        <div class="card-amount">${this.formatCurrency(data.revenue.total || 0)}</div>
                        <div class="card-label">Total Revenue</div>
                        <div class="card-detail">${this.formatNumber(data.metrics.totalTransactions || 0)} transactions</div>
                    </div>
                </div>
                
                <div class="summary-card profit-card ${data.netProfit >= 0 ? 'positive' : 'negative'}">
                    <div class="card-icon">${data.netProfit >= 0 ? '📈' : '📉'}</div>
                    <div class="card-content">
                        <div class="card-amount">${this.formatCurrency(data.netProfit || 0)}</div>
                        <div class="card-label">Net Profit</div>
                        <div class="card-detail">${this.formatPercentage(data.metrics.netMargin || 0)} margin</div>
                    </div>
                </div>
                
                <div class="summary-card growth-card">
                    <div class="card-icon">🚀</div>
                    <div class="card-content">
                        <div class="card-amount">${this.formatNumber(data.metrics.creditsSold || 0)}</div>
                        <div class="card-label">Credits Sold</div>
                        <div class="card-detail">${this.formatCurrency(data.metrics.avgRevenuePerCredit || 0)}/credit</div>
                    </div>
                </div>
                
                <div class="summary-card customer-card">
                    <div class="card-icon">👥</div>
                    <div class="card-content">
                        <div class="card-amount">${this.formatNumber(data.metrics.totalCustomers || 0)}</div>
                        <div class="card-label">Total Customers</div>
                        <div class="card-detail">${this.formatCurrency(data.metrics.avgRevenuePerCustomer || 0)}/customer</div>
                    </div>
                </div>
            </div>
        `;
    }

    getYearlyPLContentTemplate() {
        if (!this.plData) return '<div class="no-data">No yearly P&L data available</div>';

        const data = this.plData;

        return `
            <div class="yearly-pl-statement">
                <!-- Revenue Section -->
                <div class="pl-section revenue-section">
                    <h5 class="section-title">📈 Annual Revenue</h5>
                    <div class="pl-line-items">
                        <div class="pl-line-item">
                            <span class="item-label">Customer Sales Revenue</span>
                            <span class="item-value positive">${this.formatCurrency(data.revenue.customerSales || 0)}</span>
                            <span class="item-detail">${this.formatNumber(data.metrics.totalSalesTransactions || 0)} sales</span>
                        </div>
                        <div class="pl-line-item">
                            <span class="item-label">Other Business Income</span>
                            <span class="item-value positive">${this.formatCurrency(data.revenue.businessIncome || 0)}</span>
                            <span class="item-detail">${this.formatNumber(data.metrics.businessIncomeTransactions || 0)} transactions</span>
                        </div>
                        <div class="pl-line-item total-line">
                            <span class="item-label"><strong>Total Annual Revenue</strong></span>
                            <span class="item-value positive"><strong>${this.formatCurrency(data.revenue.total || 0)}</strong></span>
                            <span class="item-detail"><strong>${this.formatNumber(data.metrics.totalTransactions || 0)} total</strong></span>
                        </div>
                    </div>
                </div>

                <!-- Cost of Goods Sold Section -->
                <div class="pl-section cogs-section">
                    <h5 class="section-title">📉 Cost of Goods Sold</h5>
                    <div class="pl-line-items">
                        <div class="pl-line-item">
                            <span class="item-label">Credit Purchases</span>
                            <span class="item-value negative">${this.formatCurrency(data.costs.creditPurchases || 0)}</span>
                            <span class="item-detail">${this.formatNumber(data.metrics.creditsPurchased || 0)} credits</span>
                        </div>
                        <div class="pl-line-item">
                            <span class="item-label">Vendor Transaction Fees</span>
                            <span class="item-value negative">${this.formatCurrency(data.costs.vendorFees || 0)}</span>
                            <span class="item-detail">${this.formatNumber(data.metrics.vendorTransactions || 0)} purchases</span>
                        </div>
                        <div class="pl-line-item">
                            <span class="item-label">Direct Service Costs</span>
                            <span class="item-value negative">${this.formatCurrency(data.costs.serviceCosts || 0)}</span>
                            <span class="item-detail">Operational costs</span>
                        </div>
                        <div class="pl-line-item total-line">
                            <span class="item-label"><strong>Total COGS</strong></span>
                            <span class="item-value negative"><strong>${this.formatCurrency(data.costs.total || 0)}</strong></span>
                            <span class="item-detail"><strong>${this.formatPercentage((data.costs.total / data.revenue.total) * 100 || 0)} of revenue</strong></span>
                        </div>
                    </div>
                </div>

                <!-- Gross Profit Section -->
                <div class="pl-section gross-profit-section">
                    <div class="pl-line-item major-line">
                        <span class="item-label"><strong>Gross Profit</strong></span>
                        <span class="item-value ${data.grossProfit >= 0 ? 'positive' : 'negative'}">
                            <strong>${this.formatCurrency(data.grossProfit || 0)}</strong>
                        </span>
                        <span class="item-detail"><strong>${this.formatPercentage(data.metrics.grossMargin || 0)} margin</strong></span>
                    </div>
                </div>

                <!-- Operating Expenses Section -->
                <div class="pl-section expenses-section">
                    <h5 class="section-title">💸 Operating Expenses</h5>
                    <div class="pl-line-items">
                        <div class="pl-line-item">
                            <span class="item-label">Business Withdrawals</span>
                            <span class="item-value negative">${this.formatCurrency(data.expenses.withdrawals || 0)}</span>
                            <span class="item-detail">${this.formatNumber(data.metrics.withdrawalTransactions || 0)} withdrawals</span>
                        </div>
                        <div class="pl-line-item">
                            <span class="item-label">Administrative Expenses</span>
                            <span class="item-value negative">${this.formatCurrency(data.expenses.administrative || 0)}</span>
                            <span class="item-detail">Admin & overhead</span>
                        </div>
                        <div class="pl-line-item">
                            <span class="item-label">Other Operating Expenses</span>
                            <span class="item-value negative">${this.formatCurrency(data.expenses.other || 0)}</span>
                            <span class="item-detail">Miscellaneous costs</span>
                        </div>
                        <div class="pl-line-item total-line">
                            <span class="item-label"><strong>Total Operating Expenses</strong></span>
                            <span class="item-value negative"><strong>${this.formatCurrency(data.expenses.total || 0)}</strong></span>
                            <span class="item-detail"><strong>${this.formatPercentage((data.expenses.total / data.revenue.total) * 100 || 0)} of revenue</strong></span>
                        </div>
                    </div>
                </div>

                <!-- Net Profit Section -->
                <div class="pl-section net-profit-section">
                    <div class="pl-line-item major-line final-line">
                        <span class="item-label"><strong>Net Profit</strong></span>
                        <span class="item-value ${data.netProfit >= 0 ? 'positive' : 'negative'} final-value">
                            <strong>${this.formatCurrency(data.netProfit || 0)}</strong>
                        </span>
                        <span class="item-detail"><strong>${this.formatPercentage(data.metrics.netMargin || 0)} margin</strong></span>
                    </div>
                </div>

                <!-- Key Performance Indicators -->
                <div class="pl-section kpi-section">
                    <h5 class="section-title">📊 Key Performance Indicators</h5>
                    <div class="kpi-grid">
                        <div class="kpi-item">
                            <div class="kpi-value">${this.formatCurrency(data.metrics.avgMonthlyRevenue || 0)}</div>
                            <div class="kpi-label">Avg Monthly Revenue</div>
                        </div>
                        <div class="kpi-item">
                            <div class="kpi-value">${this.formatCurrency(data.metrics.avgMonthlyProfit || 0)}</div>
                            <div class="kpi-label">Avg Monthly Profit</div>
                        </div>
                        <div class="kpi-item">
                            <div class="kpi-value">${this.formatNumber(data.metrics.avgCreditsPerMonth || 0)}</div>
                            <div class="kpi-label">Avg Credits/Month</div>
                        </div>
                        <div class="kpi-item">
                            <div class="kpi-value">${this.formatNumber(data.metrics.avgCustomersPerMonth || 0)}</div>
                            <div class="kpi-label">Avg Customers/Month</div>
                        </div>
                        <div class="kpi-item">
                            <div class="kpi-value">${this.formatCurrency(data.metrics.avgSaleAmount || 0)}</div>
                            <div class="kpi-label">Avg Sale Amount</div>
                        </div>
                        <div class="kpi-item">
                            <div class="kpi-value">${this.formatPercentage(data.metrics.customerGrowthRate || 0)}</div>
                            <div class="kpi-label">Customer Growth Rate</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    displayMonthlyBreakdown() {
        if (!this.plData.monthlyBreakdown) return;

        const breakdownContent = this.$('.breakdown-content');
        if (!breakdownContent) return;

        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        breakdownContent.innerHTML = `
            <div class="monthly-breakdown-table">
                <div class="breakdown-header-row">
                    <div class="breakdown-month">Month</div>
                    <div class="breakdown-revenue">Revenue</div>
                    <div class="breakdown-costs">COGS</div>
                    <div class="breakdown-expenses">Expenses</div>
                    <div class="breakdown-profit">Net Profit</div>
                    <div class="breakdown-margin">Margin %</div>
                </div>
                
                ${months.map((month, index) => {
            const monthData = this.plData.monthlyBreakdown[index + 1] || {};
            return this.getMonthlyBreakdownRow(month, monthData);
        }).join('')}
                
                <div class="breakdown-total-row">
                    <div class="breakdown-month"><strong>Total</strong></div>
                    <div class="breakdown-revenue"><strong>${this.formatCurrency(this.plData.revenue.total || 0)}</strong></div>
                    <div class="breakdown-costs"><strong>${this.formatCurrency(this.plData.costs.total || 0)}</strong></div>
                    <div class="breakdown-expenses"><strong>${this.formatCurrency(this.plData.expenses.total || 0)}</strong></div>
                    <div class="breakdown-profit ${this.plData.netProfit >= 0 ? 'positive' : 'negative'}">
                        <strong>${this.formatCurrency(this.plData.netProfit || 0)}</strong>
                    </div>
                    <div class="breakdown-margin"><strong>${this.formatPercentage(this.plData.metrics.netMargin || 0)}</strong></div>
                </div>
            </div>
        `;
    }

    getMonthlyBreakdownRow(monthName, monthData) {
        const revenue = monthData.revenue || 0;
        const costs = monthData.costs || 0;
        const expenses = monthData.expenses || 0;
        const profit = revenue - costs - expenses;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

        return `
            <div class="breakdown-row">
                <div class="breakdown-month">${monthName}</div>
                <div class="breakdown-revenue">${this.formatCurrency(revenue)}</div>
                <div class="breakdown-costs">${this.formatCurrency(costs)}</div>
                <div class="breakdown-expenses">${this.formatCurrency(expenses)}</div>
                <div class="breakdown-profit ${profit >= 0 ? 'positive' : 'negative'}">${this.formatCurrency(profit)}</div>
                <div class="breakdown-margin">${this.formatPercentage(margin)}</div>
            </div>
        `;
    }

    toggleMonthlyBreakdown() {
        const breakdownContent = this.$('.breakdown-content');
        const toggleBtn = this.$('.toggle-breakdown');

        if (!breakdownContent || !toggleBtn) return;

        const isVisible = breakdownContent.style.display !== 'none';

        breakdownContent.style.display = isVisible ? 'none' : 'block';
        toggleBtn.textContent = isVisible ? 'Show Details' : 'Hide Details';
    }

    async loadYearlyComparisonData() {
        try {
            const prevYear = this.selectedYear - 1;
            const response = await fetch(`/api/pnl/yearly?year=${prevYear}`);

            if (response.ok) {
                const prevData = await response.json();
                this.displayYearlyComparison(prevData);
            }
        } catch (error) {
            console.error('Failed to load yearly comparison data:', error);
        }
    }

    displayYearlyComparison(prevData) {
        const comparisonDiv = this.$('.yearly-comparison');
        const comparisonContent = this.$('.comparison-content');

        if (!comparisonDiv || !comparisonContent || !this.plData) return;

        const current = this.plData;
        const previous = prevData;

        comparisonContent.innerHTML = `
            <div class="yearly-comparison-table">
                <div class="comparison-row header-row">
                    <div class="comparison-label">Metric</div>
                    <div class="comparison-current">${this.selectedYear}</div>
                    <div class="comparison-previous">${this.selectedYear - 1}</div>
                    <div class="comparison-change">Change</div>
                    <div class="comparison-percent">% Change</div>
                </div>
                
                ${this.getYearlyComparisonRow('Total Revenue', current.revenue.total, previous.revenue.total)}
                ${this.getYearlyComparisonRow('Gross Profit', current.grossProfit, previous.grossProfit)}
                ${this.getYearlyComparisonRow('Net Profit', current.netProfit, previous.netProfit)}
                ${this.getYearlyComparisonRow('Credits Sold', current.metrics.creditsSold, previous.metrics.creditsSold, false)}
                ${this.getYearlyComparisonRow('Total Customers', current.metrics.totalCustomers, previous.metrics.totalCustomers, false)}
                ${this.getYearlyComparisonRow('Avg Revenue/Credit', current.metrics.avgRevenuePerCredit, previous.metrics.avgRevenuePerCredit)}
            </div>
        `;

        comparisonDiv.style.display = 'block';
    }

    getYearlyComparisonRow(label, currentValue, previousValue, isCurrency = true) {
        const change = currentValue - previousValue;
        const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0;
        const changeClass = change >= 0 ? 'positive' : 'negative';
        const changeIcon = change >= 0 ? '📈' : '📉';

        const formatValue = isCurrency ? this.formatCurrency : this.formatNumber;

        return `
            <div class="comparison-row">
                <div class="comparison-label">${label}</div>
                <div class="comparison-current">${formatValue(currentValue)}</div>
                <div class="comparison-previous">${formatValue(previousValue)}</div>
                <div class="comparison-change ${changeClass}">
                    ${changeIcon} ${formatValue(Math.abs(change))}
                </div>
                <div class="comparison-percent ${changeClass}">
                    ${this.formatPercentage(Math.abs(changePercent))}
                </div>
            </div>
        `;
    }

    hideYearlyPLResults() {
        const resultsDiv = this.$('.yearly-pl-results');
        if (resultsDiv) {
            resultsDiv.style.display = 'none';
        }
    }

    exportYearlyPL() {
        if (!this.plData) {
            this.showErrorMessage('No yearly P&L data to export');
            return;
        }

        const csvData = this.generateYearlyCSVData();
        this.downloadFile(csvData, `yearly-pl-${this.selectedYear}.csv`, 'text/csv');
    }

    generateYearlyCSVData() {
        const data = this.plData;

        const rows = [
            [`Annual P&L Statement - ${this.selectedYear}`],
            [''],
            ['REVENUE'],
            ['Customer Sales Revenue', data.revenue.customerSales || 0],
            ['Other Business Income', data.revenue.businessIncome || 0],
            ['Total Revenue', data.revenue.total || 0],
            [''],
            ['COST OF GOODS SOLD'],
            ['Credit Purchases', data.costs.creditPurchases || 0],
            ['Vendor Transaction Fees', data.costs.vendorFees || 0],
            ['Direct Service Costs', data.costs.serviceCosts || 0],
            ['Total COGS', data.costs.total || 0],
            [''],
            ['GROSS PROFIT', data.grossProfit || 0],
            [''],
            ['OPERATING EXPENSES'],
            ['Business Withdrawals', data.expenses.withdrawals || 0],
            ['Administrative Expenses', data.expenses.administrative || 0],
            ['Other Operating Expenses', data.expenses.other || 0],
            ['Total Operating Expenses', data.expenses.total || 0],
            [''],
            ['NET PROFIT', data.netProfit || 0],
            [''],
            ['KEY METRICS'],
            ['Gross Margin', `${(data.metrics.grossMargin || 0).toFixed(1)}%`],
            ['Net Margin', `${(data.metrics.netMargin || 0).toFixed(1)}%`],
            ['Total Credits Sold', data.metrics.creditsSold || 0],
            ['Total Customers', data.metrics.totalCustomers || 0],
            ['Avg Revenue per Credit', data.metrics.avgRevenuePerCredit || 0],
            ['Avg Revenue per Customer', data.metrics.avgRevenuePerCustomer || 0],
            ['Avg Monthly Revenue', data.metrics.avgMonthlyRevenue || 0],
            ['Avg Monthly Profit', data.metrics.avgMonthlyProfit || 0],
        ];

        return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }

    printYearlyPL() {
        if (!this.plData) {
            this.showErrorMessage('No yearly P&L data to print');
            return;
        }

        const printWindow = window.open('', '_blank');
        printWindow.document.write(this.generateYearlyPrintHTML());
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }

    generateYearlyPrintHTML() {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Annual P&L - ${this.selectedYear}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .section { margin-bottom: 15px; }
                    .section-title { font-weight: bold; margin-bottom: 10px; }
                    .line-item { display: flex; justify-content: space-between; margin: 5px 0; }
                    .total-line { border-top: 1px solid #ccc; padding-top: 5px; font-weight: bold; }
                    .positive { color: green; }
                    .negative { color: red; }
                    @media print { body { margin: 10px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>💳 IT Services Credit Management</h1>
                    <h2>Annual P&L Statement - ${this.selectedYear}</h2>
                </div>
                ${this.getYearlyPLContentTemplate()}
            </body>
            </html>
        `;
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

    showErrorMessage(message) {
        console.error('Error:', message);
    }

    // Public API
    async loadPLForYear(year) {
        this.selectedYear = year;
        this.$('.year-select').value = year;
        await this.loadYearlyPL();
    }

    getYearlyPLData() {
        return this.plData;
    }

    getSelectedYear() {
        return this.selectedYear;
    }
}

window.YearlyPLWidget = YearlyPLWidget;
