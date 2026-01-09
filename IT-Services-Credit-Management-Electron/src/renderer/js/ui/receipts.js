// Professional POS Receipt UI
class ReceiptUI {
    static renderCustomerReceipt(data, container) {
        try {
            // Force get latest config from Store
            const config = Store.getSettings() || {};
            
            console.log('📄 Rendering receipt with current config:', {
                company: config.company_name,
                email: config.company_email,
                address: config.company_address
            });

            if (!data || !data.customer) throw new Error('Invalid data');

            const receiptHTML = this.generateProfessionalHTML(data, config);

            if (container) {
                container.innerHTML = receiptHTML;
            } else {
                this.showReceiptModal(receiptHTML, data.customer.name || 'Customer');
            }
        } catch (error) {
            console.error('❌ Receipt Error:', error);
            Alerts.showError('Receipt Error', 'Failed to generate invoice: ' + error.message);
        }
    }

    static generateProfessionalHTML(data, config = {}) {
        const { customer, subscriptions, summary } = data;
        const customerName = customer.name || customer.Name || 'Valued Customer';
        const items = subscriptions || [];
        
        // Settings with robust fallbacks
        const companyName = config.company_name || 'IT Services Management';
        const companyLogo = config.company_logo || '';
        const companyEmail = config.company_email || 'support@itservices.com';
        const companyPhone = config.company_phone || '';
        const companyAddress = config.company_address || '';
        const instructions = config.receipt_instructions || 'No refunds on activated digital services.';
        const currency = config.currency_symbol || '$';

        return `
            <div class="pro-receipt" id="customer-receipt-content" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; padding: 40px; background: white;">
                <!-- Receipt Header -->
                <div class="pro-receipt-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
                    <div class="pro-company-info">
                        ${companyLogo ? `<img src="${companyLogo}" style="max-height: 70px; max-width: 250px; margin-bottom: 15px; display: block; object-fit: contain;">` : ''}
                        <h2 style="margin: 0; color: #1a202c; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">${companyName}</h2>
                        <div style="color: #718096; font-size: 13px; margin-top: 8px; line-height: 1.5;">
                            ${companyAddress ? `<p style="margin: 0;">${companyAddress}</p>` : ''}
                            <p style="margin: 0;">${companyEmail} ${companyPhone ? `• ${companyPhone}` : ''}</p>
                        </div>
                    </div>
                    <div class="pro-receipt-title" style="text-align: right;">
                        <h1 style="margin: 0; font-size: 28px; color: #cbd5e0; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Invoice</h1>
                        <div style="margin-top: 15px; font-size: 13px; color: #4a5568;">
                            <p style="margin: 0;"><strong>Date:</strong> ${items[0]?.start_date ? new Date(items[0].start_date).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                            <p style="margin: 4px 0;"><strong>Invoice #:</strong> <span style="font-family: monospace; color: #718096;">${items[0]?.bundle_id ? items[0].bundle_id.substring(items[0].bundle_id.length - 6) : Date.now().toString().substr(-6)}</span></p>
                        </div>
                    </div>
                </div>

                <div style="height: 1px; background: #e2e8f0; margin-bottom: 30px;"></div>

                <!-- Billing Info -->
                <div class="pro-billing-section" style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
                    <div class="bill-to">
                        <label style="font-size: 11px; color: #a0aec0; text-transform: uppercase; font-weight: 800; display: block; margin-bottom: 10px; letter-spacing: 1px;">Billed To</label>
                        <strong style="font-size: 18px; color: #2d3748; display: block; margin-bottom: 5px;">${customerName}</strong>
                        <div style="color: #718096; font-size: 13px; line-height: 1.5;">
                            <p style="margin: 0;">${customer.email || ''}</p>
                            <p style="margin: 0;">${customer.phone || ''}</p>
                        </div>
                    </div>
                    <div class="payment-info" style="text-align: right;">
                        <label style="font-size: 11px; color: #a0aec0; text-transform: uppercase; font-weight: 800; display: block; margin-bottom: 10px; letter-spacing: 1px;">Payment Method</label>
                        <div style="display: inline-block; background: #f0fff4; color: #2f855a; padding: 6px 16px; border-radius: 6px; font-weight: 800; font-size: 14px; margin-bottom: 10px; border: 1px solid #c6f6d5;">
                            ${items[0]?.payment_status || 'Paid'}
                        </div>
                        <div style="color: #718096; font-size: 13px; line-height: 1.5;">
                            <p style="margin: 0;"><strong>Method:</strong> ${items[0]?.payment_type || 'Other'}</p>
                            <p style="margin: 0;"><strong>Reference:</strong> ${items[0]?.transaction_id_ref || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                <!-- Items Table -->
                <table class="pro-items-table" style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
                    <thead>
                        <tr style="border-bottom: 2px solid #edf2f7;">
                            <th style="text-align: left; padding: 12px 0; font-size: 11px; color: #a0aec0; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Description</th>
                            <th style="text-align: center; padding: 12px 0; font-size: 11px; color: #a0aec0; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Qty / Duration</th>
                            <th style="text-align: right; padding: 12px 0; font-size: 11px; color: #a0aec0; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => {
                            const qty = item.credits_used || 1;
                            const isSub = (item.item_type || 'subscription') === 'subscription';
                            return `
                                <tr style="border-bottom: 1px solid #f7fafc;">
                                    <td style="padding: 20px 0;">
                                        <div style="font-weight: 700; color: #2d3748; font-size: 15px;">${item.service_name}</div>
                                        <div style="margin-top: 4px;">
                                            ${item.mac_address ? `<span style="font-size: 11px; color: #718096; background: #f8fafc; padding: 2px 6px; border-radius: 4px; margin-right: 5px;">MAC: ${item.mac_address}</span>` : ''}
                                            ${item.classification ? `<span style="font-size: 11px; color: #718096; background: #f8fafc; padding: 2px 6px; border-radius: 4px;">Loc: ${item.classification}</span>` : ''}
                                        </div>
                                    </td>
                                    <td style="padding: 20px 0; text-align: center; color: #4a5568; font-weight: 600;">${qty} ${isSub ? 'Month(s)' : 'Units'}</td>
                                    <td style="padding: 20px 0; text-align: right; font-weight: 800; color: #1a202c; font-size: 16px;">${currency}${parseFloat(item.amount_paid).toFixed(2)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>

                <!-- Totals Section -->
                <div class="pro-totals-wrapper" style="display: flex; justify-content: flex-end; margin-bottom: 60px;">
                    <div class="pro-totals" style="width: 250px;">
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #718096; font-size: 14px;">
                            <span>Subtotal</span>
                            <span style="font-weight: 600;">${currency}${parseFloat(summary.totalPaid || 0).toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 15px 0; border-top: 2px solid #1a202c; margin-top: 10px; font-weight: 900; font-size: 22px; color: #1a202c;">
                            <span>TOTAL</span>
                            <span>${currency}${parseFloat(summary.totalPaid || 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="pro-footer" style="text-align: center; border-top: 1px solid #edf2f7; padding-top: 30px;">
                    <p style="font-weight: 800; color: #2d3748; margin-bottom: 15px; font-size: 16px;">Thank you for choosing ${companyName}!</p>
                    <div class="pro-legal" style="font-size: 12px; color: #a0aec0; line-height: 1.6; max-width: 85%; margin: 0 auto; font-style: italic;">
                        ${instructions}
                    </div>
                </div>

                <!-- Action Buttons (Hidden during print) -->
                <div class="receipt-actions no-print" style="margin-top: 40px; display: flex; gap: 15px; justify-content: center; border-top: 1px dashed #e2e8f0; padding-top: 30px;">
                    <button onclick="window.print()" class="btn-primary" style="padding: 12px 40px; border-radius: 8px; font-weight: 700; background: #2d3748; color: white; border: none; cursor: pointer;">🖨️ Print Invoice</button>
                    <button onclick="closeReceiptModal()" class="btn-secondary" style="padding: 12px 30px; border-radius: 8px; font-weight: 600; background: #edf2f7; color: #4a5568; border: none; cursor: pointer;">✕ Close</button>
                </div>
            </div>
        `;
    }

    static showPreview() {
        const dummyData = {
            customer: { name: 'Sample Customer', email: 'customer@example.com', phone: '555-0199' },
            subscriptions: [{ service_name: 'Premium IT Service', amount_paid: 120.00, credits_used: 12, item_type: 'subscription', classification: 'Living Room' }],
            summary: { totalPaid: 120.00 }
        };
        this.renderCustomerReceipt(dummyData);
    }

    static showReceiptModal(html, name) {
        // Remove existing if any
        this.closeReceiptModal();

        const backdrop = document.createElement('div');
        backdrop.id = 'receipt-modal-backdrop';
        backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; overflow-y: auto; display: flex; align-items: flex-start; justify-content: center; padding: 40px 20px;';
        
        const modal = document.createElement('div');
        modal.style.cssText = 'background: white; width: 100%; max-width: 850px; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); overflow: hidden;';
        modal.innerHTML = html;
        
        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);
        window.currentReceiptModal = backdrop;
        
        backdrop.onclick = (e) => { if(e.target === backdrop) this.closeReceiptModal(); };
    }

    static closeReceiptModal() {
        const existing = document.getElementById('receipt-modal-backdrop');
        if (existing) {
            existing.remove();
            window.currentReceiptModal = null;
        }
    }
}

window.ReceiptUI = ReceiptUI;
function closeReceiptModal() { ReceiptUI.closeReceiptModal(); }