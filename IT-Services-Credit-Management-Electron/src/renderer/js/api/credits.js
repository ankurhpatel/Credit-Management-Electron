// Credit management API calls
class CreditsAPI {
    static async loadBalances() {
        try {
            console.log('💳 Loading credit balances...');
            const response = await fetch('/api/credit-balances');
            const balances = await response.json();

            Store.setCreditBalances(balances);
            console.log(`✅ Loaded ${balances.length} credit balances`);
            return balances;
        } catch (error) {
            console.error('❌ Error loading credit balances:', error);
            Alerts.showError('Loading Error', 'Failed to load credit balances');
            return [];
        }
    }

    static async purchaseCredits(purchaseData) {
        try {
            console.log('💸 Recording credit purchase...');

            // Validate purchase data
            const validationResult = Validators.validateCreditPurchase(purchaseData);
            if (!validationResult.isValid) {
                throw new Error(validationResult.errors.join(', '));
            }

            const response = await fetch('/api/vendor-transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(purchaseData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to purchase credits');
            }

            console.log('✅ Credit purchase recorded successfully');

            // Refresh related data
            await Promise.all([
                this.loadBalances(),
                this.loadVendorTransactions(),
                DashboardUI.loadStats()
            ]);

            Alerts.showSuccess('Credits Purchased', result.message);
            return result.transaction;

        } catch (error) {
            console.error('❌ Error purchasing credits:', error);
            Alerts.showError('Credit Purchase Error', error.message);
            throw error;
        }
    }

    static async loadVendorTransactions() {
        try {
            console.log('📊 Loading vendor transactions...');
            const response = await fetch('/api/vendor-transactions');
            const transactions = await response.json();

            Store.setVendorTransactions(transactions);
            console.log(`✅ Loaded ${transactions.length} vendor transactions`);
            return transactions;
        } catch (error) {
            console.error('❌ Error loading vendor transactions:', error);
            Alerts.showError('Loading Error', 'Failed to load vendor transactions');
            return [];
        }
    }

    static getLowCreditAlerts() {
        const balances = Store.getCreditBalances();
        return balances.filter(balance =>
            (balance.remaining_credits || balance.RemainingCredits || 0) < 10
        );
    }

    static calculateCostPerCredit() {
        const transactions = Store.getVendorTransactions();

        if (transactions.length === 0) return 0;

        const totalCost = transactions.reduce((sum, trans) =>
            sum + parseFloat(trans.price_usd || trans.PriceUSD || 0), 0
        );

        const totalCredits = transactions.reduce((sum, trans) =>
            sum + parseInt(trans.credits || trans.Credits || 0), 0
        );

        return totalCredits > 0 ? totalCost / totalCredits : 0;
    }

    static getBalanceForService(vendorId, serviceName) {
        const balances = Store.getCreditBalances();
        return balances.find(balance =>
            (balance.vendor_id || balance.VendorID) === vendorId &&
            (balance.service_name || balance.ServiceName) === serviceName
        );
    }
}

// Make available globally
window.CreditsAPI = CreditsAPI;
