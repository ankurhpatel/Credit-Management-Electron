class MonthlyPLWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.selectedMonth = new Date().getMonth() + 1;
        this.selectedYear = new Date().getFullYear();
        this.plData = null;
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showChart: false,
            showComparison: true,
            showExport: true,
            autoLoadCurrent: false
        };
    }

    async getTemplate() {
        return `
            <div class="monthly-pl-widget">
                <h3>📅 Monthly P&L Analysis</h3>
                
                <form class="monthly-pl-form">
                    <div class="form-inline">
                        <div class="form-group">
                            <label>📅 Select Month:</label>
                            <select name="month" class="month-select" required>
                                ${this.getMonthOptions()}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>📆 Select Year:</label>
                            <select name="year" class="year-select" required>
                                ${this.getYearOptions()}
                            </select>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn-primary">📊 Load Monthly P&L</button>
                            <button type="button" class="btn-secondary current-month-btn">📅 Current Month</button>
                        </div>
                    </div>
                </form>
                
                <div class="monthly-pl-results" style="display: none;">
                    <div class="pl-header">
                        <h4 class="pl-title"></h4>
                        <div class="pl-actions">
                            ${this.options.showExport ? `
                                <button class="btn-info export-pl-btn">📊 Export</button>
                            ` : ''}
                            <button class="btn-secondary print-pl-btn">🖨️ Print</button>
                        </div>
                    </div>
                    
                    <div class="pl-content"></div>
                    
                    ${this.options.showComparison ? `
                        <div class="pl-comparison" style="display: none;">
                            <h5>📊 Month-over-Month Comparison</h5>
                            <div class="comparison-content"></div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getMonthOptions() {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        return months.map((month, index) => `
            <option value="${index + 1}" ${index + 1 === this.selectedMonth ? 'selected' : ''}>
                ${month}
            </option>
        `).join('');
    }

    getYearOptions() {
        const currentYear = new Date().getFullYear();
        const years = [];

        // Generate years from 3 years ago to current year
        for (let year = currentYear - 3; year <= currentYear; year++) {
            years.push(year);
        }

        return years.map(year => `
            <option value="${year}" ${year === this.selectedYear ? 'selected' : ''}>
                ${year}
            </option>
        `).join('');
    }

    bindEvents() {
        const form = this.$('.monthly-pl-form');
        if (form) {
            this.addEventListener(form, 'submit', (e) => this.handleSubmit(e));
        }

        const currentMonthBtn = this.$('.current-month-btn');
        if (currentMonthBtn) {
            this.addEventListener(currentMonthBtn, 'click', () => this.loadCurrentMonth());
        }

        const exportBtn = this.$('.export-pl-btn');
        if (exportBtn) {
            this.addEventListener(exportBtn, 'click', () => this.exportPL());
        }

        const printBtn = this.$('.print-pl-btn');
        if (printBtn) {
            this.addEventListener(printBtn, 'click', () => this.printPL());
        }
    }

    async onAfterRender() {
        if (this.options.autoLoadCurrent) {
            this.loadCurrentMonth();
        }
    }

    loadCurrentMonth() {
        const now = new Date();
        this.selectedMonth = now.getMonth() + 1;
        this.selectedYear = now.getFullYear();

        this.$('.month-select').value = this.selectedMonth;
        this.$('.year-select').value = this.selectedYear;

        this.loadMonthlyPL();
    }

    async handleSubmit(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        this.selectedMonth = parseInt(formData.get('month'));
        this.selectedYear = parseInt(formData.get('year'));

        await this.loadMonthlyPL();
    }

    async loadMonthlyPL() {
        const submitBtn = this.$('button[type="submit"]');
        const originalText = submitBtn?.textContent;

        try {
            if (submitBtn) {
                submitBtn.textContent = '⏳ Loading...';
                submitBtn.disabled = true;
            }

            this.log(`Loading P&L for ${this.selectedMonth}/${this.selectedYear}`);

            const response = await fetch(`/api/pnl/monthly?month=${this.selectedMonth}&year=${this.selectedYear}`);
            if (!response.ok) throw new Error('Failed to fetch monthly P&L data');

            this.plData = await response.json();
            this.displayPLResults();

            // Load comparison data if enabled
            if (this.options.showComparison) {
                await this.loadComparisonData();
            }

        } catch (error) {
            this.handleError('Failed to load monthly P&L', error);
            this.hidePLResults();
        } finally {
            if (submitBtn) {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        }
    }

    displayPLResults() {
        const resultsDiv = this.$('.monthly-pl-results');
        const titleEl = this.$('.pl-title');
        const contentEl = this.$('.pl-content');

        if (!resultsDiv || !titleEl || !contentEl) return;

        const monthName = new Date(this.selectedYear, this.selectedMonth - 1).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });

        titleEl.textContent = `P&L Statement - ${monthName}`;
        contentEl.innerHTML = this.getPLContentTemplate();
        resultsDiv.style.display = 'block';
    }

    getPLContentTemplate() {
        if (!this.plData) return '<div class="no-data">No P&L data available</div>';

        const data = this.plData;

        return `
            <div class="pl-statement">
                <!-- Revenue Section -->
                <div class="pl-section revenue-section">
                    <h5 class="section-title">📈 Revenue</h5>
                    <div class="pl-line-items">
                        <div class="pl-line-item">
                            <span class="item-label">Customer Sales</span>
                            <span class="item-value positive">${this.formatCurrency(data.revenue.customerSales || 0)}</span>
                        </div>
                        <div class="pl-line-item">
                            <span class="item-label">Business Income</span>
                            <span class="item-value positive">${this.formatCurrency(data.revenue.businessIncome || 0)}</span>
                        </div>
                        <div class="pl-line-item total-line">
                            <span class="item-label"><strong>Total Revenue</strong></span>
                            <span class="item-value positive"><strong>${this.formatCurrency(data.revenue.total || 0)}</strong></span>
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
                        </div>
                        <div class="pl-line-item">
                            <span class="item-label">Vendor Fees</span>
                            <span class="item-value negative">${this.formatCurrency(data.costs.vendorFees || 0)}</span>
                        </div>
                        <div class="pl-line-item total-line">
                            <span class="item-label"><strong>Total COGS</strong></span>
                            <span class="item-value negative"><strong>${this.formatCurrency(data.costs.total || 0)}</strong></span>
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
                    </div>
                </div>

                <!-- Operating Expenses Section -->
                <div class="pl-section expenses-section">
                    <h5 class="section-title">💸 Operating Expenses</h5>
                    <div class="pl-line-items">
                        <div class="pl-line-item">
                            <span class="item-label">Business Withdrawals</span>
                            <span class="item-value negative">${this.formatCurrency(data.expenses.withdrawals || 0)}</span>
                        </div>
                        <div class="pl-line-item">
                            <span class="item-label">Other Expenses</span>
                            <span class="item-value negative">${this.formatCurrency(data.expenses.other || 0)}</span>
                        </div>
                        <div class="pl-line-item total-line">
                            <span class="item-label"><strong>Total Expenses</strong></span>
                            <span class="item-value negative"><strong>${this.formatCurrency(data.expenses.total || 0)}</strong></span>
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
                    </div>
                </div>

                <!-- Key Metrics Section -->
                <div class="pl-section metrics-section">
                    <h5 class="section-title">📊 Key Metrics</h5>
                    <div class="metrics-grid">
                        <div class="metric-item">
                            <div class="metric-label">Gross Margin</div>
                            <div class="metric-value">${this.formatPercentage(data.metrics.grossMargin || 0)}</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">Net Margin</div>
                            <div class="metric-value">${this.formatPercentage(data.metrics.netMargin || 0)}</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">Credits Sold</div>
                            <div class="metric-value">${this.formatNumber(data.metrics.creditsSold || 0)}</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">Avg Revenue/Credit</div>
                            <div class="metric-value">${this.formatCurrency(data.metrics.avgRevenuePerCredit || 0)}</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">Customer Count</div>
                            <div class="metric-value">${this.formatNumber(data.metrics.customerCount || 0)}</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">Avg Sale Amount</div>
                            <div class="metric-value">${this.formatCurrency(data.metrics.avgSaleAmount || 0)}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadComparisonData() {
        try {
            // Get previous month data
            let prevMonth = this.selectedMonth - 1;
            let prevYear = this.selectedYear;

            if (prevMonth === 0) {
                prevMonth = 12;
                prevYear--;
            }

            const response = await fetch(`/api/pnl/monthly?month=${prevMonth}&year=${prevYear}`);
            if (response.ok) {
                const prevData = await response.json();
                this.displayComparisonData(prevData);
            }
        } catch (error) {
            console.error('Failed to load comparison data:', error);
        }
    }

    displayComparisonData(prevData) {
        const comparisonDiv = this.$('.pl-comparison');
        const comparisonContent = this.$('.comparison-content');

        if (!comparisonDiv || !comparisonContent || !this.plData) return;

        const current = this.plData;
        const previous = prevData;

        comparisonContent.innerHTML = `
            <div class="comparison-table">
                <div class="comparison-row header-row">
                    <div class="comparison-label">Metric</div>
                    <div class="comparison-current">Current Month</div>
                    <div class="comparison-previous">Previous Month</div>
                    <div class="comparison-change">Change</div>
                </div>
                
                ${this.getComparisonRow('Revenue', current.revenue.total, previous.revenue.total)}
                ${this.getComparisonRow('Gross Profit', current.grossProfit, previous.grossProfit)}
                ${this.getComparisonRow('Net Profit', current.netProfit, previous.netProfit)}
                ${this.getComparisonRow('Credits Sold', current.metrics.creditsSold, previous.metrics.creditsSold, false)}
                ${this.getComparisonRow('Customer Count', current.metrics.customerCount, previous.metrics.customerCount, false)}
            </div>
        `;

        comparisonDiv.style.display = 'block';
    }

    getComparisonRow(label, currentValue, previousValue, isCurrency = true) {
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
                    ${changeIcon} ${formatValue(Math.abs(change))} (${this.formatPercentage(Math.abs(changePercent))})
                </div>
            </div>
        `;
    }

    hidePLResults() {
        const resultsDiv = this.$('.monthly-pl-results');
        if (resultsDiv) {
            resultsDiv.style.display = 'none';
        }
    }

    exportPL() {
        if (!this.plData) {
            this.showErrorMessage('No P&L data to export');
            return;
        }

        const csvData = this.generateCSVData();
        const monthName = new Date(this.selectedYear, this.selectedMonth - 1).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });

        this.downloadFile(csvData, `monthly-pl-${monthName.replace(' ', '-')}.csv`, 'text/csv');
    }

    generateCSVData() {
        const data = this.plData;
        const monthName = new Date(this.selectedYear, this.selectedMonth - 1).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });

        const rows = [
            [`Monthly P&L Statement - ${monthName}`],
            [''],
            ['REVENUE'],
            ['Customer Sales', data.revenue.customerSales || 0],
            ['Business Income', data.revenue.businessIncome || 0],
            ['Total Revenue', data.revenue.total || 0],
            [''],
            ['COST OF GOODS SOLD'],
            ['Credit Purchases', data.costs.creditPurchases || 0],
            ['Vendor Fees', data.costs.vendorFees || 0],
            ['Total COGS', data.costs.total || 0],
            [''],
            ['GROSS PROFIT', data.grossProfit || 0],
            [''],
            ['OPERATING EXPENSES'],
            ['Business Withdrawals', data.expenses.withdrawals || 0],
            ['Other Expenses', data.expenses.other || 0],
            ['Total Expenses', data.expenses.total || 0],
            [''],
            ['NET PROFIT', data.netProfit || 0],
            [''],
            ['KEY METRICS'],
            ['Gross Margin', `${(data.metrics.grossMargin || 0).toFixed(1)}%`],
            ['Net Margin', `${(data.metrics.netMargin || 0).toFixed(1)}%`],
            ['Credits Sold', data.metrics.creditsSold || 0],
            ['Customer Count', data.metrics.customerCount || 0],
            ['Avg Revenue per Credit', data.metrics.avgRevenuePerCredit || 0],
            ['Avg Sale Amount', data.metrics.avgSaleAmount || 0]
        ];

        return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }

    printPL() {
        if (!this.plData) {
            this.showErrorMessage('No P&L data to print');
            return;
        }

        const printWindow = window.open('', '_blank');
        printWindow.document.write(this.generatePrintHTML());
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }

    generatePrintHTML() {
        const monthName = new Date(this.selectedYear, this.selectedMonth - 1).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Monthly P&L - ${monthName}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .section { margin-bottom: 15px; }
                    .section-title { font-weight: bold; margin-bottom: 10px; }
                    .line-item { display: flex; justify-content: space-between; margin: 5px 0; }
                    .total-line { border-top: 1px solid #ccc; padding-top: 5px; font-weight: bold; }
                    .positive { color: green; }
                    .negative { color: red; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>💳 IT Services Credit Management</h1>
                    <h2>Monthly P&L Statement - ${monthName}</h2>
                </div>
                ${this.getPLContentTemplate()}
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
    async loadPLForMonth(month, year) {
        this.selectedMonth = month;
        this.selectedYear = year;

        this.$('.month-select').value = month;
        this.$('.year-select').value = year;

        await this.loadMonthlyPL();
    }

    getPLData() {
        return this.plData;
    }

    getSelectedPeriod() {
        return {
            month: this.selectedMonth,
            year: this.selectedYear
        };
    }
}

window.MonthlyPLWidget = MonthlyPLWidget;
