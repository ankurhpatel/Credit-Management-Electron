// Enhanced Receipt UI with individual service receipts
class ReceiptUI {
    static renderCustomerReceipt(data, container) {
        try {
            console.log('📄 Rendering customer receipt...');

            if (!data || !data.customer) {
                throw new Error('Invalid customer data provided');
            }

            const customer = data.customer;
            const subscriptions = data.subscriptions || [];
            const groupedSubscriptions = data.groupedSubscriptions || {};
            const summary = data.summary || {};

            const receiptHTML = this.generateReceiptHTML(customer, subscriptions, groupedSubscriptions, summary);

            if (container) {
                container.innerHTML = receiptHTML;
            } else {
                // Create modal for receipt display
                this.showReceiptModal(receiptHTML, customer.name || customer.Name);
            }

            console.log('✅ Customer receipt rendered successfully');

        } catch (error) {
            console.error('❌ Error rendering receipt:', error);
            if (container) {
                container.innerHTML = `<div class="error">Error loading receipt: ${error.message}</div>`;
            }
        }
    }

    // NEW: Render individual service receipt
    static renderIndividualServiceReceipt(data, container, serviceName, classification) {
        try {
            console.log(`📄 Rendering individual service receipt for: ${serviceName} - ${classification}`);

            if (!data || !data.customer) {
                throw new Error('Invalid customer data provided');
            }

            const customer = data.customer;
            const subscriptions = data.subscriptions || [];
            const summary = data.summary || {};

            const receiptHTML = this.generateIndividualServiceReceiptHTML(customer, subscriptions, summary, serviceName, classification);

            if (container) {
                container.innerHTML = receiptHTML;
            } else {
                // Create modal for receipt display
                this.showReceiptModal(receiptHTML, `${customer.name || customer.Name} - ${serviceName}`);
            }

            console.log('✅ Individual service receipt rendered successfully');

        } catch (error) {
            console.error('❌ Error rendering individual service receipt:', error);
            if (container) {
                container.innerHTML = `<div class="error">Error loading receipt: ${error.message}</div>`;
            }
        }
    }

    static generateReceiptHTML(customer, subscriptions, groupedSubscriptions, summary) {
        const customerName = customer.name || customer.Name;
        const customerEmail = customer.email || customer.Email;
        const customerPhone = customer.phone || customer.Phone;
        const customerAddress = customer.address || customer.Address;
        const customerId = customer.id || customer.CustomerID;

        // Get unique services for individual printing
        const uniqueServices = this.getUniqueServices(subscriptions);

        return `
            <div class="customer-receipt" id="customer-receipt-content">
                <div class="receipt-header">
                    <h3>📄 Customer Transaction Receipt</h3>
                    <div class="receipt-info">
                        <strong>Customer:</strong> ${customerName}<br>
                        <strong>Email:</strong> ${customerEmail}<br>
                        ${customerPhone ? `<strong>Phone:</strong> ${customerPhone}<br>` : ''}
                        ${customerAddress ? `<strong>Address:</strong> ${customerAddress}<br>` : ''}
                        <strong>Customer ID:</strong> ${customerId}<br>
                        <strong>Report Generated:</strong> ${new Date().toLocaleString()}
                    </div>
                </div>

                <div class="receipt-summary">
                    <strong>📊 Summary</strong><br>
                    Total Amount Paid: <strong>$${Formatters.formatCurrency(summary.totalPaid || 0)}</strong><br>
                    Total Credits Used: <strong>${summary.totalMonths || 0} months</strong><br>
                    Total Transactions: <strong>${summary.totalTransactions || 0}</strong>
                </div>

                ${uniqueServices.length > 1 ? this.generateIndividualPrintButtons(customerId, uniqueServices) : ''}

                ${this.generateClassificationSections(groupedSubscriptions)}
                
                <div class="receipt-actions no-print" style="margin-top: 20px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="PrintManager.showCustomPrintPreview('customer-receipt-content', 'Customer Receipt - ${customerName}')" class="btn-info">👁️ Preview</button>
                    <button onclick="PrintManager.printCustomerReceipt('${customerId}')" class="btn-primary">🖨️ Print Receipt</button>
                    <button onclick="closeReceiptModal()" class="btn-secondary">✕ Close</button>
                </div>

                <div class="receipt-footer">
                    <hr style="margin: 20px 0;">
                    <p style="text-align: center; font-style: italic; color: #666;">
                        Thank you for choosing IT Services Credit Management
                    </p>
                </div>
            </div>
        `;
    }

    // NEW: Generate individual service receipt HTML
    static generateIndividualServiceReceiptHTML(customer, subscriptions, summary, serviceName, classification) {
        const customerName = customer.name || customer.Name;
        const customerEmail = customer.email || customer.Email;
        const customerPhone = customer.phone || customer.Phone;
        const customerAddress = customer.address || customer.Address;
        const customerId = customer.id || customer.CustomerID;

        return `
            <div class="customer-receipt" id="individual-receipt-content">
                <div class="individual-service-header">
                    <h4>🔧 Individual Service Receipt</h4>
                    <p><strong>Service:</strong> ${serviceName} ${classification ? `• <strong>Location:</strong> ${classification}` : ''}</p>
                </div>

                <div class="receipt-header">
                    <h3>📄 Service Transaction Receipt</h3>
                    <div class="receipt-info">
                        <strong>Customer:</strong> ${customerName}<br>
                        <strong>Email:</strong> ${customerEmail}<br>
                        ${customerPhone ? `<strong>Phone:</strong> ${customerPhone}<br>` : ''}
                        ${customerAddress ? `<strong>Address:</strong> ${customerAddress}<br>` : ''}
                        <strong>Customer ID:</strong> ${customerId}<br>
                        <strong>Service:</strong> ${serviceName}<br>
                        ${classification ? `<strong>Location:</strong> ${classification}<br>` : ''}
                        <strong>Report Generated:</strong> ${new Date().toLocaleString()}
                    </div>
                </div>

                <div class="receipt-summary">
                    <strong>📊 Service Summary</strong><br>
                    Amount Paid for this Service: <strong>$${Formatters.formatCurrency(summary.totalPaid || 0)}</strong><br>
                    Credits Used: <strong>${summary.totalMonths || 0} months</strong><br>
                    Total Transactions: <strong>${summary.totalTransactions || 0}</strong>
                </div>

                <div class="classification-group">
                    <h4>📍 ${classification || 'Service Transactions'}</h4>
                    ${subscriptions.map(sub => this.generateTransactionItem(sub)).join('')}
                </div>

                <div class="receipt-footer">
                    <hr style="margin: 20px 0;">
                    <p style="text-align: center; font-style: italic; color: #666;">
                        Individual Service Receipt - IT Services Credit Management
                    </p>
                </div>
            </div>
        `;
    }

    // NEW: Generate individual print buttons for multiple services
    static generateIndividualPrintButtons(customerId, uniqueServices) {
        return `
            <div class="individual-print-section no-print" style="background: #f0f8ff; border: 1px solid #ddd; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <h4 style="margin: 0 0 10px 0; color: #333;">🖨️ Print Individual Service Receipts</h4>
                <p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">You can print receipts for individual services and locations:</p>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${uniqueServices.map(service => `
                        <button onclick="PrintManager.printIndividualServiceReceipt('${customerId}', '${service.serviceName}', '${service.classification}')" 
                                class="btn-small btn-info" style="font-size: 12px; padding: 6px 12px;">
                            🖨️ ${service.serviceName}${service.classification ? ` (${service.classification})` : ''}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // NEW: Get unique services from subscriptions
    static getUniqueServices(subscriptions) {
        const serviceMap = new Map();

        subscriptions.forEach(sub => {
            const serviceName = sub.service_name || sub.ServiceName || 'IT App Services';
            const classification = sub.classification || sub.Classification || '';
            const key = `${serviceName}-${classification}`;

            if (!serviceMap.has(key)) {
                serviceMap.set(key, {
                    serviceName: serviceName,
                    classification: classification,
                    count: 1
                });
            } else {
                serviceMap.get(key).count++;
            }
        });

        return Array.from(serviceMap.values()).filter(service => service.count > 0);
    }

    static generateClassificationSections(groupedSubscriptions) {
        let html = '';

        Object.entries(groupedSubscriptions).forEach(([classification, subscriptions]) => {
            html += `
                <div class="classification-group">
                    <h4>📍 ${classification}</h4>
                    ${subscriptions.map(sub => this.generateTransactionItem(sub)).join('')}
                </div>
            `;
        });

        return html || '<div class="no-data">No subscriptions found</div>';
    }

    static generateTransactionItem(subscription) {
        const startDate = Formatters.formatDate(subscription.start_date || subscription.StartDate);
        const expirationDate = Formatters.formatDate(subscription.expiration_date || subscription.ExpirationDate);
        const amount = Formatters.formatCurrency(subscription.amount_paid || subscription.AmountPaid || 0);
        const credits = subscription.credits_used || subscription.CreditsUsed || 0;

        return `
            <div class="transaction-item">
                <strong>Service:</strong> ${subscription.service_name || subscription.ServiceName || 'IT App Services'}<br>
                <strong>Period:</strong> ${startDate} to ${expirationDate}<br>
                <strong>Credits:</strong> ${credits} months<br>
                <strong>Amount:</strong> $${amount}<br>
                <strong>Status:</strong> ${this.formatStatus(subscription.status || subscription.Status)}<br>
                ${(subscription.notes || subscription.Notes) ?
                `<strong>Notes:</strong> ${subscription.notes || subscription.Notes}<br>` : ''
            }
                <small>Added: ${Formatters.formatDate(subscription.created_date || subscription.CreatedDate)}</small>
            </div>
        `;
    }

    static formatStatus(status) {
        const statusMap = {
            'active': '✅ Active',
            'expired': '❌ Expired',
            'cancelled': '🚫 Cancelled'
        };
        return statusMap[status?.toLowerCase()] || status || 'Unknown';
    }

    static showReceiptModal(html, customerName) {
        // Create modal backdrop
        const modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'modal-backdrop';
        modalBackdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
        `;

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 0;
            max-width: 900px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            position: relative;
        `;

        modalContent.innerHTML = html;
        modalBackdrop.appendChild(modalContent);
        document.body.appendChild(modalBackdrop);

        // Close modal when clicking backdrop
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) {
                this.closeReceiptModal();
            }
        });

        // Store reference for cleanup
        window.currentReceiptModal = modalBackdrop;

        // Add ESC key listener
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeReceiptModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        console.log(`📄 Enhanced receipt modal opened for customer: ${customerName}`);
    }

    static closeReceiptModal() {
        if (window.currentReceiptModal) {
            document.body.removeChild(window.currentReceiptModal);
            window.currentReceiptModal = null;
            console.log('📄 Receipt modal closed');
        }
    }
}

// Make available globally
window.ReceiptUI = ReceiptUI;

// Global function for modal close
function closeReceiptModal() {
    ReceiptUI.closeReceiptModal();
}
