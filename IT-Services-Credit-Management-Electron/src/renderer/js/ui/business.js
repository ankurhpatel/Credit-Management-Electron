// Business management UI
class BusinessUI {
    static displayTransactions(data) {
        const container = document.getElementById('businessTransactionsList');
        if (!container) return;

        if (!data.transactions || data.transactions.length === 0) {
            container.innerHTML = '<div class="no-data">No business transactions recorded yet.</div>';
            return;
        }

        let html = `
            <div class="business-balance">
                <h4>Current Business Balance: ${Formatters.formatCurrency(data.balance)}</h4>
            </div>
            <div class="transactions-list">
        `;

        html += data.transactions.map(trans => `
            <div class="transaction-item ${trans.type || trans.Type}">
                <div class="transaction-header">
                    <span class="transaction-type">${(trans.type || trans.Type) === 'add' ? '💰 Deposit' : '💸 Withdrawal'}</span>
                    <span class="transaction-amount ${(trans.type || trans.Type) === 'add' ? 'success' : 'danger'}">
                        ${(trans.type || trans.Type) === 'add' ? '+' : '-'}${Formatters.formatCurrency(trans.amount || trans.Amount)}
                    </span>
                </div>
                <div class="transaction-details">
                    <strong>📅 Date:</strong> ${Formatters.formatDate(trans.transaction_date || trans.Date)}<br>
                    <strong>📝 Description:</strong> ${trans.description || trans.Description || 'No description'}
                </div>
            </div>
        `).join('');

        html += '</div>';
        container.innerHTML = html;
    }

    static async loadAndDisplayTransactions() {
        try {
            const data = await BusinessAPI.loadTransactions();
            this.displayTransactions(data);
        } catch (error) {
            console.error('❌ Error loading business transactions:', error);
        }
    }
}

// Make available globally
window.BusinessUI = BusinessUI;
