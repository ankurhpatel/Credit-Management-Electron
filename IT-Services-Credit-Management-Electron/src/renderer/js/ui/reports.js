// P&L and reporting UI management
class ReportUI {
    static displayMonthlyPL(result, month, year) {
        const container = document.getElementById('monthlyPLResult');
        if (!container) return;

        if (result.error) {
            container.innerHTML = `<div class="error">Error: ${result.error}</div>`;
            return;
        }

        const monthName = PLReportsAPI.getMonthName(month);

        container.innerHTML = `
            <div class="pnl-summary">
                <h4>📊 ${monthName} ${year} P&L Summary</h4>
                <div class="pnl-metrics">
                    <div class="pnl-metric">
                        <div class="metric-label">Total Revenue</div>
                        <div class="metric-value success">${Formatters.formatCurrency(result.totalRevenue || 0)}</div>
                    </div>
                    <div class="pnl-metric">
                        <div class="metric-label">Estimated Costs</div>
                        <div class="metric-value danger">${Formatters.formatCurrency(result.estimatedCosts || 0)}</div>
                    </div>
                    <div class="pnl-metric">
                        <div class="metric-label">Net Profit</div>
                        <div class="metric-value ${(result.estimatedProfit || 0) >= 0 ? 'success' : 'danger'}">
                            ${Formatters.formatCurrency(result.estimatedProfit || 0)}
                        </div>
                    </div>
                    <div class="pnl-metric">
                        <div class="metric-label">Subscriptions</div>
                        <div class="metric-value">${Formatters.formatNumber(result.subscriptionCount || 0)}</div>
                    </div>
                    <div class="pnl-metric">
                        <div class="metric-label">Credits Used</div>
                        <div class="metric-value">${Formatters.formatNumber(result.totalCreditsUsed || 0)}</div>
                    </div>
                    <div class="pnl-metric">
                        <div class="metric-label">Avg Cost/Credit</div>
                        <div class="metric-value">${Formatters.formatCurrency(result.avgCostPerCredit || 0)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    static displayYearlyPL(result, year) {
        const container = document.getElementById('yearlyPLResult');
        if (!container) return;

        if (result.error) {
            container.innerHTML = `<div class="error">Error: ${result.error}</div>`;
            return;
        }

        container.innerHTML = `
            <div class="pnl-summary">
                <h4>📊 ${year} Annual P&L Summary</h4>
                <div class="pnl-metrics">
                    <div class="pnl-metric">
                        <div class="metric-label">Total Revenue</div>
                        <div class="metric-value success">${Formatters.formatCurrency(result.totalRevenue || 0)}</div>
                    </div>
                    <div class="pnl-metric">
                        <div class="metric-label">Estimated Costs</div>
                        <div class="metric-value danger">${Formatters.formatCurrency(result.estimatedCosts || 0)}</div>
                    </div>
                    <div class="pnl-metric">
                        <div class="metric-label">Net Profit</div>
                        <div class="metric-value ${(result.estimatedProfit || 0) >= 0 ? 'success' : 'danger'}">
                            ${Formatters.formatCurrency(result.estimatedProfit || 0)}
                        </div>
                    </div>
                    <div class="pnl-metric">
                        <div class="metric-label">Subscriptions</div>
                        <div class="metric-value">${Formatters.formatNumber(result.subscriptionCount || 0)}</div>
                    </div>
                    <div class="pnl-metric">
                        <div class="metric-label">Credits Used</div>
                        <div class="metric-value">${Formatters.formatNumber(result.totalCreditsUsed || 0)}</div>
                    </div>
                    <div class="pnl-metric">
                        <div class="metric-label">Avg Cost/Credit</div>
                        <div class="metric-value">${Formatters.formatCurrency(result.avgCostPerCredit || 0)}</div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Make available globally
window.ReportUI = ReportUI;
