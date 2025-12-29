class TransactionUI {
    static allVendorTransactions = [];
    static allCustomerSales = {};
    static currentSort = {
        type: 'vendor', // 'vendor' or 'customer'
        column: 'date',
        direction: 'desc'
    };
    
    static pagination = {
        itemsPerPage: 10,
        vendorPage: 1,
        customerPage: 1
    };

    static initFilters() {
        try {
            const yearSelect = document.getElementById('transFilterYear');
            const monthSelect = document.getElementById('transFilterMonth');
            if (!yearSelect) return;

            if (yearSelect.options.length === 0) {
                const currentYear = new Date().getFullYear();
                const options = [
                    { value: currentYear, text: `${currentYear} (Current Year)` },
                    { value: 'ytd', text: 'Year to Date' },
                    { value: 'last12', text: 'Last 12 Months' },
                    { value: 'all', text: 'All Years' }
                ];
                for (let i = 1; i <= 5; i++) {
                    options.push({ value: currentYear - i, text: (currentYear - i).toString() });
                }
                yearSelect.innerHTML = options.map(opt => `<option value="${opt.value}">${opt.text}</option>`).join('');
                yearSelect.value = currentYear;
            }

            if (monthSelect && monthSelect.value === 'all' && !this._monthInitialized) {
                monthSelect.value = new Date().getMonth().toString();
                this._monthInitialized = true;
            }
        } catch (err) {
            console.error('Init Filters Error:', err);
        }
    }

    static async loadVendorTransactions() {
        this.initFilters();
        try {
            const container = document.getElementById('vendorTransactionsList');
            if (container) container.innerHTML = '<div class="loading-message">Loading vendor transactions...</div>';
            
            const response = await fetch('/api/vendor-transactions');
            const transactions = await response.json();
            this.allVendorTransactions = Array.isArray(transactions) ? transactions : []; 
            this.refreshViews(); 
        } catch (error) {
            console.error('❌ Error loading vendor transactions:', error);
        }
    }

    static async loadCustomerSales() {
        this.initFilters();
        try {
            const container = document.getElementById('customerSalesList');
            if (container) container.innerHTML = '<div class="loading-message">Loading customer sales...</div>';
            
            const response = await fetch('/api/customer-sales');
            const customerSales = await response.json();
            this.allCustomerSales = (customerSales && typeof customerSales === 'object' && !customerSales.error) ? customerSales : {};
            this.refreshViews(); 
        } catch (error) {
            console.error('❌ Error loading customer sales:', error);
        }
    }

    static flattenCustomerSales(salesData) {
        const flatSales = [];
        if (!salesData) return flatSales;
        try {
            Object.entries(salesData).forEach(([customerName, customerData]) => {
                if (customerData && customerData.classifications) {
                    Object.entries(customerData.classifications).forEach(([classification, subs]) => {
                        if (Array.isArray(subs)) {
                            subs.forEach(sub => {
                                if (!sub) return;
                                flatSales.push({
                                    customerName: customerName || 'Unknown',
                                    classification: classification || 'General',
                                    ...sub,
                                    id: sub.id || sub.ID || 'missing-id',
                                    customer_id: sub.customer_id || sub.CustomerID || 'missing-cust-id',
                                    bundle_id: sub.bundle_id || sub.BundleID || null
                                });
                            });
                        }
                    });
                }
            });
        } catch (err) {
            console.error('Flatten Error:', err);
        }
        return flatSales;
    }

    static applyFilters() {
        this.pagination.vendorPage = 1;
        this.pagination.customerPage = 1;
        this.refreshViews();
    }

    static clearTransactionSearch() {
        const el = document.getElementById('transactionSearch');
        if (el) el.value = '';
        this.applyFilters();
    }

    static refreshViews() {
        try {
            const query = (document.getElementById('transactionSearch')?.value || '').toLowerCase().trim();
            const monthFilter = document.getElementById('transFilterMonth')?.value;
            const yearFilter = document.getElementById('transFilterYear')?.value;

            let filteredVendor = this.filterData(this.allVendorTransactions, query, monthFilter, yearFilter, 'purchase_date');
            filteredVendor = this.sortData(filteredVendor, 'vendor');
            this.displayVendorTransactions(filteredVendor);

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
                if (sale.bundle_id) {
                    if (!groups[sale.bundle_id]) groups[sale.bundle_id] = [];
                    groups[sale.bundle_id].push(sale);
                } else {
                    standalone.push(sale);
                }
            });

            const displayList = standalone.map(s => ({ ...s, isBundle: false }));
            Object.entries(groups).forEach(([bid, items]) => {
                if (items.length > 0) {
                    const first = items[0];
                    const totalAmount = items.reduce((sum, i) => sum + parseFloat(i.amount_paid || 0), 0);
                    const itemNames = items.map(i => i.service_name || 'Item').join(' + ');
                    displayList.push({
                        ...first,
                        isBundle: true,
                        service_name: `📦 COMBO: ${itemNames}`,
                        amount_paid: totalAmount,
                        bundleItems: items
                    });
                }
            });

            const query = (document.getElementById('transactionSearch')?.value || '').toLowerCase().trim();
            const monthFilter = document.getElementById('transFilterMonth')?.value;
            const yearFilter = document.getElementById('transFilterYear')?.value;

            const filtered = displayList.filter(item => {
                if (query) {
                    const searchStr = `${item.customerName} ${item.service_name} ${item.notes || ''}`.toLowerCase();
                    if (!searchStr.includes(query)) return false;
                }

                const itemDate = new Date(item.start_date || item.StartDate);
                if (isNaN(itemDate.getTime())) return true;

                if (yearFilter === 'ytd') {
                    return itemDate >= new Date(new Date().getFullYear(), 0, 1);
                } else if (yearFilter === 'last12') {
                    const start = new Date(); start.setFullYear(start.getFullYear() - 1);
                    return itemDate >= start;
                } else if (yearFilter && yearFilter !== 'all') {
                    const selectedYear = parseInt(yearFilter);
                    if (monthFilter && monthFilter !== 'all') {
                        const selectedMonth = parseInt(monthFilter);
                        return itemDate.getFullYear() === selectedYear && itemDate.getMonth() === selectedMonth;
                    }
                    return itemDate.getFullYear() === selectedYear;
                }
                return true;
            });

            filtered.sort((a, b) => {
                const col = this.currentSort.column;
                let valA, valB;
                if (col === 'date') {
                    valA = new Date(a.start_date || a.StartDate).getTime() || 0;
                    valB = new Date(b.start_date || b.StartDate).getTime() || 0;
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
            console.error('Sort Customer Error:', err);
        }
    }

    static filterData(data, query, month, year, dateField) {
        if (!Array.isArray(data)) return [];
        return data.filter(item => {
            if (query) {
                const searchStr = JSON.stringify(item).toLowerCase();
                if (!searchStr.includes(query)) return false;
            }

            const itemDate = new Date(item[dateField] || item.purchase_date || item.start_date);
            if (isNaN(itemDate.getTime())) return true;

            if (year === 'ytd') {
                return itemDate >= new Date(new Date().getFullYear(), 0, 1);
            } else if (year === 'last12') {
                const start = new Date(); start.setFullYear(start.getFullYear() - 1);
                return itemDate >= start;
            } else if (year && year !== 'all') {
                const selectedYear = parseInt(year);
                if (month && month !== 'all') {
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
                valA = new Date(a.purchase_date || a.start_date).getTime() || 0;
                valB = new Date(b.purchase_date || b.start_date).getTime() || 0;
            } else if (col === 'amount' || col === 'cost') {
                valA = parseFloat(a.price_usd || a.amount_paid || 0);
                valB = parseFloat(b.price_usd || b.amount_paid || 0);
            } else {
                valA = (a.vendor_name || a.customerName || '').toLowerCase();
                valB = (b.vendor_name || b.customerName || '').toLowerCase();
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

    static displayVendorTransactions(filteredTransactions) {
        const container = document.getElementById('vendorTransactionsList');
        if (!container) return;
        if (filteredTransactions.length === 0) {
            container.innerHTML = '<div class="no-data">No vendor transactions found.</div>';
            return;
        }

        const page = this.pagination.vendorPage;
        const start = (page - 1) * this.pagination.itemsPerPage;
        const paginatedItems = filteredTransactions.slice(start, start + this.pagination.itemsPerPage);
        const totalCost = filteredTransactions.reduce((sum, t) => sum + parseFloat(t.price_usd || 0), 0);

        container.innerHTML = `
            <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div class="stat-card" style="flex: 1; padding: 10px;">
                    <small>Transactions</small><div>${filteredTransactions.length}</div>
                </div>
                <div class="stat-card" style="flex: 1; padding: 10px;">
                    <small>Total Spend</small><div>${TransactionUI.formatCurrency(totalCost)}</div>
                </div>
            </div>
            <div class="table-responsive">
                <table class="data-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="text-align: left; border-bottom: 2px solid #edf2f7;">
                            <th onclick="TransactionUI.handleSort('vendor', 'vendor')" style="cursor: pointer; padding: 10px;">Vendor ${TransactionUI.getSortIndicator('vendor', 'vendor')}</th>
                            <th style="padding: 10px;">Service</th>
                            <th onclick="TransactionUI.handleSort('vendor', 'date')" style="cursor: pointer; padding: 10px;">Date ${TransactionUI.getSortIndicator('vendor', 'date')}</th>
                            <th style="padding: 10px; text-align: right;">Cost</th>
                            <th style="padding: 10px; text-align: center;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedItems.map(trans => `
                            <tr style="border-bottom: 1px solid #f7fafc;">
                                <td style="padding: 10px;"><strong>${trans.vendor_name || 'Vendor'}</strong></td>
                                <td style="padding: 10px;">${trans.service_name || 'N/A'}</td>
                                <td style="padding: 10px;">${TransactionUI.formatDate(trans.purchase_date)}</td>
                                <td style="padding: 10px; text-align: right;">${TransactionUI.formatCurrency(trans.price_usd)}</td>
                                <td style="padding: 10px; text-align: center;">
                                    <button onclick="PrintManager.printVendorTransaction('${trans.transaction_id || trans.id}')" class="btn-icon">🖨️</button>
                                    <button onclick="TransactionUI.deleteTransaction('vendor', '${trans.transaction_id || trans.id}')" class="btn-icon" style="color: #e53e3e;">🗑️</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        this.renderPaginationControls('vendorPagination', page, filteredTransactions.length, 'vendor');
    }

    static displayCustomerSales(filteredSales) {
        const container = document.getElementById('customerSalesList');
        if (!container) return;
        if (filteredSales.length === 0) {
            container.innerHTML = '<div class="no-data">No customer sales found.</div>';
            return;
        }

        const page = this.pagination.customerPage;
        const start = (page - 1) * this.pagination.itemsPerPage;
        const paginatedItems = filteredSales.slice(start, start + this.pagination.itemsPerPage);
        const totalRev = filteredSales.reduce((sum, s) => sum + parseFloat(s.amount_paid || 0), 0);

        container.innerHTML = `
            <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div class="stat-card" style="flex: 1; padding: 10px;">
                    <small>Sales</small><div>${filteredSales.length}</div>
                </div>
                <div class="stat-card" style="flex: 1; padding: 10px;">
                    <small>Total Revenue</small><div>${TransactionUI.formatCurrency(totalRev)}</div>
                </div>
            </div>
            <div class="table-responsive">
                <table class="data-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="text-align: left; border-bottom: 2px solid #edf2f7;">
                            <th onclick="TransactionUI.handleSort('customer', 'customer')" style="cursor: pointer; padding: 10px;">Customer ${TransactionUI.getSortIndicator('customer', 'customer')}</th>
                            <th style="padding: 10px;">Service</th>
                            <th onclick="TransactionUI.handleSort('customer', 'date')" style="cursor: pointer; padding: 10px;">Date ${TransactionUI.getSortIndicator('customer', 'date')}</th>
                            <th style="padding: 10px; text-align: right;">Amount</th>
                            <th style="padding: 10px; text-align: center;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedItems.map(sale => `
                            <tr style="border-bottom: 1px solid #f7fafc;">
                                <td style="padding: 10px;"><strong>${sale.customerName || 'Unknown'}</strong></td>
                                <td style="padding: 10px;"><small>${sale.service_name || 'N/A'}</small></td>
                                <td style="padding: 10px;">${TransactionUI.formatDate(sale.start_date)}</td>
                                <td style="padding: 10px; text-align: right;">${TransactionUI.formatCurrency(sale.amount_paid)}</td>
                                <td style="padding: 10px; text-align: center;">
                                    ${sale.order_status === 'Open' ? `<button onclick="TransactionUI.closeOrder('${sale.isBundle ? 'bundle' : 'single'}', '${sale.bundle_id || sale.id}')" class="btn-icon" style="color: #48bb78;">✅</button>` : ''}
                                    <button onclick="${sale.isBundle ? `PrintManager.printCustomerReceipt('${sale.customer_id}')` : `PrintManager.printSingleTransaction('${sale.customer_id}', '${sale.id}')`}" class="btn-icon">🖨️</button>
                                    <button onclick="TransactionUI.deleteTransaction('${sale.isBundle ? 'customer-bundle' : 'customer'}', '${sale.bundle_id || sale.id}')" class="btn-icon" style="color: #e53e3e;">🗑️</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        this.renderPaginationControls('customerPagination', page, filteredSales.length, 'customer');
    }

    static renderPaginationControls(elementId, currentPage, totalItems, type) {
        const container = document.getElementById(elementId);
        if (!container) return;
        const totalPages = Math.ceil(totalItems / this.pagination.itemsPerPage);
        if (totalPages <= 1) { container.innerHTML = ''; return; }
        container.innerHTML = `
            <button class="btn-small btn-secondary" ${currentPage === 1 ? 'disabled' : ''} onclick="TransactionUI.changePage('${type}', -1)">Prev</button>
            <span style="font-size: 12px;">${currentPage} / ${totalPages}</span>
            <button class="btn-small btn-secondary" ${currentPage === totalPages ? 'disabled' : ''} onclick="TransactionUI.changePage('${type}', 1)">Next</button>
        `;
    }

    static async closeOrder(type, id) {
        if (window.POSUI) POSUI.loadOrderForUpdate(type, id);
    }

    static async deleteTransaction(type, id) {
        if (!confirm(`Confirm delete ${type}?`)) return;
        const password = prompt('Password:');
        if (password !== '1234') return;
        try {
            let endpoint = type === 'vendor' ? `/api/vendor-transactions/${id}` : (type === 'customer-bundle' ? `/api/subscriptions/bundle/${id}` : `/api/subscriptions/${id}`);
            const response = await fetch(endpoint, { method: 'DELETE', headers: { 'password': password } });
            if (response.ok) {
                await Promise.all([this.loadVendorTransactions(), this.loadCustomerSales()]);
                if (window.POSUI) POSUI.loadCatalog();
                DashboardUI.loadStats();
            }
        } catch (error) { console.error(error); }
    }

    static getSortIndicator(type, column) {
        if (this.currentSort.type !== type || this.currentSort.column !== column) return '↕';
        return this.currentSort.direction === 'asc' ? '▲' : '▼';
    }

    static formatDate(d) { 
        if (!d) return 'N/A';
        const date = new Date(d);
        return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
    }
    static formatCurrency(a) { return '$' + parseFloat(a || 0).toFixed(2); }
}

window.TransactionUI = TransactionUI;