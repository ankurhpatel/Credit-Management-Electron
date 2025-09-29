class ExpiringAlertsWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.weeklyExpiring = [];
        this.monthlyExpiring = [];
    }

    async loadData() {
        try {
            this.log('Loading expiring subscriptions...');

            // Use IPC instead of HTTP fetch
            if (window.require) {
                const { ipcRenderer } = window.require('electron');

                // Get expiring subscriptions via IPC
                const expiringData = await ipcRenderer.invoke('db-get-expiring-subscriptions');

                this.weeklyExpiring = expiringData.weeklyExpiring || [];
                this.monthlyExpiring = expiringData.monthlyExpiring || [];
            } else {
                // Fallback mock data for browser testing
                this.weeklyExpiring = [
                    {
                        id: 1,
                        customer_name: 'John Doe',
                        service_name: 'Premium IPTV',
                        expiration_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                        classification: 'Premium',
                        credits_used: 12,
                        amount_paid: 120,
                        customer_email: 'john@example.com'
                    }
                ];
                this.monthlyExpiring = [
                    {
                        id: 2,
                        customer_name: 'Jane Smith',
                        service_name: 'Basic IPTV',
                        expiration_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
                        classification: 'Basic',
                        credits_used: 6,
                        amount_paid: 60,
                        customer_email: 'jane@example.com'
                    }
                ];
            }

            this.log(`Loaded ${this.weeklyExpiring.length} weekly and ${this.monthlyExpiring.length} monthly expiring subscriptions`);
        } catch (error) {
            this.handleError('Failed to load expiring subscriptions', error);
            // Set empty arrays to prevent errors
            this.weeklyExpiring = [];
            this.monthlyExpiring = [];
        }
    }

    async getTemplate() {
        return `
            <div class="expiring-alerts">
                <h3>⚠️ Expiring This Week (${this.weeklyExpiring.length})</h3>
                <div class="expiring-list" id="weeklyExpiringList">
                    ${this.getExpiringList(this.weeklyExpiring, true)}
                </div>

                <h3>📅 Expiring This Month (${this.monthlyExpiring.length})</h3>
                <div class="expiring-list" id="monthlyExpiringList">
                    ${this.getExpiringList(this.monthlyExpiring, false)}
                </div>
                
                <div class="alerts-footer">
                    <small>Last updated: ${new Date().toLocaleString()}</small>
                    <button class="btn-refresh" onclick="window.widgetManager?.getWidget('dashboard-alerts')?.refresh()">🔄 Refresh</button>
                </div>
            </div>
        `;
    }

    getExpiringList(subscriptions, isCritical = false) {
        if (!subscriptions || subscriptions.length === 0) {
            const message = isCritical ? 'No subscriptions expiring this week' : 'No subscriptions expiring this month';
            return `<div class="no-expiring">${message} ✅</div>`;
        }

        return subscriptions.map(sub => {
            const daysUntilExpiry = this.getDaysUntilExpiry(sub.expiration_date);
            return `
                <div class="expiring-item ${isCritical ? 'critical' : 'warning'}">
                    <div class="expiring-customer">
                        <strong>${sub.customer_name || 'Unknown Customer'}</strong>
                        <span class="expiring-service">${sub.service_name || 'Unknown Service'}</span>
                    </div>
                    <div class="expiring-details">
                        <div class="expiring-date">
                            Expires: ${this.formatDate(sub.expiration_date)}
                        </div>
                        <div class="expiring-countdown ${daysUntilExpiry <= 3 ? 'urgent' : ''}">
                            ${daysUntilExpiry} days remaining
                        </div>
                        <div class="expiring-info">
                            Classification: ${sub.classification || 'General'}<br>
                            Credits: ${sub.credits_used || 0} months<br>
                            Amount: ${this.formatCurrency(sub.amount_paid || 0)}
                            ${sub.mac_address ? `<br>MAC: ${sub.mac_address}` : ''}
                        </div>
                        <div class="expiring-actions">
                            <button class="btn-small btn-primary" onclick="renewSubscription('${sub.id}')">
                                🔄 Renew
                            </button>
                            <button class="btn-small btn-info" onclick="contactCustomer('${sub.customer_email || ''}')">
                                📧 Contact
                            </button>
                        </div>
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
        return Math.max(0, days); // Don't return negative days
    }

    async onAfterRender() {
        this.bindEvents();
    }

    bindEvents() {
        // Handle renew subscription
        window.renewSubscription = (subscriptionId) => {
            console.log('Renewing subscription:', subscriptionId);
            this.showNotification('Renewal Started', `Processing renewal for subscription ${subscriptionId}`, 'info');
            // You can add actual renewal logic here
        };

        // Handle contact customer
        window.contactCustomer = (customerEmail) => {
            if (!customerEmail) {
                this.showNotification('Contact Error', 'No email address available for this customer', 'warning');
                return;
            }
            console.log('Contacting customer:', customerEmail);
            window.open(`mailto:${customerEmail}?subject=Subscription Renewal Reminder&body=Dear Customer,%0D%0A%0D%0AYour subscription is expiring soon. Please contact us to renew.%0D%0A%0D%0ABest regards,%0D%0AIT Services Team`);
        };
    }

    showNotification(title, message, type = 'info') {
        // Simple notification
        console.log(`📢 ${type.toUpperCase()}: ${title} - ${message}`);
    }
}

window.ExpiringAlertsWidget = ExpiringAlertsWidget;
