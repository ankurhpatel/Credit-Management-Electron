// Professional POS Receipt UI
class ReceiptUI {
    static renderCustomerReceipt(data, container) {
        try {
            console.log('📄 Rendering professional receipt...');
            if (!data || !data.customer) throw new Error('Invalid data');

            const receiptHTML = this.generateProfessionalHTML(data);

            if (container) {
                container.innerHTML = receiptHTML;
            } else {
                this.showReceiptModal(receiptHTML, data.customer.name);
            }
        } catch (error) {
            console.error('❌ Receipt Error:', error);
        }
    }

    static generateProfessionalHTML(data) {
        const { customer, subscriptions, summary } = data;
        const customerName = customer.name || customer.Name;
        
        // Group items by bundle/order
        const items = subscriptions || [];
        
        return `
            <div class="pro-receipt" id="customer-receipt-content">
                <!-- Receipt Header -->
                <div class="pro-receipt-header">
                    <div class="pro-company-info">
                        <h2>IT SERVICES MANAGEMENT</h2>
                        <p>High-Quality Streaming & Hardware Solutions</p>
                        <p>Contact: support@itservices.com</p>
                    </div>
                    <div class="pro-receipt-title">
                        <h1>INVOICE / RECEIPT</h1>
                        <p>Date: ${new Date().toLocaleDateString()}</p>
                        <p>Receipt #: ${Date.now().toString().substr(-6)}</p>
                    </div>
                </div>

                <div class="pro-divider"></div>

                <!-- Billing Info -->
                <div class="pro-billing-section" style="display: flex; justify-content: space-between;">
                    <div class="bill-to">
                        <label>BILL TO:</label>
                        <strong>${customerName}</strong>
                        <p>${customer.email || ''}</p>
                        <p>${customer.phone || ''}</p>
                    </div>
                    <div class="payment-info" style="text-align: right;">
                        <label>PAYMENT DETAILS:</label>
                        <strong>${items[0]?.payment_status || 'Paid'}</strong>
                        <p>Method: ${items[0]?.payment_type || 'Cash'}</p>
                        <p>Ref: ${items[0]?.transaction_id_ref || 'N/A'}</p>
                        <p>Status: <strong>${items[0]?.order_status || 'Closed'}</strong></p>
                    </div>
                </div>

                <!-- Items Table -->
                <table class="pro-items-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th class="text-center">Qty/Duration</th>
                            <th class="text-right">Price</th>
                            <th class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => {
                            const qty = item.credits_used || 1;
                            const isSub = (item.item_type || 'subscription') === 'subscription';
                            return `
                                <tr>
                                    <td>
                                        <strong>${item.service_name}</strong>
                                        ${item.mac_address ? `<br><small>MAC: ${item.mac_address}</small>` : ''}
                                        ${item.classification ? `<br><small>Loc: ${item.classification}</small>` : ''}
                                    </td>
                                    <td class="text-center">${qty} ${isSub ? 'Mo' : 'Units'}</td>
                                    <td class="text-right">$${(parseFloat(item.amount_paid) / qty).toFixed(2)}</td>
                                    <td class="text-right">$${parseFloat(item.amount_paid).toFixed(2)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>

                <!-- Totals Section -->
                <div class="pro-totals-wrapper">
                    <div class="pro-totals">
                        <div class="total-row">
                            <span>Subtotal:</span>
                            <span>$${parseFloat(summary.totalPaid || 0).toFixed(2)}</span>
                        </div>
                        <div class="total-row grand-total">
                            <span>Grand Total (USD):</span>
                            <span>$${parseFloat(summary.totalPaid || 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="pro-footer">
                    <p><strong>Thank you for your business!</strong></p>
                    <p>For support or renewals, please contact us via WhatsApp or Email.</p>
                    <div class="pro-legal">
                        No refunds on activated digital services. Hardware warranty valid for 6 months.
                    </div>
                </div>

                <!-- Action Buttons (Hidden during print) -->
                <div class="receipt-actions no-print" style="margin-top: 30px; display: flex; gap: 10px; justify-content: center;">
                    <button onclick="window.print()" class="btn-primary" style="padding: 10px 30px;">🖨️ Print Now</button>
                    <button onclick="closeReceiptModal()" class="btn-secondary">✕ Close</button>
                </div>
            </div>
        `;
    }

    // Reuse existing modal logic but cleaner
    static showReceiptModal(html, name) {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop pro-receipt-modal';
        backdrop.innerHTML = `<div class="modal-content pro-modal-content">${html}</div>`;
        document.body.appendChild(backdrop);
        window.currentReceiptModal = backdrop;
        
        backdrop.onclick = (e) => { if(e.target === backdrop) this.closeReceiptModal(); };
    }

    static closeReceiptModal() {
        if (window.currentReceiptModal) {
            document.body.removeChild(window.currentReceiptModal);
            window.currentReceiptModal = null;
        }
    }

    // Add compatibility methods for PrintManager
    static renderSingleTransactionReceipt(data, container) {
        this.renderCustomerReceipt({
            customer: data.customer,
            subscriptions: [data.subscription],
            summary: data.summary
        }, container);
    }
}

window.ReceiptUI = ReceiptUI;
function closeReceiptModal() { ReceiptUI.closeReceiptModal(); }