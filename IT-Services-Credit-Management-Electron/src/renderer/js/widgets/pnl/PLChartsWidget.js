class PLChartsWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.chartData = null;
        this.activeChart = 'revenue';
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showRevenueChart: true,
            showProfitChart: true,
            showMarginChart: true,
            showTrendChart: true,
            defaultPeriod: '12months',
            chartHeight: 400
        };
    }

    async getTemplate() {
        return `
            <div class="pl-charts-widget">
                <div class="charts-header">
                    <h4>📊 P&L Visual Analytics</h4>
                    <div class="chart-controls">
                        <select class="period-select">
                            <option value="6months">Last 6 Months</option>
                            <option value="12months" selected>Last 12 Months</option>
                            <option value="24months">Last 24 Months</option>
                            <option value="currentyear">Current Year</option>
                            <option value="lastyear">Last Year</option>
                        </select>
                        <button class="btn-secondary refresh-charts-btn">🔄 Refresh</button>
                    </div>
                </div>
                
                <div class="chart-navigation">
                    ${this.options.showRevenueChart ? `
                        <button class="chart-tab active" data-chart="revenue">📈 Revenue</button>
                    ` : ''}
                    ${this.options.showProfitChart ? `
                        <button class="chart-tab" data-chart="profit">💰 Profit</button>
                    ` : ''}
                    ${this.options.showMarginChart ? `
                        <button class="chart-tab" data-chart="margin">📊 Margins</button>
                    ` : ''}
                    ${this.options.showTrendChart ? `
                        <button class="chart-tab" data-chart="trend">📉 Trends</button>
                    ` : ''}
                </div>
                
                <div class="chart-container">
                    <div class="chart-loading" style="display: none;">
                        <div class="loading-spinner"></div>
                        <p>Loading chart data...</p>
                    </div>
                    
                    <div class="chart-content">
                        <canvas id="plChart" width="800" height="${this.options.chartHeight}"></canvas>
                    </div>
                    
                    <div class="chart-summary">
                        <div class="summary-metrics"></div>
                    </div>
                </div>
                
                <div class="chart-insights">
                    <h5>💡 Key Insights</h5>
                    <div class="insights-content"></div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Period selection
        const periodSelect = this.$('.period-select');
        if (periodSelect) {
            this.addEventListener(periodSelect, 'change', (e) => this.changePeriod(e.target.value));
        }

        // Refresh button
        const refreshBtn = this.$('.refresh-charts-btn');
        if (refreshBtn) {
            this.addEventListener(refreshBtn, 'click', () => this.refreshCharts());
        }

        // Chart navigation
        this.$$('.chart-tab').forEach(tab => {
            this.addEventListener(tab, 'click', (e) => {
                const chartType = e.target.getAttribute('data-chart');
                this.switchChart(chartType);
            });
        });
    }

    async onAfterRender() {
        await this.loadChartData(this.options.defaultPeriod);
        this.renderChart(this.activeChart);
    }

    async loadChartData(period) {
        try {
            this.showChartLoading();
            this.log(`Loading chart data for period: ${period}`);

            const response = await fetch(`/api/pnl/charts?period=${period}`);
            if (!response.ok) throw new Error('Failed to fetch chart data');

            this.chartData = await response.json();
            this.log('Chart data loaded:', this.chartData);

        } catch (error) {
            this.handleError('Failed to load chart data', error);
        } finally {
            this.hideChartLoading();
        }
    }

    showChartLoading() {
        const loading = this.$('.chart-loading');
        const content = this.$('.chart-content');

        if (loading) loading.style.display = 'flex';
        if (content) content.style.opacity = '0.3';
    }

    hideChartLoading() {
        const loading = this.$('.chart-loading');
        const content = this.$('.chart-content');

        if (loading) loading.style.display = 'none';
        if (content) content.style.opacity = '1';
    }

    async changePeriod(period) {
        await this.loadChartData(period);
        this.renderChart(this.activeChart);
    }

    async refreshCharts() {
        const period = this.$('.period-select').value;
        await this.loadChartData(period);
        this.renderChart(this.activeChart);
    }

    switchChart(chartType) {
        // Update active tab
        this.$$('.chart-tab').forEach(tab => tab.classList.remove('active'));
        this.$(`[data-chart="${chartType}"]`).classList.add('active');

        this.activeChart = chartType;
        this.renderChart(chartType);
    }

    renderChart(chartType) {
        if (!this.chartData) {
            console.warn('No chart data available');
            return;
        }

        const canvas = this.$('#plChart');
        if (!canvas) {
            console.error('Chart canvas not found');
            return;
        }

        // Clear any existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        const ctx = canvas.getContext('2d');

        switch (chartType) {
            case 'revenue':
                this.renderRevenueChart(ctx);
                break;
            case 'profit':
                this.renderProfitChart(ctx);
                break;
            case 'margin':
                this.renderMarginChart(ctx);
                break;
            case 'trend':
                this.renderTrendChart(ctx);
                break;
            default:
                console.error('Unknown chart type:', chartType);
        }

        this.updateSummaryMetrics(chartType);
        this.updateInsights(chartType);
    }

    renderRevenueChart(ctx) {
        // Note: This is a basic implementation
        // In a real application, you would use Chart.js or similar library
        const data = this.chartData.revenue || [];

        // Simple bar chart rendering
        this.drawBarChart(ctx, {
            labels: data.map(d => d.period),
            data: data.map(d => d.amount),
            title: 'Monthly Revenue',
            color: '#4CAF50'
        });
    }

    renderProfitChart(ctx) {
        const data = this.chartData.profit || [];

        this.drawLineChart(ctx, {
            labels: data.map(d => d.period),
            data: data.map(d => d.amount),
            title: 'Monthly Profit',
            color: '#2196F3'
        });
    }

    renderMarginChart(ctx) {
        const data = this.chartData.margins || [];

        this.drawLineChart(ctx, {
            labels: data.map(d => d.period),
            data: data.map(d => d.percentage),
            title: 'Profit Margins (%)',
            color: '#FF9800',
            isPercentage: true
        });
    }

    renderTrendChart(ctx) {
        const revenueData = this.chartData.revenue || [];
        const profitData = this.chartData.profit || [];

        this.drawMultiLineChart(ctx, {
            labels: revenueData.map(d => d.period),
            datasets: [
                {
                    label: 'Revenue',
                    data: revenueData.map(d => d.amount),
                    color: '#4CAF50'
                },
                {
                    label: 'Profit',
                    data: profitData.map(d => d.amount),
                    color: '#2196F3'
                }
            ],
            title: 'Revenue vs Profit Trends'
        });
    }

    // Simple chart drawing functions (replace with Chart.js in production)
    drawBarChart(ctx, options) {
        const { labels, data, title, color } = options;
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        // Draw title
        ctx.font = '16px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText(title, width / 2, 30);

        // Draw bars (simplified)
        const barWidth = (width - 100) / data.length;
        const maxValue = Math.max(...data);
        const chartHeight = height - 100;

        data.forEach((value, index) => {
            const barHeight = (value / maxValue) * chartHeight * 0.8;
            const x = 50 + index * barWidth;
            const y = height - 50 - barHeight;

            ctx.fillStyle = color;
            ctx.fillRect(x, y, barWidth * 0.8, barHeight);

            // Draw value labels
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.formatCurrency(value), x + barWidth * 0.4, y - 5);

            // Draw period labels
            ctx.fillText(labels[index], x + barWidth * 0.4, height - 20);
        });
    }

    drawLineChart(ctx, options) {
        const { labels, data, title, color, isPercentage } = options;
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        // Draw title
        ctx.font = '16px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText(title, width / 2, 30);

        // Draw line (simplified)
        const maxValue = Math.max(...data);
        const minValue = Math.min(...data);
        const valueRange = maxValue - minValue || 1;
        const chartHeight = height - 100;
        const chartWidth = width - 100;

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        data.forEach((value, index) => {
            const x = 50 + (index / (data.length - 1)) * chartWidth;
            const y = height - 50 - ((value - minValue) / valueRange) * chartHeight * 0.8;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            // Draw data points
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();

            // Draw value labels
            ctx.fillStyle = '#333';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            const displayValue = isPercentage ?
                `${value.toFixed(1)}%` :
                this.formatCurrency(value);
            ctx.fillText(displayValue, x, y - 10);
        });

        ctx.stroke();
    }

    drawMultiLineChart(ctx, options) {
        const { labels, datasets, title } = options;
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        // Draw title
        ctx.font = '16px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText(title, width / 2, 30);

        // Find global max/min for scaling
        const allData = datasets.flatMap(d => d.data);
        const maxValue = Math.max(...allData);
        const minValue = Math.min(...allData);
        const valueRange = maxValue - minValue || 1;
        const chartHeight = height - 120; // Extra space for legend
        const chartWidth = width - 100;

        // Draw each dataset
        datasets.forEach((dataset, datasetIndex) => {
            const { data, color, label } = dataset;

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();

            data.forEach((value, index) => {
                const x = 50 + (index / (data.length - 1)) * chartWidth;
                const y = height - 70 - ((value - minValue) / valueRange) * chartHeight * 0.8;

                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.stroke();

            // Draw legend
            const legendY = height - 40;
            const legendX = 50 + datasetIndex * 120;

            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(legendX, legendY);
            ctx.lineTo(legendX + 20, legendY);
            ctx.stroke();

            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(label, legendX + 25, legendY + 4);
        });
    }

    updateSummaryMetrics(chartType) {
        const summaryEl = this.$('.summary-metrics');
        if (!summaryEl || !this.chartData) return;

        let metricsHTML = '';

        switch (chartType) {
            case 'revenue':
                metricsHTML = this.getRevenueSummary();
                break;
            case 'profit':
                metricsHTML = this.getProfitSummary();
                break;
            case 'margin':
                metricsHTML = this.getMarginSummary();
                break;
            case 'trend':
                metricsHTML = this.getTrendSummary();
                break;
        }

        summaryEl.innerHTML = metricsHTML;
    }

    getRevenueSummary() {
        const revenueData = this.chartData.revenue || [];
        if (revenueData.length === 0) return '<p>No revenue data available</p>';

        const totalRevenue = revenueData.reduce((sum, d) => sum + d.amount, 0);
        const avgRevenue = totalRevenue / revenueData.length;
        const maxRevenue = Math.max(...revenueData.map(d => d.amount));
        const minRevenue = Math.min(...revenueData.map(d => d.amount));

        return `
            <div class="metric-summary">
                <div class="metric-item">
                    <span class="metric-label">Total Revenue:</span>
                    <span class="metric-value">${this.formatCurrency(totalRevenue)}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Average Monthly:</span>
                    <span class="metric-value">${this.formatCurrency(avgRevenue)}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Highest Month:</span>
                    <span class="metric-value">${this.formatCurrency(maxRevenue)}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Lowest Month:</span>
                    <span class="metric-value">${this.formatCurrency(minRevenue)}</span>
                </div>
            </div>
        `;
    }

    getProfitSummary() {
        const profitData = this.chartData.profit || [];
        if (profitData.length === 0) return '<p>No profit data available</p>';

        const totalProfit = profitData.reduce((sum, d) => sum + d.amount, 0);
        const avgProfit = totalProfit / profitData.length;
        const profitableMonths = profitData.filter(d => d.amount > 0).length;

        return `
            <div class="metric-summary">
                <div class="metric-item">
                    <span class="metric-label">Total Profit:</span>
                    <span class="metric-value ${totalProfit >= 0 ? 'positive' : 'negative'}">${this.formatCurrency(totalProfit)}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Average Monthly:</span>
                    <span class="metric-value ${avgProfit >= 0 ? 'positive' : 'negative'}">${this.formatCurrency(avgProfit)}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Profitable Months:</span>
                    <span class="metric-value">${profitableMonths}/${profitData.length}</span>
                </div>
            </div>
        `;
    }

    getMarginSummary() {
        const marginData = this.chartData.margins || [];
        if (marginData.length === 0) return '<p>No margin data available</p>';

        const avgMargin = marginData.reduce((sum, d) => sum + d.percentage, 0) / marginData.length;
        const maxMargin = Math.max(...marginData.map(d => d.percentage));
        const minMargin = Math.min(...marginData.map(d => d.percentage));

        return `
            <div class="metric-summary">
                <div class="metric-item">
                    <span class="metric-label">Average Margin:</span>
                    <span class="metric-value">${this.formatPercentage(avgMargin)}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Best Margin:</span>
                    <span class="metric-value">${this.formatPercentage(maxMargin)}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Lowest Margin:</span>
                    <span class="metric-value">${this.formatPercentage(minMargin)}</span>
                </div>
            </div>
        `;
    }

    getTrendSummary() {
        const revenueData = this.chartData.revenue || [];
        const profitData = this.chartData.profit || [];

        if (revenueData.length === 0 || profitData.length === 0) {
            return '<p>No trend data available</p>';
        }

        // Calculate simple trends (last vs first)
        const revenueGrowth = revenueData.length > 1 ?
            ((revenueData[revenueData.length - 1].amount - revenueData[0].amount) / revenueData[0].amount) * 100 : 0;

        const profitGrowth = profitData.length > 1 ?
            ((profitData[profitData.length - 1].amount - profitData[0].amount) / Math.abs(profitData[0].amount)) * 100 : 0;

        return `
            <div class="metric-summary">
                <div class="metric-item">
                    <span class="metric-label">Revenue Growth:</span>
                    <span class="metric-value ${revenueGrowth >= 0 ? 'positive' : 'negative'}">
                        ${revenueGrowth >= 0 ? '📈' : '📉'} ${this.formatPercentage(Math.abs(revenueGrowth))}
                    </span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Profit Growth:</span>
                    <span class="metric-value ${profitGrowth >= 0 ? 'positive' : 'negative'}">
                        ${profitGrowth >= 0 ? '📈' : '📉'} ${this.formatPercentage(Math.abs(profitGrowth))}
                    </span>
                </div>
            </div>
        `;
    }

    updateInsights(chartType) {
        const insightsEl = this.$('.insights-content');
        if (!insightsEl || !this.chartData) return;

        const insights = this.generateInsights(chartType);
        insightsEl.innerHTML = insights.map(insight =>
            `<div class="insight-item">${insight}</div>`
        ).join('');
    }

    generateInsights(chartType) {
        // Simple insights based on data patterns
        const insights = [];

        try {
            switch (chartType) {
                case 'revenue':
                    insights.push(...this.getRevenueInsights());
                    break;
                case 'profit':
                    insights.push(...this.getProfitInsights());
                    break;
                case 'margin':
                    insights.push(...this.getMarginInsights());
                    break;
                case 'trend':
                    insights.push(...this.getTrendInsights());
                    break;
            }
        } catch (error) {
            console.error('Error generating insights:', error);
            insights.push('💡 Insights will be available once more data is collected.');
        }

        return insights.length > 0 ? insights : ['💡 Keep growing your business to unlock more insights!'];
    }

    getRevenueInsights() {
        const revenueData = this.chartData.revenue || [];
        const insights = [];

        if (revenueData.length >= 3) {
            const recent = revenueData.slice(-3);
            const trend = recent[2].amount > recent[0].amount;

            insights.push(
                trend ?
                    '📈 Revenue is trending upward in recent months!' :
                    '📉 Consider strategies to boost revenue growth.'
            );
        }

        return insights;
    }

    getProfitInsights() {
        const profitData = this.chartData.profit || [];
        const insights = [];

        if (profitData.length > 0) {
            const profitableMonths = profitData.filter(d => d.amount > 0).length;
            const profitabilityRate = (profitableMonths / profitData.length) * 100;

            if (profitabilityRate >= 80) {
                insights.push('🎯 Excellent profitability! Most months are profitable.');
            } else if (profitabilityRate >= 50) {
                insights.push('💡 Good progress! Focus on consistency to improve profitability.');
            } else {
                insights.push('⚠️ Consider reviewing costs and pricing strategies to improve profitability.');
            }
        }

        return insights;
    }

    getMarginInsights() {
        const marginData = this.chartData.margins || [];
        const insights = [];

        if (marginData.length > 0) {
            const avgMargin = marginData.reduce((sum, d) => sum + d.percentage, 0) / marginData.length;

            if (avgMargin >= 30) {
                insights.push('💰 Strong profit margins! Your pricing strategy is effective.');
            } else if (avgMargin >= 15) {
                insights.push('📊 Healthy margins with room for optimization.');
            } else {
                insights.push('⚠️ Low margins detected. Review pricing and cost structure.');
            }
        }

        return insights;
    }

    getTrendInsights() {
        const insights = [];
        insights.push('📊 Monitor both revenue and profit trends to identify patterns.');
        insights.push('💡 Consistent growth in both metrics indicates a healthy business.');
        return insights;
    }

    formatPercentage(value) {
        return `${(value || 0).toFixed(1)}%`;
    }

    destroy() {
        if (this.chart) {
            this.chart.destroy();
        }
        super.destroy();
    }

    // Public API
    async updateChartData(period) {
        await this.loadChartData(period);
        this.renderChart(this.activeChart);
    }

    setActiveChart(chartType) {
        this.switchChart(chartType);
    }

    getChartData() {
        return this.chartData;
    }

    exportChartData() {
        if (!this.chartData) {
            console.error('No chart data to export');
            return;
        }

        const csvData = this.generateChartCSV();
        this.downloadFile(csvData, 'pl-chart-data.csv', 'text/csv');
    }

    generateChartCSV() {
        const data = this.chartData;
        const rows = [['Period', 'Revenue', 'Profit', 'Margin %']];

        // Assuming all data arrays have the same periods
        if (data.revenue && data.profit && data.margins) {
            data.revenue.forEach((item, index) => {
                const profit = data.profit[index]?.amount || 0;
                const margin = data.margins[index]?.percentage || 0;

                rows.push([
                    item.period,
                    item.amount,
                    profit,
                    margin
                ]);
            });
        }

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
}

window.PLChartsWidget = PLChartsWidget;
