class TransactionUI {
    static allVendorTransactions = [];
    static allCustomerSales = {};
    static currentSort = {
        type: 'vendor', // 'vendor' or 'customer'
        column: 'date',
        direction: 'desc'
    };
    
    // Pagination state
    static pagination = {
        itemsPerPage: 10,
        vendorPage: 1,
        customerPage: 1
    };

    static initFilters() {
        const yearSelect = document.getElementById('transFilterYear');
        if (!yearSelect) return;

        // Only populate if it's currently empty to avoid overwriting user selection
        if (yearSelect.options.length > 0) return;

        console.log('📅 Initializing Year Filters...');
        const currentYear = new Date().getFullYear();
        
        // Use a temporary array to build options
        const options = [
            { value: currentYear, text: `${currentYear} (Current Year)` },
            { value: 'ytd', text: 'Year to Date' },
            { value: 'last12', text: 'Last 12 Months' }
        ];

        // Add past 5 years
        for (let i = 1; i <= 5; i++) {
            options.push({ value: currentYear - i, text: (currentYear - i).toString() });
        }

        // Clear and populate
        yearSelect.innerHTML = '';
        options.forEach(opt => {
            const el = document.createElement('option');
            el.value = opt.value;
            el.textContent = opt.text;
            yearSelect.appendChild(el);
        });

        // Set defaults
        yearSelect.value = currentYear;
        const monthSelect = document.getElementById('transFilterMonth');
        if (monthSelect) {
            monthSelect.value = new Date().getMonth(); // 0-11
        }
    }

    static async loadVendorTransactions() {
        this.initFilters();
        try {
            console.log('🏭 Loading vendor transactions...');
            const container = document.getElementById('vendorTransactionsList');
            if (container) {
                container.innerHTML = '<div class="loading-message">Loading vendor transactions...</div>';
            }
            
            const transactions = await CreditsAPI.loadVendorTransactions();
            this.allVendorTransactions = Array.isArray(transactions) ? transactions : []; 
            this.refreshViews(); 
            
            console.log(`✅ Loaded ${this.allVendorTransactions.length} vendor transactions`);
        } catch (error) {
            console.error('❌ Error loading vendor transactions:', error);
        }
    }

    static async loadCustomerSales() {
        this.initFilters();
        try {
            console.log('📊 Loading customer sales...');
            const container = document.getElementById('customerSalesList');
            if (container) {
                container.innerHTML = '<div class="loading-message">Loading customer sales...</div>';
            }
            
            const customerSales = await SubscriptionsAPI.loadCustomerSales();
            this.allCustomerSales = customerSales || {};
            this.refreshViews(); 
            
            console.log('✅ Customer sales loaded');
        } catch (error) {
            console.error('❌ Error loading customer sales:', error);
        }
    }

    static flattenCustomerSales(salesData) {
        if (!salesData) return [];
        const flatSales = [];
        Object.entries(salesData).forEach(([customerName, customerData]) => {
            if (customerData && customerData.classifications) {
                Object.entries(customerData.classifications).forEach(([classification, subs]) => {
                    if (Array.isArray(subs)) {
                        subs.forEach(sub => {
                            flatSales.push({
                                customerName,
                                classification,
                                ...sub,
                                bundle_id: sub.bundle_id || sub.BundleID,
                                item_type: sub.item_type || sub.ItemType
                            });
                        });
                    }
                });
            }
        });
        return flatSales;
    }

    static applyFilters() {
        this.pagination.vendorPage = 1;
        this.pagination.customerPage = 1;
        this.refreshViews();
    }

    static refreshViews() {
        try {
            const query = document.getElementById('transactionSearch')?.value.toLowerCase().trim() || '';
            const monthFilter = document.getElementById('transFilterMonth')?.value;
            const yearFilter = document.getElementById('transFilterYear')?.value;

            // 1. Vendor Transactions
            let filteredVendor = this.filterData(this.allVendorTransactions, query, monthFilter, yearFilter, 'purchase_date');
            filteredVendor = this.sortData(filteredVendor, 'vendor');
            this.displayVendorTransactions(filteredVendor);

            // 2. Customer Sales (Grouped)
            this.sortAndDisplayCustomerSales();
        } catch (err) {
            console.error('Refresh Views Error:', err);
        }
    }

    static sortAndDisplayCustomerSales() {
        try {
            const rawSales = this.flattenCustomerSales(this.allCustomerSales);
            const groups = {};
            const standalone = [];

            rawSales.forEach(sale => {
                const bid = sale.bundle_id || sale.BundleID;
                if (bid) {
                    if (!groups[bid]) groups[bid] = [];
                    groups[bid].push(sale);
                } else {
                    standalone.push(sale);
                }
            });

            const displayList = standalone.map(s => ({ ...s, isBundle: false }));
            Object.entries(groups).forEach(([bid, items]) => {
                const first = items[0];
                const totalAmount = items.reduce((sum, i) => sum + parseFloat(i.amount_paid || 0), 0);
                const totalCredits = items.reduce((sum, i) => sum + parseInt(i.credits_used || 0), 0);
                const itemNames = items.map(i => i.service_name || 'Item').join(' + ');

                displayList.push({
                    ...first,
                    isBundle: true,
                    service_name: `📦 COMBO: ${itemNames}`,
                    amount_paid: totalAmount,
                    credits_used: totalCredits,
                    bundleItems: items
                });
            });

            const query = document.getElementById('transactionSearch')?.value.toLowerCase().trim() || '';
            const monthFilter = document.getElementById('transFilterMonth')?.value;
            const yearFilter = document.getElementById('transFilterYear')?.value;

            const filtered = displayList.filter(item => {
                // Search check
                if (query) {
                    const searchStr = `${item.customerName} ${item.service_name} ${item.notes || ''}`.toLowerCase();
                    if (!searchStr.includes(query)) return false;
                }

                // Date check
                const itemDate = new Date(item.start_date || item.StartDate);
                if (isNaN(itemDate)) return true;

                const now = new Date();
                if (yearFilter === 'ytd') {
                    return itemDate >= new Date(now.getFullYear(), 0, 1) && itemDate <= now;
                } else if (yearFilter === 'last12') {
                    const start = new Date(); start.setFullYear(now.getFullYear() - 1);
                    return itemDate >= start && itemDate <= now;
                } else if (yearFilter && yearFilter !== 'all') {
                    const selectedYear = parseInt(yearFilter);
                    if (monthFilter !== 'all') {
                        const selectedMonth = parseInt(monthFilter);
                        return itemDate.getFullYear() === selectedYear && itemDate.getMonth() === selectedMonth;
                    }
                    return itemDate.getFullYear() === selectedYear;
                }
                return true;
            });

            // Sort
            filtered.sort((a, b) => {
                const col = this.currentSort.column;
                let valA, valB;
                if (col === 'date') {
                    valA = new Date(a.start_date || a.StartDate).getTime();
                    valB = new Date(b.start_date || b.StartDate).getTime();
                } else if (col === 'amount') {
                    valA = parseFloat(a.amount_paid || 0);
                    valB = parseFloat(b.amount_paid || 0);
                } else {
                    valA = (a.customerName || '').toLowerCase();
                    valB = (b.customerName || '').toLowerCase();
                }
                return this.currentSort.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
            });

            this.displayCustomerSales(filtered);
        } catch (err) {
            console.error('Sort Error:', err);
        }
    }

    static filterData(data, query, month, year, dateField) {
        if (!Array.isArray(data)) return [];
        return data.filter(item => {
            if (query) {
                const searchStr = JSON.stringify(item).toLowerCase();
                if (!searchStr.includes(query)) return false;
            }

            const itemDate = new Date(item[dateField] || item.PurchaseDate || item.StartDate);
            if (isNaN(itemDate)) return true;

            const now = new Date();
            if (year === 'ytd') {
                return itemDate >= new Date(now.getFullYear(), 0, 1) && itemDate <= now;
            } else if (year === 'last12') {
                const start = new Date(); start.setFullYear(now.getFullYear() - 1);
                return itemDate >= start && itemDate <= now;
            } else if (year && year !== 'all') {
                const selectedYear = parseInt(year);
                if (month !== 'all') {
                    const selectedMonth = parseInt(month);
                    return itemDate.getFullYear() === selectedYear && itemDate.getMonth() === selectedMonth;
                }
                return itemDate.getFullYear() === selectedYear;
            }
            return true;
        });
    }

    static sortData(data, type) {
        if (!Array.isArray(data)) return [];
        return data.sort((a, b) => {
            const col = this.currentSort.column;
            let valA, valB;
            
            if (col === 'date') {
                valA = new Date(a.purchase_date || a.PurchaseDate || a.start_date || a.StartDate).getTime();
                valB = new Date(b.purchase_date || b.PurchaseDate || b.start_date || b.StartDate).getTime();
            } else if (col === 'amount' || col === 'cost') {
                valA = parseFloat(a.price_usd || a.PriceUSD || a.amount_paid || a.AmountPaid || 0);
                valB = parseFloat(b.price_usd || b.PriceUSD || b.amount_paid || b.AmountPaid || 0);
            } else {
                valA = (a.vendor_name || a.VendorName || a.customerName || '').toLowerCase();
                valB = (b.vendor_name || b.VendorName || b.customerName || '').toLowerCase();
            }

            return this.currentSort.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
        });
    }

    static handleSort(type, column) {
        if (this.currentSort.type === type && this.currentSort.column === column) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.type = type;
            this.currentSort.column = column;
            this.currentSort.direction = (['date', 'amount', 'cost', 'credits'].includes(column)) ? 'desc' : 'asc';
        }
        this.refreshViews();
    }
    
    static changePage(type, delta) {
        if (type === 'vendor') this.pagination.vendorPage += delta;
        else this.pagination.customerPage += delta;
        this.refreshViews();
    }

    static renderPaginationControls(elementId, currentPage, totalItems, type) {
        const container = document.getElementById(elementId);
        if (!container) return;
        const totalPages = Math.ceil(totalItems / this.pagination.itemsPerPage);
        if (totalPages <= 1) { container.innerHTML = ''; return; }

        container.innerHTML = `
            <button class="btn-small btn-secondary" ${currentPage === 1 ? 'disabled' : ''} 
                onclick="TransactionUI.changePage('${type}', -1)">Previous</button>
            <span style="font-weight: 600;">Page ${currentPage} of ${totalPages}</span>
            <button class="btn-small btn-secondary" ${currentPage === totalPages ? 'disabled' : ''} 
                onclick="TransactionUI.changePage('${type}', 1)">Next</button>
        `;
    }

    static displayVendorTransactions(filteredTransactions) {
        const container = document.getElementById('vendorTransactionsList');
        if (!container) return;
        if (filteredTransactions.length === 0) {
            container.innerHTML = '<div class="no-data">No vendor transactions match criteria.</div>';
            const pag = document.getElementById('vendorPagination'); if(pag) pag.innerHTML = '';
            return;
        }

        const totalItems = filteredTransactions.length;
        const page = this.pagination.vendorPage;
        const start = (page - 1) * this.pagination.itemsPerPage;
        const paginatedItems = filteredTransactions.slice(start, start + this.pagination.itemsPerPage);

        const totalCost = filteredTransactions.reduce((sum, t) => sum + parseFloat(t.price_usd || 0), 0);
        const totalCredits = filteredTransactions.reduce((sum, t) => sum + parseInt(t.credits || 0), 0);

        container.innerHTML = `
            <div class="table-summary-cards">
                <div class="summary-card"><span class="summary-label">Transactions</span><span class="summary-value">${totalItems}</span></div>
                <div class="summary-card"><span class="summary-label">Total Cost</span><span class="summary-value">${this.formatCurrency(totalCost)}</span></div>
                <div class="summary-card"><span class="summary-label">Credits/Units</span><span class="summary-value">${this.formatNumber(totalCredits)}</span></div>
            </div>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th onclick="TransactionUI.handleSort('vendor', 'vendor')" style="cursor: pointer;">Vendor ${this.getSortIndicator('vendor', 'vendor')}</th>
                            <th onclick="TransactionUI.handleSort('vendor', 'service')" style="cursor: pointer;">Service ${this.getSortIndicator('vendor', 'service')}</th>
                            <th onclick="TransactionUI.handleSort('vendor', 'date')" style="cursor: pointer;">Date ${this.getSortIndicator('vendor', 'date')}</th>
                            <th class="text-right">Cost (USD)</th>
                            <th class="text-right">Qty</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedItems.map(trans => `
                            <tr>
                                <td><strong>${trans.vendor_name || 'Vendor'}</strong></td>
                                <td>${trans.service_name}</td>
                                <td>${this.formatDate(trans.purchase_date)}</td>
                                <td class="text-right font-mono">${this.formatCurrency(trans.price_usd)}</td>
                                <td class="text-right font-mono">${this.formatNumber(trans.credits)}</td>
                                <td>
                                    <button onclick="PrintManager.printVendorTransaction('${trans.transaction_id || trans.id}')" class="btn-icon">🖨️</button>
                                    <button onclick="TransactionUI.deleteTransaction('vendor', '${trans.transaction_id || trans.id}')" class="btn-icon text-danger">🗑️</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        this.renderPaginationControls('vendorPagination', page, totalItems, 'vendor');
    }

    static displayCustomerSales(filteredSales) {
        const container = document.getElementById('customerSalesList');
        if (!container) return;
        if (filteredSales.length === 0) {
            container.innerHTML = '<div class="no-data">No customer sales match criteria.</div>';
            const pag = document.getElementById('customerPagination'); if(pag) pag.innerHTML = '';
            return;
        }

        const totalItems = filteredSales.length;
        const page = this.pagination.customerPage;
        const start = (page - 1) * this.pagination.itemsPerPage;
        const paginatedItems = filteredSales.slice(start, start + this.pagination.itemsPerPage);

        const totalRev = filteredSales.reduce((sum, s) => sum + parseFloat(s.amount_paid || 0), 0);

        container.innerHTML = `
            <div class="table-summary-cards">
                <div class="summary-card"><span class="summary-label">Transactions</span><span class="summary-value">${totalItems}</span></div>
                <div class="summary-card"><span class="summary-label">Total Revenue</span><span class="summary-value">${this.formatCurrency(totalRev)}</span></div>
            </div>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th onclick="TransactionUI.handleSort('customer', 'customer')" style="cursor: pointer;">Customer ${this.getSortIndicator('customer', 'customer')}</th>
                            <th onclick="TransactionUI.handleSort('customer', 'service')" style="cursor: pointer;">Service ${this.getSortIndicator('customer', 'service')}</th>
                            <th>Payment</th>
                            <th onclick="TransactionUI.handleSort('customer', 'date')" style="cursor: pointer;">Date ${this.getSortIndicator('customer', 'date')}</th>
                            <th class="text-right">Amount</th>
                            <th class="text-center">Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedItems.map(sale => `
                            <tr>
                                <td><strong>${sale.customerName}</strong></td>
                                <td>${sale.service_name}</td>
                                <td><small>${sale.payment_type} | ${sale.payment_status}</small></td>
                                <td>${this.formatDate(sale.start_date)}</td>
                                <td class="text-right font-mono">${this.formatCurrency(sale.amount_paid)}</td>
                                <td class="text-center"><span class="status-badge ${sale.order_status === 'Open' ? 'status-expired' : 'status-active'}">${sale.order_status}</span></td>
                                <td>
                                    ${sale.order_status === 'Open' ? 
                                    `<button onclick="TransactionUI.closeOrder('${sale.isBundle ? 'bundle' : 'single'}', '${sale.isBundle ? sale.bundle_id : sale.id}')" 
                                             class="btn-icon text-success" title="Close Order">✅</button>` : ''}
                                    <button onclick="${sale.isBundle ? `PrintManager.printCustomerReceipt('${sale.customer_id}')` : `PrintManager.printSingleTransaction('${sale.customer_id}', '${sale.id}')`}" class="btn-icon">🖨️</button>
                                    <button onclick="TransactionUI.deleteTransaction('${sale.isBundle ? 'customer-bundle' : 'customer'}', '${sale.isBundle ? sale.bundle_id : sale.id}')" class="btn-icon text-danger">🗑️</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        this.renderPaginationControls('customerPagination', page, totalItems, 'customer');
    }

    static async closeOrder(type, id) {
        // Instead of directly closing, we send them to POS to fill details
        if (window.POSUI) {
            POSUI.loadOrderForUpdate(type, id);
        }
    }

    static async deleteTransaction(type, id) {
        if (!confirm(`Confirm delete ${type}? Stock will be adjusted.`)) return;
        const password = prompt('Password (1234):');
        if (password !== '1234') { Alerts.showError('Error', 'Invalid Password'); return; }

        try {
            let endpoint = type === 'vendor' ? `/api/vendor-transactions/${id}` : (type === 'customer-bundle' ? `/api/subscriptions/bundle/${id}` : `/api/subscriptions/${id}`);
            const response = await fetch(endpoint, { method: 'DELETE', headers: { 'password': password } });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            Alerts.showSuccess('Deleted', result.message);
            await Promise.all([this.loadVendorTransactions(), this.loadCustomerSales()]);
            if (window.POSUI) POSUI.loadCatalog();
            DashboardUI.loadStats();
        } catch (error) { Alerts.showError('Error', error.message); }
    }

    static getSortIndicator(type, column) {
        if (this.currentSort.type !== type || this.currentSort.column !== column) return '<span class="sort-icon">↕</span>';
        return this.currentSort.direction === 'asc' ? '▲' : '▼';
    }

    static formatDate(d) { return d ? new Date(d).toLocaleDateString() : 'N/A'; }
    static formatCurrency(a) { return '$' + parseFloat(a || 0).toFixed(2); }
    static formatNumber(n) { return parseInt(n || 0).toLocaleString(); }
    static formatStatus(s) { return s || 'N/A'; }
}

window.TransactionUI = TransactionUI;
