// Subscription API calls and management
class SubscriptionsAPI {
    static async loadAll() {
        try {
            console.log('📝 Loading subscriptions...');
            const response = await fetch('/api/subscriptions');
            const subscriptions = await response.json();

            if (Array.isArray(subscriptions)) {
                Store.setSubscriptions(subscriptions);
                console.log(`✅ Loaded ${subscriptions.length} subscriptions`);
                return subscriptions;
            }
            return [];
        } catch (error) {
            console.error('❌ Error loading subscriptions:', error);
            return [];
        }
    }

    static async add(subscriptionData) {
        try {
            const response = await fetch('/api/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscriptionData)
            });
            return await response.json();
        } catch (error) {
            console.error('❌ Error adding subscription:', error);
            throw error;
        }
    }

    static async loadExpiring(days = 30) {
        try {
            const endpoint = days <= 7 ? '/api/subscriptions/weekly-expiring' : '/api/subscriptions/monthly-expiring';
            const response = await fetch(endpoint);
            const expiring = await response.json();

            // Safety check: ensure expiring is an array
            const list = Array.isArray(expiring) ? expiring : [];
            console.log(`⚠️ Found ${list.length} subscriptions expiring soon`);
            return list;
        } catch (error) {
            console.error('❌ Error loading expiring subscriptions:', error);
            return [];
        }
    }

    static async loadCustomerSales() {
        try {
            const response = await fetch('/api/customer-sales');
            return await response.json();
        } catch (error) {
            console.error('❌ Error loading customer sales:', error);
            return {};
        }
    }

    static calculateExpirationDate(startDate, months) {
        if (!startDate || !months) return null;
        const start = new Date(startDate);
        const expiration = new Date(start);
        expiration.setMonth(expiration.getMonth() + parseInt(months));
        expiration.setDate(expiration.getDate() - 1);
        return expiration.toISOString().split('T')[0];
    }
}

window.SubscriptionsAPI = SubscriptionsAPI;