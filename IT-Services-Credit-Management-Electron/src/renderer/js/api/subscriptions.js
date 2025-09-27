// Subscription API calls and management
class SubscriptionsAPI {
    static async loadAll() {
        try {
            console.log('📝 Loading subscriptions...');
            const response = await fetch('/api/subscriptions');
            const subscriptions = await response.json();

            Store.setSubscriptions(subscriptions);
            console.log(`✅ Loaded ${subscriptions.length} subscriptions`);
            return subscriptions;
        } catch (error) {
            console.error('❌ Error loading subscriptions:', error);
            Alerts.showError('Loading Error', 'Failed to load subscriptions');
            return [];
        }
    }

    static async add(subscriptionData) {
        try {
            console.log('📝 Adding new subscription...');

            // Validate subscription data
            const validationResult = Validators.validateSubscription(subscriptionData);
            if (!validationResult.isValid) {
                throw new Error(validationResult.errors.join(', '));
            }

            const response = await fetch('/api/subscriptions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(subscriptionData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to add subscription');
            }

            console.log('✅ Subscription added successfully');

            // Refresh related data
            await Promise.all([
                this.loadAll(),
                CreditsAPI.loadBalances(),
                DashboardUI.loadStats()
            ]);

            Alerts.showSuccess('Subscription Added', result.message);
            return result.subscription;

        } catch (error) {
            console.error('❌ Error adding subscription:', error);
            Alerts.showError('Add Subscription Error', error.message);
            throw error;
        }
    }

    static async loadExpiring(days = 30) {
        try {
            const endpoint = days <= 7 ? '/api/subscriptions/weekly-expiring' : '/api/subscriptions/monthly-expiring';
            const response = await fetch(endpoint);
            const expiring = await response.json();

            console.log(`⚠️ Found ${expiring.length} subscriptions expiring in ${days} days`);
            return expiring;
        } catch (error) {
            console.error('❌ Error loading expiring subscriptions:', error);
            return [];
        }
    }

    static async loadCustomerSales() {
        try {
            const response = await fetch('/api/customer-sales');
            const customerSales = await response.json();

            console.log('💰 Customer sales data loaded');
            return customerSales;
        } catch (error) {
            console.error('❌ Error loading customer sales:', error);
            Alerts.showError('Loading Error', 'Failed to load customer sales');
            return {};
        }
    }

    static calculateExpirationDate(startDate, months) {
        if (!startDate || !months) return null;

        const start = new Date(startDate);
        const expiration = new Date(start);
        expiration.setMonth(expiration.getMonth() + parseInt(months));
        expiration.setDate(expiration.getDate() - 1); // End on last day

        return expiration.toISOString().split('T')[0];
    }

    static getExpirationStatus(expirationDate) {
        const days = Helpers.calculateDaysUntilExpiration(expirationDate);

        if (days === null) return 'unknown';
        if (days < 0) return 'expired';
        if (days <= 7) return 'critical';
        if (days <= 30) return 'warning';
        return 'good';
    }
}

// Make available globally
window.SubscriptionsAPI = SubscriptionsAPI;
