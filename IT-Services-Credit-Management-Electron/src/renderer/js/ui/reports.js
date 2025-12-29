// P&L and reporting UI management
class ReportUI {
    static displayPL(containerId, result, title) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="pnl-summary">
                <h4>📊 ${title}</h4>
                
                <div class="pnl-metrics">
                    <div class="pnl-metric">
                        <div class="metric-label">Total Revenue</div>
                        <div class="metric-value success">${Formatters.formatCurrency(result.totalRevenue)}</div>
                    </div>
                    <div class="pnl-metric">
                        <div class="metric-label">Estimated COGS</div>
                        <div class="metric-value danger">${Formatters.formatCurrency(result.estimatedCosts)}</div>
                    </div>
                    <div class="pnl-metric">
                        <div class="metric-label">Net Profit</div>
                        <div class="metric-value ${(result.estimatedProfit || 0) >= 0 ? 'success' : 'danger'}">
                            ${Formatters.formatCurrency(result.estimatedProfit)}
                        </div>
                    </div>
                    <div class="pnl-metric">
                        <div class="metric-label">Profit Margin</div>
                        <div class="metric-value">${(result.margin || 0).toFixed(1)}%</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
                    <div class="pnl-breakdown-box" style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <h5 style="margin-bottom: 10px; color: #4a5568;">📺 Service Performance</h5>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span>Revenue:</span>
                            <span class="font-bold">${Formatters.formatCurrency(result.revenueServices)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Months Sold:</span>
                            <span class="font-bold">${result.serviceMonths}</span>
                        </div>
                    </div>
                    <div class="pnl-breakdown-box" style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <h5 style="margin-bottom: 10px; color: #4a5568;">🔌 Hardware Performance</h5>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span>Revenue:</span>
                            <span class="font-bold">${Formatters.formatCurrency(result.revenueHardware)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Units Sold:</span>
                            <span class="font-bold">${result.hardwareUnits}</span>
                        </div>
                    </div>
                    <div class="pnl-breakdown-box" style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <h5 style="margin-bottom: 10px; color: #4a5568;">💰 Fees & Shipping</h5>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Total Revenue:</span>
                            <span class="font-bold">${Formatters.formatCurrency(result.revenueFees || 0)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    static displayMonthlyPL(result, month, year) {
        const monthName = PLReportsAPI.getMonthName(month);
        this.displayPL('monthlyPLResult', result, `${monthName} ${year} P&L Summary`);
    }

    static displayYearlyPL(result, year) {
        this.displayPL('yearlyPLResult', result, `${year} Annual P&L Summary`);
    }

    static displayLifetimePL(result) {
        this.displayPL('lifetimePLResult', result, `Lifetime Business Performance`);
    }
}

// Make available globally
window.ReportUI = ReportUI;
