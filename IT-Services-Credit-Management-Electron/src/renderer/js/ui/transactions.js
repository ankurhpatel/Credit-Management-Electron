// Transaction history UI management
class TransactionUI {
    static async loadVendorTransactions() {
        try {
            const transactions = await CreditsAPI.loadVendorTransactions();
            this.displayVendorTransactions(transactions);
        } catch (error) {
            console.error('❌ Error loading vendor transactions:', error);
        }
    }

    static displayVendorTransactions(transactions) {
        const container = document.getElementById('vendorTransactionsList');
        if (!container) return;

        if (transactions.length === 0) {
            container.innerHTML = '<div class="no-data">No vendor transactions found.</div>';
            return;
        }

        container.innerHTML = transactions.map(trans => `
            <div class="transaction-item">
                <div class="transaction-header">
                    <h4>${trans.vendor_name || trans.VendorName} - ${trans.service_name || trans.ServiceName}</h4>
                </div>
                <div class="transaction-details">
                    <strong>📅 Date:</strong> ${Formatters.formatDate(trans.purchase_date || trans.PurchaseDate)}<br>
                    <strong>💰 Cost:</strong> ${Formatters.formatCurrency(trans.price_usd || trans.PriceUSD)} USD<br>
                    <strong>💳 Credits:</strong> ${Formatters.formatNumber(trans.credits || trans.Credits)}<br>
                    ${(trans.notes || trans.Notes) ? `<strong>📝 Notes:</strong> <em>${trans.notes || trans.Notes}</em>` : ''}
                </div>
            </div>
        `).join('');
    }

    static async loadCustomerSales() {
        try {
            const customerSales = await SubscriptionsAPI.loadCustomerSales();
            this.displayCustomerSales(customerSales);
        } catch (error) {
            console.error('❌ Error loading customer sales:', error);
        }
    }

    static displayCustomerSales(customerSales) {
        const container = document.getElementById('customerSalesList');
        if (!container) return;

        if (Object.keys(customerSales).length === 0) {
            container.innerHTML = '<div class="no-data">No customer sales found.</div>';
            return;
        }

        let html = '';
        Object.entries(customerSales).forEach(([customerName, customerData]) => {
            html += `
                <div class="customer-sales-group">
                    <h4>👤 ${customerName}</h4>
            `;

            Object.entries(customerData.classifications || {}).forEach(([classification, subs]) => {
                const totalAmount = subs.reduce((sum, sub) => sum + parseFloat(sub.amount_paid || sub.AmountPaid || 0), 0);
                const totalMonths = subs.reduce((sum, sub) => sum + parseInt(sub.credits_used || sub.CreditsUsed || 0), 0);
                const latestDate = Math.max(...subs.map(s => new Date(s.start_date || s.StartDate)));

                html += `
                    <div class="classification-group">
                        <div class="classification-header">
                            <h5>📍 ${classification}</h5>
                            <div class="classification-summary">
                                <strong>Services:</strong> ${subs.length} | 
                                <strong>Total Months:</strong> ${totalMonths} | 
                                <strong>Latest:</strong> ${Formatters.formatDate(new Date(latestDate))} |
                                <strong>Total Amount:</strong> ${Formatters.formatCurrency(totalAmount)}
                            </div>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
        });

        container.innerHTML = html;
    }
}

// Make available globally
window.TransactionUI = TransactionUI;
