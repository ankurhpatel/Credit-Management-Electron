// Enhanced Electron Print Manager
class PrintManager {
    constructor() {
        this.isElectron = this.detectElectron();
        this.printQueue = [];
        this.printing = false;
    }

    detectElectron() {
        return !!(window && window.process && window.process.type);
    }

    log(message) {
        console.log(`🖨️ PrintManager: ${message}`);
    }

    // Main print function
    async print(content, options = {}) {
        const defaultOptions = {
            title: 'IT Services Receipt',
            pageSize: 'A4',
            margins: { top: 20, bottom: 20, left: 20, right: 20 },
            orientation: 'portrait',
            silent: false,
            printBackground: true,
            color: false,
            deviceName: '',
            collate: false,
            copies: 1,
            pageRanges: {},
            duplexMode: 'simplex',
            dpi: { horizontal: 300, vertical: 300 }
        };

        const printOptions = { ...defaultOptions, ...options };

        try {
            if (this.isElectron) {
                return await this.printElectron(content, printOptions);
            } else {
                return await this.printBrowser(content, printOptions);
            }
        } catch (error) {
            console.error('Print error:', error);
            throw error;
        }
    }

    // Electron-specific printing
    async printElectron(content, options) {
        if (!window.require) {
            throw new Error('Electron require not available');
        }

        const { ipcRenderer } = window.require('electron');
        const { BrowserWindow } = window.require('@electron/remote');

        // Create hidden window for printing
        const printWindow = new BrowserWindow({
            show: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        return new Promise((resolve, reject) => {
            printWindow.loadURL('data:text/html;charset=utf-8,' + encodeURI(this.generatePrintHTML(content, options)));

            printWindow.webContents.once('did-finish-load', () => {
                printWindow.webContents.print({
                    silent: options.silent,
                    printBackground: options.printBackground,
                    color: options.color,
                    margins: options.margins,
                    landscape: options.orientation === 'landscape',
                    scaleFactor: 100,
                    pagesPerSheet: 1,
                    collate: options.collate,
                    copies: options.copies,
                    pageRanges: options.pageRanges,
                    duplexMode: options.duplexMode,
                    dpi: options.dpi,
                    header: options.header || '',
                    footer: options.footer || '',
                    pageSize: options.pageSize
                }, (success, failureReason) => {
                    printWindow.close();
                    if (success) {
                        this.log('Print job completed successfully');
                        resolve({ success: true, method: 'electron' });
                    } else {
                        this.log(`Print job failed: ${failureReason}`);
                        reject(new Error(`Print failed: ${failureReason}`));
                    }
                });
            });

            printWindow.webContents.on('crashed', () => {
                printWindow.close();
                reject(new Error('Print window crashed'));
            });
        });
    }

    // Browser-specific printing
    async printBrowser(content, options) {
        return new Promise((resolve, reject) => {
            try {
                // Create print window
                const printWindow = window.open('', '_blank',
                    'width=800,height=600,scrollbars=yes,resizable=yes'
                );

                if (!printWindow) {
                    throw new Error('Failed to open print window. Please allow pop-ups.');
                }

                // Generate print HTML
                const printHTML = this.generatePrintHTML(content, options);
                printWindow.document.write(printHTML);
                printWindow.document.close();

                // Wait for content to load
                printWindow.onload = () => {
                    setTimeout(() => {
                        printWindow.focus();
                        printWindow.print();

                        // Close print window after printing
                        setTimeout(() => {
                            printWindow.close();
                            resolve({ success: true, method: 'browser' });
                        }, 1000);
                    }, 500);
                };

                // Handle print window errors
                printWindow.onerror = (error) => {
                    printWindow.close();
                    reject(new Error(`Print window error: ${error}`));
                };

            } catch (error) {
                reject(error);
            }
        });
    }

    // Generate HTML for printing
    generatePrintHTML(content, options) {
        const styles = this.generatePrintStyles(options);

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${options.title}</title>
    <style>
        ${styles}
    </style>
</head>
<body>
    <div class="print-container">
        ${typeof content === 'string' ? content : content.innerHTML || content}
    </div>
</body>
</html>
        `;
    }

    // Generate print-specific CSS
    generatePrintStyles(options) {
        return `
            @page {
                size: ${options.pageSize} ${options.orientation};
                margin: ${options.margins.top}mm ${options.margins.right}mm ${options.margins.bottom}mm ${options.margins.left}mm;
            }

            * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            body {
                font-family: Arial, sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #333;
                background: white;
                margin: 0;
                padding: 0;
            }

            .print-container {
                width: 100%;
                max-width: none;
                margin: 0;
                padding: 0;
            }

            /* Hide non-printable elements */
            .no-print,
            .print-hide,
            button:not(.print-show),
            input[type="button"]:not(.print-show),
            input[type="submit"]:not(.print-show),
            .sidebar,
            .navigation,
            .toolbar,
            .modal-overlay,
            .notification {
                display: none !important;
            }

            /* Receipt-specific styles */
            .receipt-document {
                width: 100%;
                background: white;
                padding: 10mm;
                box-sizing: border-box;
            }

            .business-header {
                text-align: center;
                margin-bottom: 20px;
                border-bottom: 2px solid #333;
                padding-bottom: 15px;
            }

            .business-header h1 {
                font-size: 18px;
                margin: 0 0 5px 0;
                color: #333;
            }

            .business-info {
                font-size: 10px;
                color: #666;
            }

            .receipt-header {
                margin-bottom: 15px;
            }

            .receipt-title h2 {
                text-align: center;
                font-size: 16px;
                margin: 0 0 10px 0;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .receipt-metadata {
                display: flex;
                justify-content: space-between;
                flex-wrap: wrap;
                font-size: 10px;
            }

            .metadata-row {
                display: flex;
                justify-content: space-between;
                width: 48%;
                margin-bottom: 2px;
            }

            .customer-info {
                margin: 15px 0;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }

            .customer-info h4 {
                margin: 0 0 8px 0;
                font-size: 12px;
                color: #333;
            }

            .customer-details {
                font-size: 10px;
                line-height: 1.3;
            }

            /* Table styles */
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
            }

            .table-header {
                display: flex;
                background: #f5f5f5;
                border: 1px solid #ddd;
                font-weight: bold;
                font-size: 10px;
                padding: 5px 0;
            }

            .table-row {
                display: flex;
                border: 1px solid #ddd;
                border-top: none;
                font-size: 10px;
                padding: 8px 0;
            }

            .table-row:nth-child(even) {
                background: #f9f9f9;
            }

            .col-line { width: 8%; text-align: center; }
            .col-service { width: 35%; padding-left: 5px; }
            .col-period { width: 25%; }
            .col-credits { width: 12%; text-align: center; }
            .col-amount { width: 15%; text-align: right; padding-right: 5px; }

            .service-location, .service-device {
                font-size: 9px;
                color: #666;
                margin-top: 2px;
            }

            .period-status {
                font-size: 9px;
                margin-top: 2px;
            }

            .status-active { color: #4CAF50; }
            .status-expired { color: #f44336; }
            .status-cancelled { color: #ff9800; }

            /* Totals section */
            .receipt-totals {
                margin-top: 20px;
                border-top: 2px solid #333;
                padding-top: 10px;
            }

            .totals-section {
                margin-bottom: 15px;
            }

            .totals-row {
                display: flex;
                justify-content: space-between;
                margin: 3px 0;
                font-size: 11px;
            }

            .totals-row.total {
                border-top: 1px solid #333;
                padding-top: 5px;
                margin-top: 8px;
                font-weight: bold;
                font-size: 12px;
            }

            .payment-info {
                margin-top: 15px;
                padding-top: 10px;
                border-top: 1px solid #ddd;
            }

            .payment-row {
                display: flex;
                justify-content: space-between;
                margin: 3px 0;
                font-size: 10px;
            }

            .status-paid {
                font-weight: bold;
                color: #4CAF50;
            }

            /* Footer */
            .receipt-footer {
                margin-top: 20px;
                border-top: 1px solid #ddd;
                padding-top: 15px;
            }

            .footer-notes h5 {
                font-size: 11px;
                margin: 0 0 8px 0;
            }

            .footer-notes-list {
                font-size: 9px;
                margin: 0;
                padding-left: 15px;
                line-height: 1.4;
            }

            .footer-notes-list li {
                margin-bottom: 3px;
            }

            .contact-info {
                margin-top: 15px;
            }

            .contact-info h5 {
                font-size: 11px;
                margin: 0 0 8px 0;
            }

            .contact-info div {
                font-size: 9px;
                margin-bottom: 2px;
            }

            .receipt-signature {
                text-align: center;
                margin-top: 20px;
                padding-top: 15px;
                border-top: 1px solid #ddd;
            }

            .signature-label {
                font-size: 11px;
                font-weight: bold;
                margin-bottom: 5px;
            }

            .signature-date {
                font-size: 9px;
                color: #666;
            }

            /* QR Code placeholder */
            .qr-code-section {
                text-align: center;
                margin: 15px 0;
            }

            .qr-placeholder {
                width: 60px;
                height: 60px;
                border: 2px solid #333;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 8px;
                font-weight: bold;
            }

            .qr-label {
                font-size: 9px;
                margin-top: 5px;
                color: #666;
            }

            /* Utility classes */
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: bold; }
            .text-small { font-size: 9px; }
            .text-large { font-size: 13px; }
            .positive { color: #4CAF50; }
            .negative { color: #f44336; }

            /* Responsive adjustments for smaller receipts */
            @media print and (max-width: 210mm) {
                body { font-size: 11px; }
                .receipt-document { padding: 5mm; }
                .business-header h1 { font-size: 16px; }
                .receipt-title h2 { font-size: 14px; }
            }
        `;
    }

    // Utility methods for common print jobs
    async printReceipt(receiptData, options = {}) {
        const receiptHTML = this.generateReceiptHTML(receiptData);
        return await this.print(receiptHTML, {
            ...options,
            title: `Receipt ${receiptData.receiptId || 'Unknown'}`,
            pageSize: 'A4',
            margins: { top: 10, bottom: 10, left: 10, right: 10 }
        });
    }

    generateReceiptHTML(receiptData) {
        // This would generate a complete receipt HTML based on receiptData
        // For now, return a basic template
        return `
            <div class="receipt-document">
                <div class="business-header">
                    <h1>💳 IT Services Credit Management</h1>
                    <div class="business-info">
                        <div>Professional IT Services & Solutions</div>
                        <div>📧 support@itservices.com | 📞 (555) 123-4567</div>
                    </div>
                </div>
                
                <div class="receipt-header">
                    <div class="receipt-title">
                        <h2>Service Receipt</h2>
                    </div>
                    <div class="receipt-metadata">
                        <div class="metadata-row">
                            <span>Receipt #:</span>
                            <span>${receiptData.receiptId || 'N/A'}</span>
                        </div>
                        <div class="metadata-row">
                            <span>Date:</span>
                            <span>${new Date().toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                
                <div class="receipt-content">
                    ${receiptData.content || 'Receipt content would go here'}
                </div>
                
                <div class="receipt-footer">
                    <div class="receipt-signature">
                        <div class="signature-label">Thank you for your business!</div>
                        <div class="signature-date">Generated: ${new Date().toLocaleString()}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Print current page
    printCurrentPage() {
        if (this.isElectron) {
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                ipcRenderer.send('print-current-page');
            }
        } else {
            window.print();
        }
    }

    // Get available printers (Electron only)
    async getPrinters() {
        if (!this.isElectron || !window.require) {
            throw new Error('getPrinters is only available in Electron');
        }

        const { ipcRenderer } = window.require('electron');
        return await ipcRenderer.invoke('get-printers');
    }

    // Print to specific printer (Electron only)
    async printToPrinter(content, printerName, options = {}) {
        if (!this.isElectron) {
            throw new Error('printToPrinter is only available in Electron');
        }

        return await this.print(content, {
            ...options,
            deviceName: printerName,
            silent: true
        });
    }
}

// Create global instance
const printManager = new PrintManager();

// Make it globally available
window.printManager = printManager;
window.PrintManager = PrintManager;

// Enhanced print function for global use
window.print = function (content, options) {
    if (content) {
        return printManager.print(content, options);
    } else {
        return printManager.printCurrentPage();
    }
};

// Console log for successful load
console.log('🖨️ Enhanced Electron Print Manager loaded successfully');

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PrintManager, printManager };
}
