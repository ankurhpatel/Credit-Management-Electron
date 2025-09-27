// Credit display and management UI
class CreditsUI {
    static displayCreditBalances(balances) {
        const containers = [
            document.getElementById('creditBalancesList'),
            document.getElementById('creditBalancesView')
        ];

        containers.forEach(container => {
            if (!container) return;

            if (balances.length === 0) {
                container.innerHTML = '<div class="no-data">No credit balances found. Purchase credits to get started.</div>';
                return;
            }

            container.innerHTML = balances.map(balance => {
                const remainingCredits = balance.remaining_credits || balance.RemainingCredits || 0;
                const alertClass = remainingCredits < 10 ? 'low-credit' : '';

                return `
                    <div class="credit-balance-item ${alertClass}">
                        <div class="balance-header">
                            <h4>${balance.vendor_name || balance.VendorName} - ${balance.service_name || balance.ServiceName}</h4>
                            ${remainingCredits < 10 ? '<div class="low-credit-badge">⚠️ Low</div>' : ''}
                        </div>
                        <div class="balance-details">
                            <strong>💳 Remaining Credits:</strong> ${Formatters.formatNumber(remainingCredits)}<br>
                            <strong>📊 Total Purchased:</strong> ${Formatters.formatNumber(balance.total_purchased || balance.TotalPurchased || 0)}<br>
                            <strong>📈 Total Used:</strong> ${Formatters.formatNumber(balance.total_used || balance.TotalUsed || 0)}<br>
                            <strong>📅 Last Updated:</strong> ${Formatters.formatDate(balance.last_updated || balance.LastUpdated)}
                        </div>
                        ${remainingCredits < 10 ?
                        '<div class="credit-warning">⚠️ <strong>Low Credit Alert:</strong> Consider purchasing more credits</div>' : ''
                    }
                    </div>
                `;
            }).join('');
        });
    }

    static async loadAndDisplayBalances() {
        try {
            const balances = await CreditsAPI.loadBalances();
            this.displayCreditBalances(balances);
        } catch (error) {
            console.error('❌ Error loading credit balances:', error);
        }
    }
}

// Make available globally
window.CreditsUI = CreditsUI;
