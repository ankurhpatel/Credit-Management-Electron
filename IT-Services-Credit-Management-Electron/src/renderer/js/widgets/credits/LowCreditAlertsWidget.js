class LowCreditAlertsWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.alerts = [];
        this.alertThresholds = {
            critical: 10,
            warning: 50,
            low: 100
        };
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            autoRefresh: true,
            refreshInterval: 60000, // 1 minute
            showActions: true,
            showDismissed: false,
            groupByVendor: true,
            compactMode: false
        };
    }

    async loadData() {
        try {
            this.log('Loading credit balance alerts...');
            const response = await fetch('/api/credit-balances/alerts');
            if (!response.ok) throw new Error('Failed to fetch credit alerts');

            this.alerts = await response.json();
            this.log(`Loaded ${this.alerts.length} credit alerts`);
        } catch (error) {
            this.handleError('Failed to load credit alerts', error);
        }
    }

    async getTemplate() {
        return `
            <div class="low-credit-alerts-widget ${this.options.compactMode ? 'compact' : ''}">
                <div class="alerts-header">
                    <h3>⚠️ Low Credit Alerts</h3>
                    <div class="alerts-summary">
                        ${this.getAlertsSummaryTemplate()}
                    </div>
                    <div class="alerts-actions">
                        ${this.options.showActions ? `
                            <button class="btn-primary bulk-purchase-btn">💸 Bulk Purchase</button>
                            <button class="btn-secondary refresh-alerts-btn">🔄 Refresh</button>
                        ` : ''}
                    </div>
                </div>

                <div class="alerts-filters">
                    <div class="filter-buttons">
                        <button class="filter-btn active" data-filter="all">All (${this.alerts.length})</button>
                        <button class="filter-btn" data-filter="critical">🔴 Critical (${this.getCriticalCount()})</button>
                        <button class="filter-btn" data-filter="warning">🟡 Warning (${this.getWarningCount()})</button>
                        <button class="filter-btn" data-filter="low">🟠 Low (${this.getLowCount()})</button>
                    </div>
                    
                    <div class="view-options">
                        <label class="toggle-option">
                            <input type="checkbox" class="group-by-vendor-toggle" ${this.options.groupByVendor ? 'checked' : ''}>
                            Group by Vendor
                        </label>
                        ${this.options.showDismissed ? `
                            <label class="toggle-option">
                                <input type="checkbox" class="show-dismissed-toggle">
                                Show Dismissed
                            </label>
                        ` : ''}
                    </div>
                </div>

                <div class="alerts-container">
                    ${this.getAlertsContentTemplate()}
                </div>

                <div class="alerts-footer">
                    <div class="alert-legend">
                        <div class="legend-item critical">🔴 Critical: ≤${this.alertThresholds.critical} credits</div>
                        <div class="legend-item warning">🟡 Warning: ≤${this.alertThresholds.warning} credits</div>
                        <div class="legend-item low">🟠 Low: ≤${this.alertThresholds.low} credits</div>
                    </div>
                </div>
            </div>
        `;
    }

    getAlertsSummaryTemplate() {
        const criticalCount = this.getCriticalCount();
        const totalValue = this.alerts.reduce((sum, alert) =>
            sum + (alert.remaining_credits * (alert.avg_cost_per_credit || 0)), 0
        );

        return `
            <div class="summary-metrics">
                <div class="metric-item ${criticalCount > 0 ? 'critical' : ''}">
                    <span class="metric-icon">${criticalCount > 0 ? '🚨' : '✅'}</span>
                    <span class="metric-value">${criticalCount}</span>
                    <span class="metric-label">Critical Alerts</span>
                </div>
                <div class="metric-item">
                    <span class="metric-icon">💰</span>
                    <span class="metric-value">${this.formatCurrency(totalValue)}</span>
                    <span class="metric-label">Total Value at Risk</span>
                </div>
                <div class="metric-item">
                    <span class="metric-icon">🏭</span>
                    <span class="metric-value">${new Set(this.alerts.map(a => a.vendor_id)).size}</span>
                    <span class="metric-label">Affected Vendors</span>
                </div>
            </div>
        `;
    }

    getAlertsContentTemplate() {
        if (this.alerts.length === 0) {
            return `
                <div class="no-alerts">
                    <div class="no-alerts-icon">✅</div>
                    <h4>All Good!</h4>
                    <p>No low credit alerts at this time. All your credit balances are healthy.</p>
                </div>
            `;
        }

        return this.options.groupByVendor ?
            this.getGroupedAlertsTemplate() :
            this.getFlatAlertsTemplate();
    }

    getGroupedAlertsTemplate() {
        const groupedAlerts = this.groupAlertsByVendor();

        return Object.entries(groupedAlerts).map(([vendorName, alerts]) => `
            <div class="vendor-alert-group">
                <div class="vendor-group-header">
                    <div class="vendor-info">
                        <h4 class="vendor-name">🏭 ${vendorName}</h4>
                        <span class="vendor-alert-count">${alerts.length} alert${alerts.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="vendor-actions">
                        <button class="btn-primary purchase-for-vendor-btn" 
                                data-vendor-id="${alerts[0].vendor_id}">
                            💸 Purchase Credits
                        </button>
                        <button class="btn-small btn-secondary collapse-vendor-btn" 
                                data-vendor="${vendorName}">
                            📁 Collapse
                        </button>
                    </div>
                </div>
                
                <div class="vendor-alerts-list" data-vendor="${vendorName}">
                    ${alerts.map(alert => this.getAlertItemTemplate(alert)).join('')}
                </div>
            </div>
        `).join('');
    }

    getFlatAlertsTemplate() {
        return `
            <div class="alerts-list">
                ${this.alerts.map(alert => this.getAlertItemTemplate(alert)).join('')}
            </div>
        `;
    }

    getAlertItemTemplate(alert) {
        const alertLevel = this.getAlertLevel(alert.remaining_credits);
        const alertClass = `alert-${alertLevel}`;
        const urgencyClass = alertLevel === 'critical' ? 'urgent' : '';

        return `
            <div class="alert-item ${alertClass} ${urgencyClass}" data-alert-id="${alert.id}">
                <div class="alert-header">
                    <div class="alert-indicator">
                        <span class="alert-icon">${this.getAlertIcon(alertLevel)}</span>
                        <span class="alert-level">${alertLevel.toUpperCase()}</span>
                    </div>
                    <div class="alert-severity">
                        ${alertLevel === 'critical' ? '🚨 URGENT' : alertLevel === 'warning' ? '⚠️ ATTENTION' : '📢 NOTICE'}
                    </div>
                </div>

                <div class="alert-content">
                    <div class="service-info">
                        <h5 class="service-name">${this.escapeHtml(alert.service_name)}</h5>
                        ${!this.options.groupByVendor ? `
                            <div class="vendor-name">🏭 ${this.escapeHtml(alert.vendor_name)}</div>
                        ` : ''}
                    </div>

                    <div class="credit-status">
                        <div class="credits-remaining">
                            <span class="credits-number ${alertClass}">${alert.remaining_credits}</span>
                            <span class="credits-label">credits remaining</span>
                        </div>
                        <div class="credit-value">
                            Value: ${this.formatCurrency(alert.remaining_credits * (alert.avg_cost_per_credit || 0))}
                        </div>
                    </div>

                    <div class="alert-details">
                        <div class="detail-item">
                            <span class="detail-label">Last Purchase:</span>
                            <span class="detail-value">
                                ${alert.last_purchase_date ? this.formatDate(alert.last_purchase_date) : 'Never'}
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Usage Rate:</span>
                            <span class="detail-value">
                                ${this.calculateUsageRate(alert)} credits/day
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Est. Depletion:</span>
                            <span class="detail-value ${alertLevel === 'critical' ? 'text-danger' : ''}">
                                ${this.estimateDepletionDate(alert)}
                            </span>
                        </div>
                    </div>
                </div>

                ${this.options.showActions ? this.getAlertActionsTemplate(alert) : ''}
            </div>
        `;
    }

    getAlertActionsTemplate(alert) {
        return `
            <div class="alert-actions">
                <div class="primary-actions">
                    <button class="btn-primary purchase-credits-btn" 
                            data-vendor-id="${alert.vendor_id}"
                            data-service-name="${alert.service_name}">
                        💸 Purchase Credits
                    </button>
                    <button class="btn-info view-history-btn" 
                            data-vendor-id="${alert.vendor_id}"
                            data-service-name="${alert.service_name}">
                        📊 View History
                    </button>
                </div>
                
                <div class="secondary-actions">
                    <button class="btn-small btn-secondary snooze-alert-btn" 
                            data-alert-id="${alert.id}">
                        😴 Snooze
                    </button>
                    <button class="btn-small btn-warning adjust-threshold-btn" 
                            data-alert-id="${alert.id}">
                        ⚙️ Adjust
                    </button>
                    <button class="btn-small btn-danger dismiss-alert-btn" 
                            data-alert-id="${alert.id}">
                        ❌ Dismiss
                    </button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Header actions
        const bulkPurchaseBtn = this.$('.bulk-purchase-btn');
        if (bulkPurchaseBtn) {
            this.addEventListener(bulkPurchaseBtn, 'click', () => this.handleBulkPurchase());
        }

        const refreshBtn = this.$('.refresh-alerts-btn');
        if (refreshBtn) {
            this.addEventListener(refreshBtn, 'click', () => this.refresh());
        }

        // Filter buttons
        this.$$('.filter-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const filter = e.target.getAttribute('data-filter');
                this.setAlertFilter(filter);
            });
        });

        // Toggle options
        const groupToggle = this.$('.group-by-vendor-toggle');
        if (groupToggle) {
            this.addEventListener(groupToggle, 'change', (e) => {
                this.options.groupByVendor = e.target.checked;
                this.render();
            });
        }

        // Vendor actions
        this.$$('.purchase-for-vendor-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const vendorId = e.target.getAttribute('data-vendor-id');
                this.handleVendorPurchase(vendorId);
            });
        });

        this.$$('.collapse-vendor-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const vendorName = e.target.getAttribute('data-vendor');
                this.toggleVendorGroup(vendorName);
            });
        });

        // Alert actions
        this.bindAlertActions();
    }

    bindAlertActions() {
        // Purchase credits buttons
        this.$$('.purchase-credits-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const vendorId = e.target.getAttribute('data-vendor-id');
                const serviceName = e.target.getAttribute('data-service-name');
                this.handlePurchaseCredits(vendorId, serviceName);
            });
        });

        // View history buttons
        this.$$('.view-history-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const vendorId = e.target.getAttribute('data-vendor-id');
                const serviceName = e.target.getAttribute('data-service-name');
                this.handleViewHistory(vendorId, serviceName);
            });
        });

        // Snooze buttons
        this.$$('.snooze-alert-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const alertId = e.target.getAttribute('data-alert-id');
                this.handleSnoozeAlert(alertId);
            });
        });

        // Adjust threshold buttons
        this.$$('.adjust-threshold-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const alertId = e.target.getAttribute('data-alert-id');
                this.handleAdjustThreshold(alertId);
            });
        });

        // Dismiss buttons
        this.$$('.dismiss-alert-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const alertId = e.target.getAttribute('data-alert-id');
                this.handleDismissAlert(alertId);
            });
        });
    }

    async onAfterRender() {
        if (this.options.autoRefresh) {
            this.startAutoRefresh();
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

    // Alert level and utility methods
    getAlertLevel(credits) {
        if (credits <= this.alertThresholds.critical) return 'critical';
        if (credits <= this.alertThresholds.warning) return 'warning';
        if (credits <= this.alertThresholds.low) return 'low';
        return 'normal';
    }

    getAlertIcon(level) {
        switch (level) {
            case 'critical': return '🔴';
            case 'warning': return '🟡';
            case 'low': return '🟠';
            default: return '🟢';
        }
    }

    getCriticalCount() {
        return this.alerts.filter(a => a.remaining_credits <= this.alertThresholds.critical).length;
    }

    getWarningCount() {
        return this.alerts.filter(a =>
            a.remaining_credits > this.alertThresholds.critical &&
            a.remaining_credits <= this.alertThresholds.warning
        ).length;
    }

    getLowCount() {
        return this.alerts.filter(a =>
            a.remaining_credits > this.alertThresholds.warning &&
            a.remaining_credits <= this.alertThresholds.low
        ).length;
    }

    groupAlertsByVendor() {
        const grouped = {};
        this.alerts.forEach(alert => {
            const vendorName = alert.vendor_name || 'Unknown Vendor';
            if (!grouped[vendorName]) {
                grouped[vendorName] = [];
            }
            grouped[vendorName].push(alert);
        });
        return grouped;
    }

    calculateUsageRate(alert) {
        // Simple calculation - could be enhanced with historical data
        const totalUsed = alert.total_used_credits || 0;
        const daysSinceFirst = alert.first_purchase_date ?
            Math.max(1, Math.floor((Date.now() - new Date(alert.first_purchase_date)) / (1000 * 60 * 60 * 24))) : 30;

        return (totalUsed / daysSinceFirst).toFixed(1);
    }

    estimateDepletionDate(alert) {
        const usageRate = parseFloat(this.calculateUsageRate(alert));
        if (usageRate <= 0) return 'Unknown';

        const daysRemaining = Math.floor(alert.remaining_credits / usageRate);
        if (daysRemaining <= 0) return 'Immediately';
        if (daysRemaining <= 7) return `${daysRemaining} days`;
        if (daysRemaining <= 30) return `${Math.floor(daysRemaining / 7)} weeks`;
        return `${Math.floor(daysRemaining / 30)} months`;
    }

    setAlertFilter(filter) {
        // Update active filter button
        this.$$('.filter-btn').forEach(btn => btn.classList.remove('active'));
        this.$(`[data-filter="${filter}"]`).classList.add('active');

        // Apply filter
        let filteredAlerts;
        switch (filter) {
            case 'critical':
                filteredAlerts = this.alerts.filter(a => a.remaining_credits <= this.alertThresholds.critical);
                break;
            case 'warning':
                filteredAlerts = this.alerts.filter(a =>
                    a.remaining_credits > this.alertThresholds.critical &&
                    a.remaining_credits <= this.alertThresholds.warning
                );
                break;
            case 'low':
                filteredAlerts = this.alerts.filter(a =>
                    a.remaining_credits > this.alertThresholds.warning &&
                    a.remaining_credits <= this.alertThresholds.low
                );
                break;
            default:
                filteredAlerts = [...this.alerts];
        }

        this.alerts = filteredAlerts;
        this.updateDisplay();
    }

    toggleVendorGroup(vendorName) {
        const servicesList = this.$(`[data-vendor="${vendorName}"]`);
        const button = this.$(`[data-vendor="${vendorName}"]`).previousElementSibling?.querySelector('.collapse-vendor-btn');

        if (servicesList && button) {
            const isCollapsed = servicesList.style.display === 'none';
            servicesList.style.display = isCollapsed ? 'block' : 'none';
            button.textContent = isCollapsed ? '📁 Collapse' : '📂 Expand';
        }
    }

    async updateDisplay() {
        const container = this.$('.alerts-container');
        if (container) {
            container.innerHTML = this.getAlertsContentTemplate();
            this.bindAlertActions();
        }
    }

    // Action handlers
    handleBulkPurchase() {
        this.emit('bulkPurchaseRequested', { alerts: this.alerts });
        console.log('Bulk purchase requested for all alerts');
    }

    handleVendorPurchase(vendorId) {
        this.emit('purchaseCreditsRequested', { vendorId });
        console.log('Purchase credits requested for vendor:', vendorId);
    }

    handlePurchaseCredits(vendorId, serviceName) {
        this.emit('purchaseCreditsRequested', { vendorId, serviceName });
        console.log('Purchase credits requested:', { vendorId, serviceName });
    }

    handleViewHistory(vendorId, serviceName) {
        this.emit('viewHistoryRequested', { vendorId, serviceName });
        console.log('View history requested:', { vendorId, serviceName });
    }

    async handleSnoozeAlert(alertId) {
        const duration = prompt('Snooze for how many hours? (1-168)', '24');
        if (!duration || isNaN(duration)) return;

        try {
            const response = await fetch(`/api/alerts/${alertId}/snooze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hours: parseInt(duration) })
            });

            if (response.ok) {
                this.showSuccessMessage(`Alert snoozed for ${duration} hours`);
                this.refresh();
            }
        } catch (error) {
            this.showErrorMessage('Failed to snooze alert');
        }
    }

    async handleAdjustThreshold(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (!alert) return;

        const newThreshold = prompt(
            `Set new alert threshold for ${alert.service_name}:`,
            alert.alert_threshold || this.alertThresholds.warning
        );

        if (!newThreshold || isNaN(newThreshold)) return;

        try {
            const response = await fetch(`/api/alerts/${alertId}/threshold`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ threshold: parseInt(newThreshold) })
            });

            if (response.ok) {
                this.showSuccessMessage('Alert threshold updated');
                this.refresh();
            }
        } catch (error) {
            this.showErrorMessage('Failed to update alert threshold');
        }
    }

    async handleDismissAlert(alertId) {
        if (!confirm('Are you sure you want to dismiss this alert?')) return;

        try {
            const response = await fetch(`/api/alerts/${alertId}/dismiss`, {
                method: 'POST'
            });

            if (response.ok) {
                this.showSuccessMessage('Alert dismissed');
                this.alerts = this.alerts.filter(a => a.id !== alertId);
                this.updateDisplay();
            }
        } catch (error) {
            this.showErrorMessage('Failed to dismiss alert');
        }
    }

    showSuccessMessage(message) {
        console.log('Success:', message);
        // Integration with notification system
    }

    showErrorMessage(message) {
        console.error('Error:', message);
        // Integration with notification system
    }

    destroy() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        super.destroy();
    }

    // Public API
    async refresh() {
        await this.loadData();
        this.render();
    }

    setThresholds(thresholds) {
        this.alertThresholds = { ...this.alertThresholds, ...thresholds };
        this.render();
    }

    getAlerts() {
        return [...this.alerts];
    }

    getCriticalAlerts() {
        return this.alerts.filter(a => a.remaining_credits <= this.alertThresholds.critical);
    }

    exportAlerts() {
        const csvData = this.generateAlertsCSV();
        this.downloadFile(csvData, `credit-alerts-${Date.now()}.csv`, 'text/csv');
    }

    generateAlertsCSV() {
        const headers = [
            'Vendor', 'Service', 'Remaining Credits', 'Alert Level',
            'Cost per Credit', 'Total Value', 'Last Purchase', 'Usage Rate', 'Est. Depletion'
        ];

        const rows = this.alerts.map(alert => [
            alert.vendor_name,
            alert.service_name,
            alert.remaining_credits,
            this.getAlertLevel(alert.remaining_credits),
            alert.avg_cost_per_credit || 0,
            alert.remaining_credits * (alert.avg_cost_per_credit || 0),
            alert.last_purchase_date || 'Never',
            this.calculateUsageRate(alert),
            this.estimateDepletionDate(alert)
        ]);

        return [headers, ...rows].map(row =>
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
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

window.LowCreditAlertsWidget = LowCreditAlertsWidget;
