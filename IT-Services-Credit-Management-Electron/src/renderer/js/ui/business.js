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
            <div style="background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%); color: white; padding: 30px; border-radius: 16px; text-align: center; margin-bottom: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.7; margin-bottom: 10px; font-weight: 700;">Current Business Balance</div>
                <div style="font-size: 42px; font-weight: 800; color: #48bb78;">${Formatters.formatCurrency(data.balance)}</div>
            </div>
            <div style="display: grid; gap: 12px;">
        `;

        html += data.transactions.map(trans => {
            const isDeposit = (trans.type || trans.Type) === 'add';
            const icon = isDeposit ? '💰' : '💸';
            const color = isDeposit ? '#38a169' : '#e53e3e';
            const bgColor = isDeposit ? '#f0fff4' : '#fff5f5';
            
            return `
                <div class="transaction-item" style="background: white; border: 1px solid #edf2f7; border-radius: 12px; padding: 15px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="font-size: 24px; background: ${bgColor}; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 10px;">${icon}</div>
                        <div>
                            <div style="font-weight: 700; color: #2d3748; font-size: 15px;">${trans.description || 'No description'}</div>
                            <div style="font-size: 12px; color: #a0aec0;">${Formatters.formatDate(trans.transaction_date || trans.Date)}</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 18px; font-weight: 800; color: ${color};">
                            ${isDeposit ? '+' : '-'}${Formatters.formatCurrency(trans.amount || trans.Amount)}
                        </div>
                        <div style="font-size: 10px; color: #a0aec0; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">
                            ${isDeposit ? 'Deposit' : 'Withdrawal'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

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
