class ExpiringAlertsWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.weeklyExpiring = [];
        this.monthlyExpiring = [];
    }

    async loadData() {
        try {
            this.log('Loading expiring subscriptions...');

            // Use Express API endpoints (works in both Electron and browser)
            const API_BASE = 'http://localhost:3001/api';

            const [weeklyResponse, monthlyResponse] = await Promise.all([
                fetch(`${API_BASE}/subscriptions/weekly-expiring`),
                fetch(`${API_BASE}/subscriptions/monthly-expiring`)
            ]);

            if (!weeklyResponse.ok || !monthlyResponse.ok) {
                // Log detailed error information
                const weeklyError = weeklyResponse.ok ? 'OK' : `${weeklyResponse.status} - ${weeklyResponse.statusText}`;
                const monthlyError = monthlyResponse.ok ? 'OK' : `${monthlyResponse.status} - ${monthlyResponse.statusText}`;

                console.error('API Response Status:', {
                    weekly: weeklyError,
                    monthly: monthlyError
                });

                throw new Error(`API Error - Weekly: ${weeklyError}, Monthly: ${monthlyError}`);
            }

            this.weeklyExpiring = await weeklyResponse.json();
            this.monthlyExpiring = await monthlyResponse.json();

            this.log(`✅ Loaded ${this.weeklyExpiring.length} weekly and ${this.monthlyExpiring.length} monthly expiring subscriptions`);
        } catch (error) {
            this.handleError('Failed to load expiring subscriptions', error);

            // Set fallback mock data so widget still shows something
            this.weeklyExpiring = [
                {
                    id: 'demo1',
                    customer_name: 'Sample Customer',
                    service_name: 'Premium IPTV Demo',
                    expiration_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                    classification: 'Premium',
                    credits_used: 12,
                    amount_paid: 120,
                    customer_email: 'demo@example.com',
                    mac_address: '00:1A:79:12:34:56'
                }
            ];
            this.monthlyExpiring = [
                {
                    id: 'demo2',
                    customer_name: 'Demo Customer 2',
                    service_name: 'Basic IPTV Demo',
                    expiration_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
                    classification: 'Basic',
                    credits_used: 6,
                    amount_paid: 60,
                    customer_email: 'demo2@example.com'
                }
            ];
        }
    }

    async getTemplate() {
        return `
            <div class="expiring-alerts">
                <div class="alerts-header">
                    <h3>⚠️ Expiring This Week</h3>
                    <span class="badge">${this.weeklyExpiring.length}</span>
                </div>
                <div class="expiring-list weekly-list" id="weeklyExpiringList">
                    ${this.getExpiringList(this.weeklyExpiring, true)}
                </div>

                <div class="alerts-header">
                    <h3>📅 Expiring This Month</h3>
                    <span class="badge">${this.monthlyExpiring.length}</span>
                </div>
                <div class="expiring-list monthly-list" id="monthlyExpiringList">
                    ${this.getExpiringList(this.monthlyExpiring, false)}
                </div>
                
                <div class="alerts-footer">
                    <small>Last updated: ${new Date().toLocaleString()}</small>
                    <button class="btn btn-refresh" onclick="window.widgetManager?.getWidget('dashboard-alerts')?.refresh()">
                        🔄 Refresh Alerts
                    </button>
                </div>
            </div>
        `;
    }

    getExpiringList(subscriptions, isCritical = false) {
        if (!subscriptions || subscriptions.length === 0) {
            const message = isCritical ? 'No subscriptions expiring this week' : 'No subscriptions expiring this month';
            return `<div class="no-expiring">✅ ${message}</div>`;
        }

        return subscriptions.map(sub => {
            const daysUntilExpiry = this.getDaysUntilExpiry(sub.expiration_date);
            const urgentClass = daysUntilExpiry <= 3 ? 'urgent' : '';

            return `
                <div class="expiring-item ${isCritical ? 'critical' : 'warning'} ${urgentClass}">
                    <div class="expiring-header">
                        <div class="expiring-customer">
                            <strong class="customer-name">${sub.customer_name || 'Unknown Customer'}</strong>
                            <span class="service-name">${sub.service_name || 'Unknown Service'}</span>
                        </div>
                        <div class="expiring-countdown ${urgentClass}">
                            <span class="days-number">${daysUntilExpiry}</span>
                            <span class="days-label">days left</span>
                        </div>
                    </div>
                    
                    <div class="expiring-details">
                        <div class="detail-row">
                            <span class="detail-label">Expires:</span>
                            <span class="detail-value">${this.formatDate(sub.expiration_date)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Type:</span>
                            <span class="detail-value">${sub.classification || 'General'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Credits:</span>
                            <span class="detail-value">${sub.credits_used || 0} months</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Amount:</span>
                            <span class="detail-value">${this.formatCurrency(sub.amount_paid || 0)}</span>
                        </div>
                        ${sub.mac_address ? `
                        <div class="detail-row">
                            <span class="detail-label">MAC:</span>
                            <span class="detail-value mac-address">${sub.mac_address}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="expiring-actions">
                        <button class="btn btn-sm btn-primary" onclick="renewSubscription('${sub.id}')">
                            🔄 Renew
                        </button>
                        <button class="btn btn-sm btn-info" onclick="contactCustomer('${sub.customer_email || ''}', '${sub.customer_name || ''}')">
                            📧 Contact
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="viewCustomer('${sub.customer_id || sub.id}')">
                            👤 View
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    getDaysUntilExpiry(expirationDate) {
        if (!expirationDate) return 0;

        const today = new Date();
        const expiry = new Date(expirationDate);
        const diffTime = expiry - today;
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, days);
    }

    async onAfterRender() {
        this.bindEvents();
        this.addExpiredHighlight();
    }

    bindEvents() {
        // Handle renew subscription
        window.renewSubscription = (subscriptionId) => {
            console.log('🔄 Renewing subscription:', subscriptionId);
            this.showNotification('Renewal Process', `Starting renewal for subscription ${subscriptionId}`, 'info');

            // TODO: Navigate to renewal form or open modal
            // For now, show success message
            setTimeout(() => {
                this.showNotification('Renewal Started', 'Renewal process initiated successfully!', 'success');
            }, 1000);
        };

        // Handle contact customer
        window.contactCustomer = (customerEmail, customerName) => {
            if (!customerEmail || customerEmail === '') {
                this.showNotification('Contact Error', 'No email address available for this customer', 'warning');
                return;
            }

            console.log('📧 Contacting customer:', customerEmail);

            const subject = encodeURIComponent('Subscription Renewal Reminder');
            const body = encodeURIComponent(`Dear ${customerName || 'Valued Customer'},

Your subscription is expiring soon. Please contact us to renew your service.

Thank you for choosing our services!

Best regards,
IT Services Team`);

            const mailtoLink = `mailto:${customerEmail}?subject=${subject}&body=${body}`;
            window.open(mailtoLink);

            this.showNotification('Email Opened', `Email client opened for ${customerName || customerEmail}`, 'info');
        };

        // Handle view customer details
        window.viewCustomer = (customerId) => {
            console.log('👤 Viewing customer:', customerId);
            this.showNotification('Customer Details', `Loading details for customer ${customerId}`, 'info');

            // TODO: Navigate to customer details page
            // For now, just show notification
        };
    }

    addExpiredHighlight() {
        // Add special styling for urgent items
        const urgentItems = this.$$('.expiring-item.urgent');
        urgentItems.forEach(item => {
            item.style.border = '2px solid #dc3545';
            item.style.boxShadow = '0 0 10px rgba(220, 53, 69, 0.3)';
        });
    }

    showNotification(title, message, type = 'info') {
        const iconMap = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };

        const icon = iconMap[type] || 'ℹ️';
        console.log(`${icon} ${title}: ${message}`);

        // TODO: Implement actual toast notification system
        // For now, just console logging
    }
}

window.ExpiringAlertsWidget = ExpiringAlertsWidget;
