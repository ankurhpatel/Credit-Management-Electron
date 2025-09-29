class CustomerReceiptWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.customerData = null;
        this.receiptId = null;
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showPrintButton: true,
            showEmailButton: true,
            showDownloadButton: true,
            groupByClassification: true,
            includeCustomerInfo: true,
            includeBusinessInfo: true
        };
    }

    async loadData() {
        if (this.options.customerId) {
            await this.loadCustomerTransactions(this.options.customerId);
        } else if (this.options.customerData) {
            this.customerData = this.options.customerData;
        }
    }

    async loadCustomerTransactions(customerId) {
        try {
            this.log(`Loading transactions for customer: ${customerId}`);
            const response = await fetch(`/api/customers/${customerId}/transactions`);
            if (!response.ok) throw new Error('Failed to load customer transactions');

            this.customerData = await response.json();
            this.log('Customer transactions loaded:', this.customerData);
        } catch (error) {
            this.handleError('Failed to load customer transactions', error);
        }
    }

    async getTemplate() {
        if (!this.customerData) {
            return '<div class="receipt-loading">Loading receipt data...</div>';
        }

        return `
            <div class="customer-receipt-widget">
                ${this.getReceiptHeaderTemplate()}
                ${this.getReceiptActionsTemplate()}
                <div class="receipt-content">
                    ${this.getCustomerReceiptTemplate()}
                </div>
            </div>
        `;
    }

    getReceiptHeaderTemplate() {
        return `
            <div class="receipt-header">
                <h3>📄 Customer Receipt</h3>
                <div class="receipt-meta">
                    <span class="receipt-date">Generated: ${this.formatDate(new Date())}</span>
                    <span class="receipt-id">Receipt #${this.generateReceiptId()}</span>
                </div>
            </div>
        `;
    }

    getReceiptActionsTemplate() {
        return `
            <div class="receipt-actions no-print">
                ${this.options.showPrintButton ? `
                    <button class="btn-primary print-receipt-btn">🖨️ Print Receipt</button>
                ` : ''}
                ${this.options.showEmailButton ? `
                    <button class="btn-secondary email-receipt-btn">📧 Email Receipt</button>
                ` : ''}
                ${this.options.showDownloadButton ? `
                    <button class="btn-info download-receipt-btn">💾 Download PDF</button>
                ` : ''}
                <button class="btn-secondary close-receipt-btn">✕ Close</button>
            </div>
        `;
    }

    getCustomerReceiptTemplate() {
        const customer = this.customerData.customer;
        const subscriptions = this.customerData.subscriptions;
        const summary = this.customerData.summary;

        return `
            <div class="customer-receipt print-content">
                ${this.options.includeBusinessInfo ? this.getBusinessHeaderTemplate() : ''}
                
                <div class="receipt-customer-info">
                    <h4>Bill To:</h4>
                    <div class="customer-details">
                        <strong>${this.escapeHtml(customer.name)}</strong><br>
                        ${customer.email}<br>
                        ${customer.phone ? `${customer.phone}<br>` : ''}
                        ${customer.address ? `${this.escapeHtml(customer.address)}<br>` : ''}
                        <strong>Customer ID:</strong> ${customer.id}
                    </div>
                </div>

                <div class="receipt-summary">
                    <h4>Service Summary</h4>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span class="summary-label">Total Subscriptions:</span>
                            <span class="summary-value">${summary.totalTransactions}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Total Service Months:</span>
                            <span class="summary-value">${summary.totalMonths}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Total Amount Paid:</span>
                            <span class="summary-value">${this.formatCurrency(summary.totalPaid)}</span>
                        </div>
                    </div>
                </div>

                <div class="receipt-transactions">
                    <h4>Service Details</h4>
                    ${this.options.groupByClassification ?
                this.getGroupedTransactionsTemplate() :
                this.getFlatTransactionsTemplate()
            }
                </div>

                <div class="receipt-footer">
                    <div class="receipt-totals">
                        <div class="total-line">
                            <strong>Total Amount: ${this.formatCurrency(summary.totalPaid)}</strong>
                        </div>
                        <div class="total-line">
                            <strong>Total Service Months: ${summary.totalMonths}</strong>
                        </div>
                    </div>
                    
                    <div class="receipt-notes">
                        <p><strong>Thank you for your business!</strong></p>
                        <p>For support, please contact us with your Customer ID: ${customer.id}</p>
                        <p class="receipt-timestamp">Receipt generated on ${this.formatDate(new Date(), {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}</p>
                    </div>
                </div>
            </div>
        `;
    }

    getBusinessHeaderTemplate() {
        return `
            <div class="business-header">
                <div class="business-info">
                    <h2>💳 IT Services Credit Management</h2>
                    <p>Professional IT Services & Solutions</p>
                    <div class="business-contact">
                        Email: support@itservices.com | Phone: (555) 123-4567
                    </div>
                </div>
                <div class="receipt-title">
                    <h3>SERVICE RECEIPT</h3>
                </div>
            </div>
        `;
    }

    getGroupedTransactionsTemplate() {
        const groupedSubscriptions = this.customerData.groupedSubscriptions;

        return Object.entries(groupedSubscriptions).map(([classification, transactions]) => `
            <div class="classification-group">
                <h5 class="classification-header">
                    📍 ${classification}
                    <span class="classification-summary">
                        (${transactions.length} service${transactions.length !== 1 ? 's' : ''})
                    </span>
                </h5>
                
                <div class="classification-transactions">
                    ${transactions.map(transaction => this.getTransactionItemTemplate(transaction)).join('')}
                </div>
                
                <div class="classification-totals">
                    <div class="classification-total">
                        <strong>Classification Total: ${this.formatCurrency(
            transactions.reduce((sum, t) => sum + (t.amount_paid || 0), 0)
        )}</strong>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getFlatTransactionsTemplate() {
        return `
            <div class="transactions-list">
                ${this.customerData.subscriptions.map(transaction =>
            this.getTransactionItemTemplate(transaction)
        ).join('')}
            </div>
        `;
    }

    getTransactionItemTemplate(transaction) {
        return `
            <div class="transaction-item">
                <div class="transaction-header">
                    <div class="transaction-service">
                        <strong>${transaction.service_name}</strong>
                        ${transaction.vendor_service_name ? `
                            <span class="vendor-service">(${transaction.vendor_service_name})</span>
                        ` : ''}
                    </div>
                    <div class="transaction-amount">
                        ${this.formatCurrency(transaction.amount_paid)}
                    </div>
                </div>
                
                <div class="transaction-details">
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Service Period:</span>
                            <span class="detail-value">
                                ${this.formatDate(transaction.start_date)} - ${this.formatDate(transaction.expiration_date)}
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Duration:</span>
                            <span class="detail-value">${transaction.credits_used} month${transaction.credits_used !== 1 ? 's' : ''}</span>
                        </div>
                        ${transaction.classification ? `
                            <div class="detail-item">
                                <span class="detail-label">Location:</span>
                                <span class="detail-value">${this.escapeHtml(transaction.classification)}</span>
                            </div>
                        ` : ''}
                        ${transaction.mac_address ? `
                            <div class="detail-item">
                                <span class="detail-label">Device MAC:</span>
                                <span class="detail-value">${transaction.mac_address}</span>
                            </div>
                        ` : ''}
                        <div class="detail-item">
                            <span class="detail-label">Status:</span>
                            <span class="detail-value status-${transaction.status}">
                                ${this.getStatusIcon(transaction.status)} ${transaction.status}
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Date Added:</span>
                            <span class="detail-value">${this.formatDate(transaction.created_date)}</span>
                        </div>
                    </div>
                    
                    ${transaction.notes ? `
                        <div class="transaction-notes">
                            <span class="detail-label">Notes:</span>
                            <span class="detail-value">${this.escapeHtml(transaction.notes)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Print button
        const printBtn = this.$('.print-receipt-btn');
        if (printBtn) {
            this.addEventListener(printBtn, 'click', () => this.printReceipt());
        }

        // Email button
        const emailBtn = this.$('.email-receipt-btn');
        if (emailBtn) {
            this.addEventListener(emailBtn, 'click', () => this.emailReceipt());
        }

        // Download button
        const downloadBtn = this.$('.download-receipt-btn');
        if (downloadBtn) {
            this.addEventListener(downloadBtn, 'click', () => this.downloadReceipt());
        }

        // Close button
        const closeBtn = this.$('.close-receipt-btn');
        if (closeBtn) {
            this.addEventListener(closeBtn, 'click', () => this.closeReceipt());
        }
    }

    printReceipt() {
        // Hide non-printable elements
        this.$$('.no-print').forEach(el => el.style.display = 'none');

        // Print
        window.print();

        // Restore non-printable elements
        setTimeout(() => {
            this.$$('.no-print').forEach(el => el.style.display = '');
        }, 1000);

        this.emit('receiptPrinted', {
            customerId: this.customerData.customer.id,
            receiptId: this.receiptId
        });
    }

    emailReceipt() {
        const customer = this.customerData.customer;
        const subject = `Service Receipt - ${customer.name}`;
        const body = this.generateEmailBody();

        const mailtoLink = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoLink);

        this.emit('receiptEmailed', {
            customerId: customer.id,
            email: customer.email,
            receiptId: this.receiptId
        });
    }

    generateEmailBody() {
        const customer = this.customerData.customer;
        const summary = this.customerData.summary;

        return `Dear ${customer.name},

Thank you for your business! Please find your service receipt below.

Customer Information:
- Name: ${customer.name}
- Customer ID: ${customer.id}
- Email: ${customer.email}

Service Summary:
- Total Subscriptions: ${summary.totalTransactions}
- Total Service Months: ${summary.totalMonths}
- Total Amount Paid: ${this.formatCurrency(summary.totalPaid)}

For detailed information, please view the attached receipt.

Best regards,
IT Services Credit Management Team

Receipt ID: ${this.receiptId}
Generated: ${this.formatDate(new Date())}`;
    }

    downloadReceipt() {
        // Create a simplified version for download
        const receiptContent = this.generateDownloadContent();

        const blob = new Blob([receiptContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${this.customerData.customer.name.replace(/\s+/g, '-')}-${this.receiptId}.txt`;
        a.click();

        window.URL.revokeObjectURL(url);

        this.emit('receiptDownloaded', {
            customerId: this.customerData.customer.id,
            receiptId: this.receiptId
        });
    }

    generateDownloadContent() {
        const customer = this.customerData.customer;
        const summary = this.customerData.summary;
        const subscriptions = this.customerData.subscriptions;

        let content = `IT SERVICES CREDIT MANAGEMENT
SERVICE RECEIPT
Receipt ID: ${this.receiptId}
Generated: ${this.formatDate(new Date())}

========================================

CUSTOMER INFORMATION:
Name: ${customer.name}
Customer ID: ${customer.id}
Email: ${customer.email}
${customer.phone ? `Phone: ${customer.phone}` : ''}
${customer.address ? `Address: ${customer.address}` : ''}

========================================

SERVICE SUMMARY:
Total Subscriptions: ${summary.totalTransactions}
Total Service Months: ${summary.totalMonths}
Total Amount Paid: ${this.formatCurrency(summary.totalPaid)}

========================================

SERVICE DETAILS:
`;

        // Add subscription details
        subscriptions.forEach((sub, index) => {
            content += `
${index + 1}. ${sub.service_name}
   Period: ${this.formatDate(sub.start_date)} - ${this.formatDate(sub.expiration_date)}
   Duration: ${sub.credits_used} month${sub.credits_used !== 1 ? 's' : ''}
   Amount: ${this.formatCurrency(sub.amount_paid)}
   Status: ${sub.status}
   ${sub.classification ? `Location: ${sub.classification}` : ''}
   ${sub.mac_address ? `Device MAC: ${sub.mac_address}` : ''}
   ${sub.notes ? `Notes: ${sub.notes}` : ''}
`;
        });

        content += `
========================================

TOTAL AMOUNT: ${this.formatCurrency(summary.totalPaid)}

Thank you for your business!
For support, contact us with Customer ID: ${customer.id}
`;

        return content;
    }

    closeReceipt() {
        this.emit('receiptClosed');
        this.destroy();
    }

    generateReceiptId() {
        if (!this.receiptId) {
            const customerId = this.customerData?.customer?.id || 'UNKNOWN';
            const timestamp = Date.now().toString().slice(-6);
            this.receiptId = `${customerId}-${timestamp}`;
        }
        return this.receiptId;
    }

    getStatusIcon(status) {
        const icons = {
            'active': '✅',
            'expired': '❌',
            'cancelled': '🚫',
            'suspended': '⏸️'
        };
        return icons[status] || '❓';
    }

    // Public API
    setCustomerData(customerData) {
        this.customerData = customerData;
        this.render();
    }

    async loadCustomer(customerId) {
        await this.loadCustomerTransactions(customerId);
        this.render();
    }

    getReceiptData() {
        return {
            customerId: this.customerData?.customer?.id,
            receiptId: this.receiptId,
            generateDate: new Date(),
            summary: this.customerData?.summary
        };
    }
}

window.CustomerReceiptWidget = CustomerReceiptWidget;
