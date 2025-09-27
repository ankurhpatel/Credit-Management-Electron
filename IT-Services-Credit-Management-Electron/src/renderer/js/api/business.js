// Business transactions API calls
class BusinessAPI {
    static async loadTransactions() {
        try {
            console.log('💼 Loading business transactions...');
            const response = await fetch('/api/business/transactions');
            const data = await response.json();

            Store.setBusinessTransactions(data.transactions);
            Store.setBusinessBalance(data.balance);

            console.log(`✅ Loaded ${data.transactions.length} business transactions`);
            return data;
        } catch (error) {
            console.error('❌ Error loading business transactions:', error);
            Alerts.showError('Loading Error', 'Failed to load business transactions');
            return { transactions: [], balance: 0 };
        }
    }

    static async addMoney(transactionData) {
        try {
            console.log('💰 Adding money to business...');

            // Validate transaction data
            const validationResult = Validators.validateBusinessTransaction(transactionData);
            if (!validationResult.isValid) {
                throw new Error(validationResult.errors.join(', '));
            }

            const response = await fetch('/api/business/add-money', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(transactionData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to add money');
            }

            console.log('✅ Money added successfully');

            // Refresh business data
            await Promise.all([
                this.loadTransactions(),
                DashboardUI.loadStats()
            ]);

            Alerts.showSuccess('Money Added', result.message);
            return result.transaction;

        } catch (error) {
            console.error('❌ Error adding money:', error);
            Alerts.showError('Add Money Error', error.message);
            throw error;
        }
    }

    static async withdrawMoney(transactionData) {
        try {
            console.log('💸 Withdrawing money from business...');

            // Validate transaction data
            const validationResult = Validators.validateBusinessTransaction(transactionData);
            if (!validationResult.isValid) {
                throw new Error(validationResult.errors.join(', '));
            }

            const response = await fetch('/api/business/withdraw-money', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(transactionData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to withdraw money');
            }

            console.log('✅ Money withdrawn successfully');

            // Refresh business data
            await Promise.all([
                this.loadTransactions(),
                DashboardUI.loadStats()
            ]);

            Alerts.showSuccess('Money Withdrawn', result.message);
            return result.transaction;

        } catch (error) {
            console.error('❌ Error withdrawing money:', error);
            Alerts.showError('Withdraw Money Error', error.message);
            throw error;
        }
    }

    static getCurrentBalance() {
        return Store.getBusinessBalance();
    }

    static calculateNetCashFlow() {
        const transactions = Store.getBusinessTransactions();

        const deposits = transactions
            .filter(t => (t.type || t.Type) === 'add')
            .reduce((sum, t) => sum + parseFloat(t.amount || t.Amount || 0), 0);

        const withdrawals = transactions
            .filter(t => (t.type || t.Type) === 'withdraw')
            .reduce((sum, t) => sum + parseFloat(t.amount || t.Amount || 0), 0);

        return { deposits, withdrawals, netFlow: deposits - withdrawals };
    }
}

// Make available globally
window.BusinessAPI = BusinessAPI;
