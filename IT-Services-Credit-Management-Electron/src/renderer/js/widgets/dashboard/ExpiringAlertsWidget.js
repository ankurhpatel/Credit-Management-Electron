class ExpiringAlertsWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.weeklyExpiring = [];
        this.monthlyExpiring = [];
    }

    async loadData() {
        try {
            this.log('Loading expiring subscriptions...');

            // Use correct port 3001 for API calls
            const API_BASE = 'http://localhost:3001/api';

            const [weeklyResponse, monthlyResponse] = await Promise.all([
                fetch(`${API_BASE}/subscriptions/weekly-expiring`),
                fetch(`${API_BASE}/subscriptions/monthly-expiring`)
            ]);

            if (!weeklyResponse.ok || !monthlyResponse.ok) {
                throw new Error('Failed to fetch expiring subscriptions');
            }

            this.weeklyExpiring = await weeklyResponse.json();
            this.monthlyExpiring = await monthlyResponse.json();

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
            </div>
        `;
    }

    getExpiringList(subscriptions, isCritical = false) {
        if (!subscriptions || subscriptions.length === 0) {
            const message = isCritical ? 'No subscriptions expiring this week' : 'No subscriptions expiring this month';
            return `<div class="no-expiring">${message}</div>`;
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
                        <div class="expiring-countdown">
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
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    async onAfterRender() {
        this.bindEvents();
    }

    bindEvents() {
        // Handle renew subscription
        window.renewSubscription = (subscriptionId) => {
            console.log('Renewing subscription:', subscriptionId);
            // Navigate to customers tab
            if (window.WidgetManager && window.WidgetManager.showTab) {
                window.WidgetManager.showTab('customers');
            }
        };

        // Handle contact customer
        window.contactCustomer = (customerEmail) => {
            if (!customerEmail) {
                console.warn('No email provided for customer contact');
                return;
            }
            console.log('Contacting customer:', customerEmail);
            window.open(`mailto:${customerEmail}?subject=Subscription Renewal Reminder`);
        };
    }
}

window.ExpiringAlertsWidget = ExpiringAlertsWidget;
