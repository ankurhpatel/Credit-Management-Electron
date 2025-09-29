class ExpiringAlertsWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.weeklyExpiring = [];
        this.monthlyExpiring = [];
    }

    async loadData() {
        try {
            this.log('Loading expiring subscriptions...');

            const [weeklyResponse, monthlyResponse] = await Promise.all([
                fetch('/api/subscriptions/weekly-expiring'),
                fetch('/api/subscriptions/monthly-expiring')
            ]);

            if (!weeklyResponse.ok || !monthlyResponse.ok) {
                throw new Error('Failed to fetch expiring subscriptions');
            }

            this.weeklyExpiring = await weeklyResponse.json();
            this.monthlyExpiring = await monthlyResponse.json();

            this.log(`Loaded ${this.weeklyExpiring.length} weekly and ${this.monthlyExpiring.length} monthly expiring subscriptions`);
        } catch (error) {
            this.handleError('Failed to load expiring subscriptions', error);
        }
    }

    async getTemplate() {
        return `
            <div class="expiring-alerts">
                <h3>⚠️ Expiring This Week</h3>
                <div class="expiring-list" id="weeklyExpiringList">
                    ${this.getExpiringList(this.weeklyExpiring, true)}
                </div>

                <h3>📅 Expiring This Month</h3>
                <div class="expiring-list" id="monthlyExpiringList">
                    ${this.getExpiringList(this.monthlyExpiring, false)}
                </div>
            </div>
        `;
    }

    getExpiringList(subscriptions, isCritical = false) {
        if (!subscriptions || subscriptions.length === 0) {
            return '<div class="no-expiring">No subscriptions expiring in this period</div>';
        }

        return subscriptions.map(sub => {
            const daysUntilExpiry = this.getDaysUntilExpiry(sub.expiration_date);
            return `
                <div class="expiring-item ${isCritical ? 'critical' : 'warning'}">
                    <div class="expiring-customer">
                        <strong>${sub.customer_name}</strong>
                        <span class="expiring-service">${sub.service_name}</span>
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
                            Credits: ${sub.credits_used} months<br>
                            Amount: ${this.formatCurrency(sub.amount_paid)}
                            ${sub.mac_address ? `<br>MAC: ${sub.mac_address}` : ''}
                        </div>
                        <div class="expiring-actions">
                            <button class="btn-small btn-primary" onclick="this.renewSubscription('${sub.id}')">
                                🔄 Renew
                            </button>
                            <button class="btn-small btn-info" onclick="this.contactCustomer('${sub.customer_email}')">
                                📧 Contact
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getDaysUntilExpiry(expirationDate) {
        const today = new Date();
        const expiry = new Date(expirationDate);
        const diffTime = expiry - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    bindEvents() {
        // Handle renew subscription
        window.renewSubscription = (subscriptionId) => {
            console.log('Renewing subscription:', subscriptionId);
            // Navigate to add subscription with pre-filled data
            WidgetManager.showTab('customers');
        };

        // Handle contact customer
        window.contactCustomer = (customerEmail) => {
            console.log('Contacting customer:', customerEmail);
            window.open(`mailto:${customerEmail}?subject=Subscription Renewal Reminder`);
        };
    }
}

window.ExpiringAlertsWidget = ExpiringAlertsWidget;
