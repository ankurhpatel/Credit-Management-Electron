class PrintableReceiptWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.receiptData = null;
        this.receiptId = null;
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            includeBusinessHeader: true,
            includeCustomerInfo: true,
            includeQRCode: false,
            showLineNumbers: true,
            compactMode: false,
            printOnRender: false
        };
    }

    async loadData() {
        if (this.options.transactionId) {
            await this.loadTransactionReceipt(this.options.transactionId);
        } else if (this.options.customerId) {
            await this.loadCustomerReceipts(this.options.customerId);
        }
    }

    async loadTransactionReceipt(transactionId) {
        try {
            this.log(`Loading transaction receipt: ${transactionId}`);
            const response = await fetch(`/api/transactions/${transactionId}/receipt`);
            if (!response.ok) throw new Error('Failed to fetch transaction receipt');

            this.receiptData = await response.json();
            this.receiptId = `TXN-${transactionId}-${Date.now()}`;
        } catch (error) {
            this.handleError('Failed to load transaction receipt', error);
        }
    }

    async loadCustomerReceipts(customerId) {
        try {
            this.log(`Loading customer receipts: ${customerId}`);
            const response = await fetch(`/api/customers/${customerId}/receipt`);
            if (!response.ok) throw new Error('Failed to fetch customer receipts');

            this.receiptData = await response.json();
            this.receiptId = `CUST-${customerId}-${Date.now()}`;
        } catch (error) {
            this.handleError('Failed to load customer receipts', error);
        }
    }

    async getTemplate() {
        return `
            <div class="printable-receipt-widget ${this.options.compactMode ? 'compact' : ''}">
                <div class="receipt-actions no-print">
                    <div class="actions-left">
                        <h3>🧾 Receipt</h3>
                        <span class="receipt-id">ID: ${this.receiptId || 'Generating...'}</span>
                    </div>
                    <div class="actions-right">
                        <button class="btn-primary print-btn">🖨️ Print</button>
                        <button class="btn-secondary download-btn">💾 Download</button>
                        <button class="btn-info email-btn">📧 Email</button>
                        <button class="btn-secondary close-btn">✕ Close</button>
                    </div>
                </div>
                
                <div class="receipt-container print-area">
                    ${this.getReceiptContent()}
                </div>
            </div>
        `;
    }

    getReceiptContent() {
        if (!this.receiptData) {
            return '<div class="receipt-loading">Loading receipt data...</div>';
        }

        return `
            <div class="receipt-document">
                ${this.options.includeBusinessHeader ? this.getBusinessHeaderTemplate() : ''}
                ${this.getReceiptHeaderTemplate()}
                ${this.options.includeCustomerInfo ? this.getCustomerInfoTemplate() : ''}
                ${this.getReceiptItemsTemplate()}
                ${this.getReceiptTotalsTemplate()}
                ${this.getReceiptFooterTemplate()}
            </div>
        `;
    }

    getBusinessHeaderTemplate() {
        return `
            <div class="business-header">
                <div class="business-logo">
                    <h1>💳 IT Services Credit Management</h1>
                </div>
                <div class="business-info">
                    <div class="business-name">Professional IT Services & Solutions</div>
                    <div class="business-contact">
                        <div>📧 support@itservices.com</div>
                        <div>📞 (555) 123-4567</div>
                        <div>🌐 www.itservices.com</div>
                    </div>
                </div>
            </div>
        `;
    }

    getReceiptHeaderTemplate() {
        return `
            <div class="receipt-header">
                <div class="receipt-title">
                    <h2>SERVICE RECEIPT</h2>
                </div>
                <div class="receipt-metadata">
                    <div class="metadata-row">
                        <span class="label">Receipt #:</span>
                        <span class="value">${this.receiptId}</span>
                    </div>
                    <div class="metadata-row">
                        <span class="label">Date:</span>
                        <span class="value">${this.formatDate(new Date())}</span>
                    </div>
                    <div class="metadata-row">
                        <span class="label">Time:</span>
                        <span class="value">${this.formatTime(new Date())}</span>
                    </div>
                    ${this.receiptData.transactions?.[0]?.customer_id ? `
                        <div class="metadata-row">
                            <span class="label">Customer ID:</span>
                            <span class="value">${this.receiptData.transactions[0].customer_id}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getCustomerInfoTemplate() {
        if (!this.receiptData.customer) return '';

        const customer = this.receiptData.customer;

        return `
            <div class="customer-info">
                <h4>Bill To:</h4>
                <div class="customer-details">
                    <div class="customer-name">${this.escapeHtml(customer.name)}</div>
                    <div class="customer-email">${customer.email}</div>
                    ${customer.phone ? `<div class="customer-phone">${customer.phone}</div>` : ''}
                    ${customer.address ? `<div class="customer-address">${this.escapeHtml(customer.address)}</div>` : ''}
                </div>
            </div>
        `;
    }

    getReceiptItemsTemplate() {
        if (!this.receiptData.transactions || this.receiptData.transactions.length === 0) {
            return '<div class="no-transactions">No transactions found</div>';
        }

        return `
            <div class="receipt-items">
                <h4>Services & Transactions</h4>
                
                <div class="items-table">
                    <div class="table-header">
                        ${this.options.showLineNumbers ? '<div class="col-line">#</div>' : ''}
                        <div class="col-service">Service</div>
                        <div class="col-period">Period</div>
                        <div class="col-credits">Credits</div>
                        <div class="col-amount">Amount</div>
                    </div>
                    
                    <div class="table-body">
                        ${this.receiptData.transactions.map((transaction, index) =>
            this.getReceiptItemTemplate(transaction, index + 1)
        ).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    getReceiptItemTemplate(transaction, lineNumber) {
        return `
            <div class="table-row">
                ${this.options.showLineNumbers ? `<div class="col-line">${lineNumber}</div>` : ''}
                <div class="col-service">
                    <div class="service-name">${this.escapeHtml(transaction.service_name || 'Service')}</div>
                    ${transaction.classification ? `
                        <div class="service-location">📍 ${this.escapeHtml(transaction.classification)}</div>
                    ` : ''}
                    ${transaction.mac_address ? `
                        <div class="service-device">🖥️ ${transaction.mac_address}</div>
                    ` : ''}
                </div>
                <div class="col-period">
                    <div class="period-dates">
                        ${this.formatDate(transaction.start_date)} - 
                        ${this.formatDate(transaction.expiration_date)}
                    </div>
                    <div class="period-status status-${transaction.status}">
                        ${this.getStatusIcon(transaction.status)} ${transaction.status}
                    </div>
                </div>
                <div class="col-credits">
                    ${transaction.credits_used || 0}
                </div>
                <div class="col-amount">
                    ${this.formatCurrency(transaction.amount_paid || 0)}
                </div>
            </div>
        `;
    }

    getReceiptTotalsTemplate() {
        const summary = this.receiptData.summary || {};

        return `
            <div class="receipt-totals">
                <div class="totals-section">
                    <div class="totals-row subtotal">
                        <span class="totals-label">Subtotal:</span>
                        <span class="totals-value">${this.formatCurrency(summary.subtotal || 0)}</span>
                    </div>
                    
                    ${summary.tax ? `
                        <div class="totals-row tax">
                            <span class="totals-label">Tax:</span>
                            <span class="totals-value">${this.formatCurrency(summary.tax)}</span>
                        </div>
                    ` : ''}
                    
                    ${summary.discount ? `
                        <div class="totals-row discount">
                            <span class="totals-label">Discount:</span>
                            <span class="totals-value">-${this.formatCurrency(summary.discount)}</span>
                        </div>
                    ` : ''}
                    
                    <div class="totals-row total">
                        <span class="totals-label"><strong>Total Amount:</strong></span>
                        <span class="totals-value"><strong>${this.formatCurrency(summary.total || 0)}</strong></span>
                    </div>
                </div>
                
                <div class="payment-info">
                    <div class="payment-row">
                        <span class="payment-label">Payment Method:</span>
                        <span class="payment-value">${summary.paymentMethod || 'Cash/Check'}</span>
                    </div>
                    <div class="payment-row">
                        <span class="payment-label">Payment Date:</span>
                        <span class="payment-value">${this.formatDate(summary.paymentDate || new Date())}</span>
                    </div>
                    <div class="payment-row status-paid">
                        <span class="payment-label"><strong>Status:</strong></span>
                        <span class="payment-value"><strong>✅ PAID</strong></span>
                    </div>
                </div>
            </div>
        `;
    }

    getReceiptFooterTemplate() {
        return `
            <div class="receipt-footer">
                ${this.options.includeQRCode ? this.getQRCodeTemplate() : ''}
                
                <div class="footer-notes">
                    <div class="note-section">
                        <h5>📝 Important Information:</h5>
                        <ul class="footer-notes-list">
                            <li>Keep this receipt for your records</li>
                            <li>Service support available during business hours</li>
                            <li>For technical support, contact us with your Customer ID</li>
                            <li>Services are non-refundable after activation</li>
                        </ul>
                    </div>
                    
                    <div class="contact-info">
                        <h5>📞 Support Contact:</h5>
                        <div>📧 Email: support@itservices.com</div>
                        <div>📞 Phone: (555) 123-4567</div>
                        <div>🕒 Hours: Mon-Fri 9AM-6PM EST</div>
                    </div>
                </div>
                
                <div class="receipt-signature">
                    <div class="signature-line">
                        <div class="signature-label">Thank you for your business!</div>
                        <div class="signature-date">Generated: ${this.formatDateTime(new Date())}</div>
                    </div>
                </div>
            </div>
        `;
    }

    getQRCodeTemplate() {
        // In a real implementation, you would generate a QR code
        return `
            <div class="qr-code-section">
                <div class="qr-code-placeholder">
                    <div class="qr-code">
                        <!-- QR Code would be generated here -->
                        <div class="qr-placeholder">📱 QR CODE</div>
                    </div>
                    <div class="qr-label">Scan for receipt verification</div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Print button
        const printBtn = this.$('.print-btn');
        if (printBtn) {
            this.addEventListener(printBtn, 'click', () => this.printReceipt());
        }

        // Download button
        const downloadBtn = this.$('.download-btn');
        if (downloadBtn) {
            this.addEventListener(downloadBtn, 'click', () => this.downloadReceipt());
        }

        // Email button
        const emailBtn = this.$('.email-btn');
        if (emailBtn) {
            this.addEventListener(emailBtn, 'click', () => this.emailReceipt());
        }

        // Close button
        const closeBtn = this.$('.close-btn');
        if (closeBtn) {
            this.addEventListener(closeBtn, 'click', () => this.closeReceipt());
        }
    }

    async onAfterRender() {
        if (this.options.printOnRender && this.receiptData) {
            // Auto-print after a short delay
            setTimeout(() => {
                this.printReceipt();
            }, 500);
        }
    }

    printReceipt() {
        // Hide non-printable elements
        this.$$('.no-print').forEach(el => {
            el.style.display = 'none';
        });

        // Apply print styles
        document.body.classList.add('printing');

        // Print
        window.print();

        // Restore elements after printing
        setTimeout(() => {
            this.$$('.no-print').forEach(el => {
                el.style.display = '';
            });
            document.body.classList.remove('printing');
        }, 1000);

        this.emit('receiptPrinted', {
            receiptId: this.receiptId,
            customerId: this.receiptData?.customer?.id,
            transactionCount: this.receiptData?.transactions?.length || 0
        });
    }

    downloadReceipt() {
        const receiptContent = this.generateTextReceipt();
        const filename = `receipt-${this.receiptId}.txt`;

        this.downloadFile(receiptContent, filename, 'text/plain');

        this.emit('receiptDownloaded', {
            receiptId: this.receiptId,
            format: 'txt',
            filename
        });
    }

    generateTextReceipt() {
        const customer = this.receiptData.customer;
        const transactions = this.receiptData.transactions || [];
        const summary = this.receiptData.summary || {};

        let content = `
IT SERVICES CREDIT MANAGEMENT
======================================
            SERVICE RECEIPT
======================================

Receipt #: ${this.receiptId}
Date: ${this.formatDate(new Date())}
Time: ${this.formatTime(new Date())}

======================================
CUSTOMER INFORMATION:
======================================
Name: ${customer?.name || 'N/A'}
Email: ${customer?.email || 'N/A'}
${customer?.phone ? `Phone: ${customer.phone}` : ''}
${customer?.address ? `Address: ${customer.address}` : ''}
${customer?.id ? `Customer ID: ${customer.id}` : ''}

======================================
SERVICES & TRANSACTIONS:
======================================
`;

        transactions.forEach((transaction, index) => {
            content += `
${index + 1}. ${transaction.service_name || 'Service'}
   ${transaction.classification ? `Location: ${transaction.classification}` : ''}
   Period: ${this.formatDate(transaction.start_date)} - ${this.formatDate(transaction.expiration_date)}
   Credits: ${transaction.credits_used || 0}
   Amount: ${this.formatCurrency(transaction.amount_paid || 0)}
   Status: ${transaction.status || 'Unknown'}
   ${transaction.mac_address ? `Device: ${transaction.mac_address}` : ''}
`;
        });

        content += `
======================================
TOTALS:
======================================
Subtotal: ${this.formatCurrency(summary.subtotal || 0)}
${summary.tax ? `Tax: ${this.formatCurrency(summary.tax)}` : ''}
${summary.discount ? `Discount: -${this.formatCurrency(summary.discount)}` : ''}
TOTAL: ${this.formatCurrency(summary.total || 0)}

Payment Method: ${summary.paymentMethod || 'Cash/Check'}
Payment Date: ${this.formatDate(summary.paymentDate || new Date())}
Status: PAID ✓

======================================
IMPORTANT INFORMATION:
======================================
- Keep this receipt for your records
- Service support available during business hours
- For technical support, contact us with your Customer ID
- Services are non-refundable after activation

SUPPORT CONTACT:
Email: support@itservices.com
Phone: (555) 123-4567
Hours: Mon-Fri 9AM-6PM EST

Thank you for your business!
Generated: ${this.formatDateTime(new Date())}
`;

        return content;
    }

    emailReceipt() {
        if (!this.receiptData.customer?.email) {
            alert('No customer email address available');
            return;
        }

        const customer = this.receiptData.customer;
        const subject = `Service Receipt #${this.receiptId}`;
        const body = this.generateEmailBody();

        const mailtoLink = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoLink);

        this.emit('receiptEmailed', {
            receiptId: this.receiptId,
            customerEmail: customer.email,
            customerId: customer.id
        });
    }

    generateEmailBody() {
        const customer = this.receiptData.customer;
        const summary = this.receiptData.summary || {};

        return `Dear ${customer?.name || 'Valued Customer'},

Thank you for your business! Please find your service receipt attached.

Receipt Details:
- Receipt #: ${this.receiptId}
- Date: ${this.formatDate(new Date())}
- Total Amount: ${this.formatCurrency(summary.total || 0)}
- Payment Status: PAID

Your services have been activated and are ready for use.

If you have any questions or need technical support, please contact us:
📧 Email: support@itservices.com
📞 Phone: (555) 123-4567

Best regards,
IT Services Credit Management Team

---
This is an automated receipt. Please keep this email for your records.
Customer ID: ${customer?.id || 'N/A'}
`;
    }

    closeReceipt() {
        this.emit('receiptClosed');
        this.destroy();
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    getStatusIcon(status) {
        const icons = {
            'active': '✅',
            'expired': '❌',
            'cancelled': '🚫',
            'pending': '⏳'
        };
        return icons[status] || '❓';
    }

    formatTime(date) {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDateTime(date) {
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Public API
    setReceiptData(data) {
        this.receiptData = data;
        this.receiptId = data.receiptId || `RECEIPT-${Date.now()}`;
        this.render();
    }

    async loadTransactionData(transactionId) {
        this.options.transactionId = transactionId;
        await this.loadTransactionReceipt(transactionId);
        this.render();
    }

    async loadCustomerData(customerId) {
        this.options.customerId = customerId;
        await this.loadCustomerReceipts(customerId);
        this.render();
    }

    getReceiptId() {
        return this.receiptId;
    }

    getReceiptData() {
        return this.receiptData;
    }
}

window.PrintableReceiptWidget = PrintableReceiptWidget;
