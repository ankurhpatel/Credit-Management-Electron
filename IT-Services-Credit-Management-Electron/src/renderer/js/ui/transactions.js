// Transaction history UI management
class TransactionUI {
    static async loadVendorTransactions() {
        try {
            console.log('🏭 Loading vendor transactions...');
            const container = document.getElementById('vendorTransactionsList');
            if (container) {
                container.innerHTML = '<div class="loading-message">Loading vendor transactions...</div>';
            }
            
            const transactions = await CreditsAPI.loadVendorTransactions();
            this.displayVendorTransactions(transactions);
            
            console.log(`✅ Loaded ${transactions.length} vendor transactions`);
        } catch (error) {
            console.error('❌ Error loading vendor transactions:', error);
            const container = document.getElementById('vendorTransactionsList');
            if (container) {
                container.innerHTML = `
                    <div class="error-message">
                        <h4>❌ Failed to Load Vendor Transactions</h4>
                        <p>Error: ${error.message}</p>
                        <button onclick="TransactionUI.loadVendorTransactions()" class="btn btn-primary">Retry</button>
                    </div>
                `;
            }
            
            if (window.Alerts) {
                Alerts.showError('Loading Error', 'Failed to load vendor transactions');
            }
        }
    }

    static displayVendorTransactions(transactions) {
        const container = document.getElementById('vendorTransactionsList');
        if (!container) {
            console.warn('⚠️ Vendor transactions container not found');
            return;
        }

        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <h4>📋 No Vendor Transactions Found</h4>
                    <p>No vendor purchase transactions have been recorded yet.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = transactions.map(trans => `
            <div class="transaction-item">
                <div class="transaction-header">
                    <h4>${trans.vendor_name || trans.VendorName || 'Unknown Vendor'} - ${trans.service_name || trans.ServiceName || 'Unknown Service'}</h4>
                </div>
                <div class="transaction-details">
                    <strong>📅 Date:</strong> ${this.formatDate(trans.purchase_date || trans.PurchaseDate)}<br>
                    <strong>💰 Cost:</strong> ${this.formatCurrency(trans.price_usd || trans.PriceUSD)} USD<br>
                    <strong>💳 Credits:</strong> ${this.formatNumber(trans.credits || trans.Credits)}<br>
                    ${(trans.notes || trans.Notes) ? `<strong>📝 Notes:</strong> <em>${trans.notes || trans.Notes}</em>` : ''}
                </div>
            </div>
        `).join('');
    }

    static async loadCustomerSales() {
        try {
            console.log('📊 Loading customer sales...');
            const container = document.getElementById('customerSalesList');
            if (container) {
                container.innerHTML = '<div class="loading-message">Loading customer sales...</div>';
            }
            
            const customerSales = await SubscriptionsAPI.loadCustomerSales();
            this.displayCustomerSales(customerSales);
            
            const customerCount = Object.keys(customerSales).length;
            console.log(`✅ Loaded customer sales for ${customerCount} customers`);
        } catch (error) {
            console.error('❌ Error loading customer sales:', error);
            const container = document.getElementById('customerSalesList');
            if (container) {
                container.innerHTML = `
                    <div class="error-message">
                        <h4>❌ Failed to Load Customer Sales</h4>
                        <p>Error: ${error.message}</p>
                        <p>Please check the console for more details and try refreshing the application.</p>
                        <button onclick="TransactionUI.loadCustomerSales()" class="btn btn-primary">Retry</button>
                    </div>
                `;
            }
            
            if (window.Alerts) {
                Alerts.showError('Loading Error', 'Failed to load customer sales. Please check your connection and try again.');
            }
        }
    }

    static displayCustomerSales(customerSales) {
        const container = document.getElementById('customerSalesList');
        if (!container) {
            console.warn('⚠️ Customer sales container not found');
            return;
        }

        if (!customerSales || Object.keys(customerSales).length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <h4>📋 No Customer Sales Found</h4>
                    <p>No customer sales transactions have been recorded yet.</p>
                    <p>Customer sales will appear here once subscriptions are added.</p>
                </div>
            `;
            return;
        }

        let html = '';
        let totalCustomers = 0;
        let totalTransactions = 0;
        let totalRevenue = 0;

        Object.entries(customerSales).forEach(([customerName, customerData]) => {
            totalCustomers++;
            html += `
                <div class="customer-sales-group">
                    <h4>👤 ${customerName}</h4>
            `;

            if (customerData.classifications && Object.keys(customerData.classifications).length > 0) {
                Object.entries(customerData.classifications).forEach(([classification, subs]) => {
                    const totalAmount = subs.reduce((sum, sub) => {
                        const amount = parseFloat(sub.amount_paid || sub.AmountPaid || 0);
                        totalRevenue += amount;
                        return sum + amount;
                    }, 0);
                    const totalMonths = subs.reduce((sum, sub) => sum + parseInt(sub.credits_used || sub.CreditsUsed || 0), 0);
                    
                    // Find the latest date
                    const dates = subs.map(s => new Date(s.start_date || s.StartDate)).filter(d => !isNaN(d));
                    const latestDate = dates.length > 0 ? Math.max(...dates) : null;
                    
                    totalTransactions += subs.length;

                    html += `
                        <div class="classification-group">
                            <div class="classification-header">
                                <h5>📍 ${classification}</h5>
                                <div class="classification-summary">
                                    <strong>Services:</strong> ${subs.length} | 
                                    <strong>Total Months:</strong> ${totalMonths} | 
                                    ${latestDate ? `<strong>Latest:</strong> ${this.formatDate(new Date(latestDate))} |` : ''}
                                    <strong>Total Amount:</strong> ${this.formatCurrency(totalAmount)}
                                </div>
                            </div>
                            <div class="subscription-list">
                                ${subs.map(sub => `
                                    <div class="subscription-item">
                                        <strong>${sub.service_name || 'IT Service'}</strong> - 
                                        ${this.formatCurrency(sub.amount_paid || sub.AmountPaid || 0)} 
                                        (${sub.credits_used || sub.CreditsUsed || 0} months)
                                        <span class="date">${this.formatDate(sub.start_date || sub.StartDate)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                });
            } else {
                html += `
                    <div class="no-classifications">
                        <p><em>No service classifications found for this customer.</em></p>
                    </div>
                `;
            }

            html += '</div>';
        });

        // Add summary statistics
        const summaryHtml = `
            <div class="sales-summary">
                <h4>📊 Customer Sales Summary</h4>
                <div class="summary-stats">
                    <span><strong>Total Customers:</strong> ${totalCustomers}</span>
                    <span><strong>Total Transactions:</strong> ${totalTransactions}</span>
                    <span><strong>Total Revenue:</strong> ${this.formatCurrency(totalRevenue)}</span>
                </div>
            </div>
        `;

        container.innerHTML = summaryHtml + html;
    }

    // Utility methods for formatting
    static formatDate(date) {
        if (!date) return 'N/A';
        
        try {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) return 'Invalid Date';
            
            return dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            console.warn('Error formatting date:', error);
            return 'Invalid Date';
        }
    }

    static formatCurrency(amount) {
        if (amount === null || amount === undefined) return '$0.00';
        
        try {
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount)) return '$0.00';
            
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(numAmount);
        } catch (error) {
            console.warn('Error formatting currency:', error);
            return '$0.00';
        }
    }

    static formatNumber(number) {
        if (number === null || number === undefined) return '0';
        
        try {
            const numValue = parseInt(number);
            if (isNaN(numValue)) return '0';
            
            return numValue.toLocaleString('en-US');
        } catch (error) {
            console.warn('Error formatting number:', error);
            return '0';
        }
    }

    // Refresh methods
    static async refreshVendorTransactions() {
        console.log('🔄 Refreshing vendor transactions...');
        await this.loadVendorTransactions();
    }

    static async refreshCustomerSales() {
        console.log('🔄 Refreshing customer sales...');
        await this.loadCustomerSales();
    }

    static async refreshAll() {
        console.log('🔄 Refreshing all transaction data...');
        await Promise.all([
            this.loadVendorTransactions(),
            this.loadCustomerSales()
        ]);
        console.log('✅ All transaction data refreshed');
    }
}

// Make available globally
window.TransactionUI = TransactionUI;

// Export for modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransactionUI;
}