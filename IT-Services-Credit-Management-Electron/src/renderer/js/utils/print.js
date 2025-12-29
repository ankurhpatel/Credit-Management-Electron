// Enhanced Print functionality for Electron application with custom preview and individual receipts
class PrintManager {
    static async printContent(elementId, title = 'Print Document') {
        try {
            console.log(`🖨️ Preparing to print: ${title}`);

            const element = document.getElementById(elementId);
            if (!element) {
                throw new Error(`Element with ID '${elementId}' not found`);
            }

            // Use Electron's native print instead of popup windows
            await this.electronPrint(element, title);

        } catch (error) {
            console.error('❌ Print error:', error);
            Alerts.showError('Print Error', error.message);
        }
    }

    static async electronPrint(element, title) {
        try {
            // Create a temporary print container
            const printContainer = document.createElement('div');
            printContainer.id = 'electron-print-container';
            printContainer.style.cssText = 'display: none;';

            // Prepare the content for printing
            const printContent = this.preparePrintContentForElectron(element, title);
            printContainer.innerHTML = printContent;

            // Add to body temporarily
            document.body.appendChild(printContainer);

            // Hide the main content and show print content
            const mainContent = document.body.children;
            const originalDisplay = [];

            // Hide all main content
            Array.from(mainContent).forEach((child, index) => {
                if (child.id !== 'electron-print-container') {
                    originalDisplay[index] = child.style.display;
                    child.style.display = 'none';
                }
            });

            // Show print content
            printContainer.style.display = 'block';

            // Add print-specific styles
            this.addPrintStyles();

            // Use Electron's native print via IPC instead of window.print()
            // This allows us to control headers/footers
            console.log('🖨️ Opening print dialog via Electron API...');
            
            if (window.electronAPI && window.electronAPI.printPage) {
                await window.electronAPI.printPage({
                    printBackground: true,
                    silent: false
                });
            } else {
                // Fallback to window.print() if API not available
                window.print();
            }

            // Clean up after print dialog
            setTimeout(() => {
                // Remove print styles
                this.removePrintStyles();

                // Restore original content
                Array.from(mainContent).forEach((child, index) => {
                    if (child.id !== 'electron-print-container') {
                        child.style.display = originalDisplay[index] || '';
                    }
                });

                // Remove print container
                if (printContainer.parentNode) {
                    document.body.removeChild(printContainer);
                }

                console.log('✅ Print cleanup completed');
            }, 1000);

        } catch (error) {
            console.error('❌ Electron print error:', error);
            throw error;
        }
    }

    // NEW: Custom Print Preview Modal
    static showCustomPrintPreview(elementId, title) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error('Element not found for preview');
            return;
        }

        const printContent = this.preparePrintContentForElectron(element, title);

        // Create preview modal
        const modal = document.createElement('div');
        modal.id = 'custom-print-preview';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            z-index: 10000;
            display: flex;
            flex-direction: column;
        `;

        const toolbar = document.createElement('div');
        toolbar.style.cssText = `
            background: #333;
            color: white;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        toolbar.innerHTML = `
            <div>
                <h3 style="margin: 0; color: white;">🖨️ Print Preview: ${title}</h3>
                <small style="color: #ccc;">This is how your document will appear when printed</small>
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="preview-print-btn" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                    🖨️ Print
                </button>
                <button id="preview-pdf-btn" style="padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                    📄 Save PDF
                </button>
                <button id="preview-close-btn" style="padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                    ✕ Close
                </button>
            </div>
        `;

        const preview = document.createElement('div');
        preview.style.cssText = `
            flex: 1;
            background: #f5f5f5;
            overflow: auto;
            display: flex;
            justify-content: center;
            padding: 20px;
        `;

        const previewContent = document.createElement('div');
        previewContent.style.cssText = `
            background: white;
            width: 8.5in;
            min-height: 11in;
            padding: 0.75in;
            box-shadow: 0 0 20px rgba(0,0,0,0.3);
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
        `;

        previewContent.innerHTML = printContent;
        preview.appendChild(previewContent);

        modal.appendChild(toolbar);
        modal.appendChild(preview);
        document.body.appendChild(modal);

        // Event handlers
        document.getElementById('preview-print-btn').onclick = () => {
            modal.remove();
            this.printContent(elementId, title);
        };

        document.getElementById('preview-pdf-btn').onclick = async () => {
            modal.remove();
            await this.saveToPDF(elementId, title);
        };

        document.getElementById('preview-close-btn').onclick = () => {
            modal.remove();
        };

        // Close on ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    // NEW: Save to PDF functionality
    static async saveToPDF(elementId, title) {
        try {
            if (window.electronAPI && window.electronAPI.savePDF) {
                const result = await window.electronAPI.savePDF(`${title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
                if (result.success) {
                    Alerts.showSuccess('PDF Saved', 'Document saved successfully as PDF');
                } else {
                    Alerts.showError('PDF Error', result.error);
                }
            } else {
                // Fallback: attempt to print
                this.printContent(elementId, title);
            }
        } catch (error) {
            console.error('❌ PDF save error:', error);
            Alerts.showError('PDF Error', 'Failed to save PDF');
        }
    }

    // NEW: Print individual service receipt
    static async printIndividualServiceReceipt(customerId, serviceName, classification) {
        try {
            console.log(`🖨️ Printing individual service receipt: ${serviceName} for customer ${customerId}`);

            // Load customer transaction data
            const data = await CustomersAPI.loadTransactions(customerId);

            // Filter for specific service and classification
            const filteredSubscriptions = data.subscriptions.filter(sub => {
                const subServiceName = sub.service_name || sub.ServiceName || 'IT App Services';
                const subClassification = (sub.classification || sub.Classification || '').toLowerCase();
                const targetClassification = (classification || '').toLowerCase();

                return subServiceName === serviceName &&
                    (targetClassification === '' || subClassification === targetClassification);
            });

            if (filteredSubscriptions.length === 0) {
                Alerts.showError('No Data', 'No transactions found for the specified service and location');
                return;
            }

            // Create filtered data structure
            const filteredData = {
                customer: data.customer,
                subscriptions: filteredSubscriptions,
                groupedSubscriptions: {
                    [classification || 'Default']: filteredSubscriptions
                },
                summary: {
                    totalPaid: filteredSubscriptions.reduce((sum, sub) => sum + parseFloat(sub.amount_paid || sub.AmountPaid || 0), 0),
                    totalMonths: filteredSubscriptions.reduce((sum, sub) => sum + parseInt(sub.credits_used || sub.CreditsUsed || 0), 0),
                    totalTransactions: filteredSubscriptions.length
                }
            };

            // Create a temporary container for the individual receipt
            const tempContainer = document.createElement('div');
            tempContainer.id = 'temp-individual-receipt-container';
            tempContainer.style.display = 'none';
            document.body.appendChild(tempContainer);

            // Render the filtered receipt
            ReceiptUI.renderIndividualServiceReceipt(filteredData, tempContainer, serviceName, classification);

            // Print the receipt
            const receiptTitle = `${serviceName} Receipt - ${classification || 'All Locations'} - ${data.customer.name || data.customer.Name}`;
            await this.printContent('temp-individual-receipt-container', receiptTitle);

            // Clean up
            setTimeout(() => {
                if (document.body.contains(tempContainer)) {
                    document.body.removeChild(tempContainer);
                }
            }, 2000);

        } catch (error) {
            console.error('❌ Error printing individual service receipt:', error);
            Alerts.showError('Print Error', 'Failed to print individual service receipt');
        }
    }

    // NEW: Print single transaction receipt
    static async printSingleTransaction(customerId, subscriptionId) {
        try {
            console.log(`🖨️ Printing single transaction: ${subscriptionId} for customer ${customerId}`);

            // Load customer transaction data
            const data = await CustomersAPI.loadTransactions(customerId);

            // Find specific subscription
            const subscription = data.subscriptions.find(sub => sub.id === subscriptionId);

            if (!subscription) {
                Alerts.showError('Error', 'Transaction not found');
                return;
            }

            // Create data structure for single transaction
            const singleData = {
                customer: data.customer,
                subscription: subscription,
                summary: {
                    totalPaid: parseFloat(subscription.amount_paid || subscription.AmountPaid || 0),
                    totalMonths: parseInt(subscription.credits_used || subscription.CreditsUsed || 0),
                    totalTransactions: 1
                }
            };

            // Create a temporary container
            const tempContainer = document.createElement('div');
            tempContainer.id = 'temp-single-receipt-container';
            tempContainer.style.display = 'none';
            document.body.appendChild(tempContainer);

            // Render the receipt
            ReceiptUI.renderSingleTransactionReceipt(singleData, tempContainer);

            // Print the receipt
            const serviceName = subscription.service_name || subscription.ServiceName || 'Service';
            const receiptTitle = `Receipt - ${serviceName} - ${data.customer.name || data.customer.Name}`;
            await this.printContent('temp-single-receipt-container', receiptTitle);

            // Clean up
            setTimeout(() => {
                if (document.body.contains(tempContainer)) {
                    document.body.removeChild(tempContainer);
                }
            }, 2000);

        } catch (error) {
            console.error('❌ Error printing single transaction:', error);
            Alerts.showError('Print Error', 'Failed to print transaction receipt');
        }
    }

    // NEW: Print vendor transaction receipt
    static async printVendorTransaction(transactionId) {
        try {
            console.log(`🖨️ Printing vendor transaction: ${transactionId}`);

            // Find transaction in loaded data (or fetch if needed, but usually loaded)
            let transaction = TransactionUI.allVendorTransactions.find(t => 
                (t.transaction_id || t.id || t.ID) == transactionId
            );
            
            if (!transaction) {
                // Try fetching if not found locally
                const allTrans = await CreditsAPI.loadVendorTransactions();
                transaction = allTrans.find(t => 
                    (t.transaction_id || t.id || t.ID) == transactionId
                );
            }

            if (!transaction) {
                Alerts.showError('Error', 'Vendor transaction not found');
                return;
            }

            // Create a temporary container
            const tempContainer = document.createElement('div');
            tempContainer.id = 'temp-vendor-receipt-container';
            tempContainer.style.display = 'none';
            document.body.appendChild(tempContainer);

            // Build HTML for vendor receipt
            const html = `
                <div class="customer-receipt">
                    <div class="receipt-header">
                        <h3>🏭 Vendor Purchase Record</h3>
                        <div class="receipt-info">
                            <p><strong>Vendor:</strong> ${transaction.vendor_name || transaction.VendorName}</p>
                            <p><strong>Date:</strong> ${TransactionUI.formatDate(transaction.purchase_date || transaction.PurchaseDate)}</p>
                            <p><strong>Transaction ID:</strong> ${transaction.transaction_id || transaction.id || transaction.ID}</p>
                        </div>
                    </div>

                    <div class="receipt-summary">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span>Service:</span>
                            <strong>${transaction.service_name || transaction.ServiceName}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span>Credits Purchased:</span>
                            <strong>${TransactionUI.formatNumber(transaction.credits || transaction.Credits)}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-top: 1px solid #ccc; padding-top: 10px;">
                            <span>Total Cost (USD):</span>
                            <strong style="font-size: 1.2em;">${TransactionUI.formatCurrency(transaction.price_usd || transaction.PriceUSD)}</strong>
                        </div>
                        ${(transaction.notes || transaction.Notes) ? `
                            <div style="margin-top: 15px; font-size: 0.9em; color: #666;">
                                <strong>Notes:</strong><br>
                                ${transaction.notes || transaction.Notes}
                            </div>
                        ` : ''}
                    </div>

                    <div class="receipt-footer">
                        <p>Internal Record - Not for Resale</p>
                        <p>Thank you for your business!</p>
                    </div>
                </div>
            `;
            
            tempContainer.innerHTML = html;

            // Print the receipt
            const vendorName = transaction.vendor_name || transaction.VendorName || 'Vendor';
            const receiptTitle = `Purchase Record - ${vendorName} - ${TransactionUI.formatDate(transaction.purchase_date || transaction.PurchaseDate)}`;
            await this.printContent('temp-vendor-receipt-container', receiptTitle);

            // Clean up
            setTimeout(() => {
                if (document.body.contains(tempContainer)) {
                    document.body.removeChild(tempContainer);
                }
            }, 2000);

        } catch (error) {
            console.error('❌ Error printing vendor transaction:', error);
            Alerts.showError('Print Error', 'Failed to print vendor transaction record');
        }
    }

    static preparePrintContentForElectron(element, title) {
        const content = element.cloneNode(true);

        // Remove non-printable elements from the cloned content
        const nonPrintableSelectors = [
            '.btn-primary', '.btn-success', '.btn-danger', '.btn-secondary', '.btn-info',
            '.btn-small', '.customer-actions', '.vendor-actions', '.form-actions',
            '.tab-nav', '.customer-tabs', '.vendor-tabs', '.search-container',
            '.no-print', 'button', 'input[type="button"]', 'input[type="submit"]',
            '.receipt-actions', '.print-actions'
        ];

        nonPrintableSelectors.forEach(selector => {
            content.querySelectorAll(selector).forEach(el => el.remove());
        });

        const currentDate = new Date().toLocaleDateString();
        const currentTime = new Date().toLocaleString();

        return `
            <div class="electron-print-wrapper">
                <div class="print-header">
                    <div class="company-header">
                        <h1>💳 IT Services Credit Management</h1>
                        <div class="document-title">${title}</div>
                    </div>
                    <div class="print-meta">
                        <div><strong>Generated:</strong> ${currentTime}</div>
                    </div>
                </div>
                <div class="print-content">
                    ${content.innerHTML}
                </div>
                <div class="print-footer">
                    <div class="footer-left">IT Services Credit Management System</div>
                    <div class="footer-right">${currentDate}</div>
                </div>
            </div>
        `;
    }

    static addPrintStyles() {
        if (document.getElementById('electron-print-styles')) return;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'electron-print-styles';
        styleSheet.textContent = `
            @media print {
                @page {
                    margin: 0.2in;
                    size: letter;
                }
                
                body {
                    font-family: Arial, sans-serif !important;
                    font-size: 12px !important;
                    line-height: 1.4 !important;
                    color: #000 !important;
                    background: white !important;
                }
                
                .electron-print-wrapper {
                    width: 100% !important;
                    background: white !important;
                    padding: 0.2in !important;
                }
                
                .print-header {
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: flex-start !important;
                    border-bottom: 2px solid #000 !important;
                    padding-bottom: 15px !important;
                    margin-bottom: 20px !important;
                }
                
                .company-header h1 {
                    font-size: 18px !important;
                    color: #000 !important;
                    margin: 0 0 5px 0 !important;
                    font-weight: bold !important;
                }
                
                .document-title {
                    font-size: 14px !important;
                    color: #333 !important;
                    font-weight: 600 !important;
                }
                
                .print-meta {
                    text-align: right !important;
                    font-size: 10px !important;
                    color: #666 !important;
                }
                
                .print-content {
                    min-height: 500px !important;
                }
                
                .print-footer {
                    position: fixed !important;
                    bottom: 0.5in !important;
                    left: 0.75in !important;
                    right: 0.75in !important;
                    display: flex !important;
                    justify-content: space-between !important;
                    border-top: 1px solid #ccc !important;
                    padding-top: 8px !important;
                    font-size: 10px !important;
                    color: #666 !important;
                }
                
                /* Individual service receipt styling */
                .individual-service-header {
                    background: #f0f8ff !important;
                    border: 1px solid #000 !important;
                    padding: 15px !important;
                    margin-bottom: 20px !important;
                    text-align: center !important;
                }
                
                .individual-service-header h4 {
                    color: #000 !important;
                    margin: 0 0 5px 0 !important;
                    font-size: 16px !important;
                }
                
                .individual-service-header p {
                    color: #333 !important;
                    margin: 0 !important;
                    font-size: 12px !important;
                }
                
                /* Receipt-specific styling */
                .customer-receipt {
                    background: white !important;
                    border: none !important;
                    box-shadow: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                
                .receipt-header {
                    border-bottom: 1px solid #000 !important;
                    padding-bottom: 15px !important;
                    margin-bottom: 20px !important;
                }
                
                .receipt-header h3 {
                    font-size: 16px !important;
                    color: #000 !important;
                    margin-bottom: 10px !important;
                }
                
                .receipt-info {
                    font-size: 12px !important;
                    line-height: 1.5 !important;
                    color: #000 !important;
                }
                
                .receipt-summary {
                    background: #f5f5f5 !important;
                    border: 1px solid #000 !important;
                    padding: 15px !important;
                    margin-bottom: 20px !important;
                    font-size: 12px !important;
                }
                
                .classification-group h4 {
                    font-size: 14px !important;
                    color: #000 !important;
                    border-bottom: 1px solid #000 !important;
                    padding-bottom: 5px !important;
                    margin: 20px 0 10px 0 !important;
                }
                
                .transaction-item {
                    background: #fafafa !important;
                    border: 1px solid #000 !important;
                    padding: 12px !important;
                    margin-bottom: 10px !important;
                    font-size: 11px !important;
                    line-height: 1.5 !important;
                    page-break-inside: avoid !important;
                }
                
                .receipt-footer {
                    position: relative !important;
                    border-top: 1px solid #000 !important;
                    padding-top: 15px !important;
                    margin-top: 30px !important;
                    text-align: center !important;
                    font-style: italic !important;
                    color: #000 !important;
                    font-size: 11px !important;
                }
                
                /* Ensure all text is black */
                * {
                    color: #000 !important;
                }
            }
            
            @media screen {
                #electron-print-container, #temp-individual-receipt-container {
                    display: none !important;
                }
            }
        `;

        document.head.appendChild(styleSheet);
    }

    static removePrintStyles() {
        const styleSheet = document.getElementById('electron-print-styles');
        if (styleSheet) {
            document.head.removeChild(styleSheet);
        }
    }

    // Print specific customer receipt
    static async printCustomerReceipt(customerId) {
        try {
            console.log(`🖨️ Printing customer receipt: ${customerId}`);

            // Load customer transaction data
            const data = await CustomersAPI.loadTransactions(customerId);

            // Create a temporary container for the receipt
            const tempContainer = document.createElement('div');
            tempContainer.id = 'temp-receipt-container';
            tempContainer.style.display = 'none';
            document.body.appendChild(tempContainer);

            // Render the receipt
            ReceiptUI.renderCustomerReceipt(data, tempContainer);

            // Print the receipt
            await this.printContent('temp-receipt-container', `Customer Receipt - ${data.customer.name || data.customer.Name}`);

            // Clean up
            setTimeout(() => {
                if (document.body.contains(tempContainer)) {
                    document.body.removeChild(tempContainer);
                }
            }, 2000);

        } catch (error) {
            console.error('❌ Error printing customer receipt:', error);
            Alerts.showError('Print Error', 'Failed to print customer receipt');
        }
    }

    // Print current tab content
    static async printCurrentTab() {
        const currentTab = Tabs.getCurrentTab();
        const tabElement = document.getElementById(currentTab);

        if (!tabElement) {
            Alerts.showError('Print Error', 'No content to print');
            return;
        }

        const tabTitles = {
            'dashboard': 'Dashboard Report',
            'pnl': 'P&L Statement',
            'credits': 'Credit Balances Report',
            'customers': 'Customer Management Report',
            'vendors': 'Vendor Management Report',
            'business': 'Business Management Report',
            'transactions': 'Transaction History Report'
        };

        const title = tabTitles[currentTab] || 'Report';
        await this.printContent(currentTab, title);
    }

    // Add print button to any container
    static addPrintButtonToContainer(containerId, title) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Check if print button already exists
        if (container.querySelector('.print-button-added')) return;

        const printButtonContainer = document.createElement('div');
        printButtonContainer.className = 'print-actions no-print print-button-added';
        printButtonContainer.style.cssText = 'margin: 20px 0; text-align: right; border-top: 1px solid #eee; padding-top: 15px;';

        printButtonContainer.innerHTML = `
            <button type="button" class="btn-secondary" onclick="PrintManager.showCustomPrintPreview('${containerId}', '${title}')" style="margin-right: 10px;">
                👁️ Print Preview
            </button>
            <button type="button" class="btn-secondary" onclick="PrintManager.printContent('${containerId}', '${title}')">
                🖨️ Print This Page
            </button>
        `;

        container.appendChild(printButtonContainer);

        console.log(`🖨️ Print buttons added to: ${containerId}`);
    }
}

// Make available globally
window.PrintManager = PrintManager;

// Add keyboard shortcut for printing
document.addEventListener('keydown', function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
        event.preventDefault();
        PrintManager.printCurrentTab();
    }
});

console.log('🖨️ Enhanced Electron Print Manager loaded successfully');
