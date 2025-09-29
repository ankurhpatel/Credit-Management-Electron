class QuickActionsWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showCustomerActions: true,
            showVendorActions: true,
            showReportActions: true
        };
    }

    async getTemplate() {
        return `
            <div class="quick-actions-section">
                <h3>⚡ Quick Actions</h3>
                <div class="quick-actions-grid">
                    ${this.options.showCustomerActions ? this.getCustomerActions() : ''}
                    ${this.options.showVendorActions ? this.getVendorActions() : ''}
                    ${this.options.showReportActions ? this.getReportActions() : ''}
                </div>
            </div>
        `;
    }

    getCustomerActions() {
        return `
            <div class="quick-action-group">
                <h4>👥 Customer Actions</h4>
                <button class="quick-action-btn" data-action="add-customer">
                    <span class="action-icon">➕</span>
                    <span class="action-label">Add Customer</span>
                </button>
                <button class="quick-action-btn" data-action="add-subscription">
                    <span class="action-icon">📝</span>
                    <span class="action-label">New Subscription</span>
                </button>
                <button class="quick-action-btn" data-action="search-customer">
                    <span class="action-icon">🔍</span>
                    <span class="action-label">Search Customer</span>
                </button>
            </div>
        `;
    }

    getVendorActions() {
        return `
            <div class="quick-action-group">
                <h4>🏭 Vendor Actions</h4>
                <button class="quick-action-btn" data-action="purchase-credits">
                    <span class="action-icon">💸</span>
                    <span class="action-label">Buy Credits</span>
                </button>
                <button class="quick-action-btn" data-action="add-vendor">
                    <span class="action-icon">🏪</span>
                    <span class="action-label">Add Vendor</span>
                </button>
                <button class="quick-action-btn" data-action="check-balances">
                    <span class="action-icon">💳</span>
                    <span class="action-label">Check Balances</span>
                </button>
            </div>
        `;
    }

    getReportActions() {
        return `
            <div class="quick-action-group">
                <h4>📊 Reports</h4>
                <button class="quick-action-btn" data-action="monthly-pl">
                    <span class="action-icon">📈</span>
                    <span class="action-label">Monthly P&L</span>
                </button>
                <button class="quick-action-btn" data-action="customer-sales">
                    <span class="action-icon">💰</span>
                    <span class="action-label">Sales Report</span>
                </button>
                <button class="quick-action-btn" data-action="print-receipts">
                    <span class="action-icon">🖨️</span>
                    <span class="action-label">Print Receipts</span>
                </button>
            </div>
        `;
    }

    bindEvents() {
        const actionButtons = this.$$('.quick-action-btn');
        actionButtons.forEach(button => {
            this.addEventListener(button, 'click', (e) => {
                const action = e.currentTarget.getAttribute('data-action');
                this.handleQuickAction(action);
            });
        });
    }

    handleQuickAction(action) {
        console.log(`Quick action triggered: ${action}`);

        switch (action) {
            case 'add-customer':
                WidgetManager.showTab('customers');
                break;
            case 'add-subscription':
                WidgetManager.showTab('customers');
                break;
            case 'search-customer':
                WidgetManager.showTab('customers');
                break;
            case 'purchase-credits':
                WidgetManager.showTab('vendors');
                break;
            case 'add-vendor':
                WidgetManager.showTab('vendors');
                break;
            case 'check-balances':
                WidgetManager.showTab('credits');
                break;
            case 'monthly-pl':
                WidgetManager.showTab('pnl');
                break;
            case 'customer-sales':
                WidgetManager.showTab('transactions');
                break;
            case 'print-receipts':
                this.openPrintDialog();
                break;
            default:
                console.warn(`Unknown quick action: ${action}`);
        }

        this.emit('quickActionTriggered', { action });
    }

    openPrintDialog() {
        // Implementation for print dialog
        console.log('Opening print dialog...');
    }
}

window.QuickActionsWidget = QuickActionsWidget;
