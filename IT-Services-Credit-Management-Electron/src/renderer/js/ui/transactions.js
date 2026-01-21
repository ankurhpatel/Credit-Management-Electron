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
                if (items.length > 1) {
                    // It's a real bundle/combo
                    const first = items[0];
                    const totalAmount = items.reduce((sum, i) => sum + parseFloat(i.amount_paid || 0), 0);
                    const itemNames = items.map(i => {
                        if (i.service_name === 'IT App Services' && i.vendor_service_name) {
                            return `IT App Services - ${i.vendor_service_name}`;
                        }
                        return i.service_name || 'Item';
                    }).join(' + ');
                    displayList.push({
                        ...first,
                        isBundle: true,
                        service_name: `📦 COMBO: ${itemNames}`,
                        amount_paid: totalAmount,
                        bundleItems: items
                    });
                } else if (items.length === 1) {
                    // It has a bundle ID but only 1 item -> Treat as standalone
                    const item = items[0];
                    displayList.push({
                        ...item,
                        isBundle: false // Treat as single item
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
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div style="background: white; padding: 15px; border-radius: 12px; border: 1px solid #edf2f7; display: flex; align-items: center; gap: 12px;">
                    <div style="font-size: 24px; background: #ebf4ff; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 10px;">📦</div>
                    <div>
                        <div style="font-size: 11px; color: #a0aec0; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Purchases</div>
                        <div style="font-size: 20px; font-weight: 800; color: #2d3748;">${filteredTransactions.length}</div>
                    </div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 12px; border: 1px solid #edf2f7; display: flex; align-items: center; gap: 12px;">
                    <div style="font-size: 24px; background: #fff5f5; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 10px;">💸</div>
                    <div>
                        <div style="font-size: 11px; color: #a0aec0; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Total Spend</div>
                        <div style="font-size: 20px; font-weight: 800; color: #e53e3e;">${TransactionUI.formatCurrency(totalCost)}</div>
                    </div>
                </div>
            </div>
            <div class="table-responsive" style="border: 1px solid #edf2f7; box-shadow: none;">
                <table class="data-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="text-align: left; background: #f8fafc; border-bottom: 2px solid #edf2f7;">
                            <th onclick="TransactionUI.handleSort('vendor', 'vendor')" style="cursor: pointer; padding: 15px; font-size: 11px;">VENDOR ${TransactionUI.getSortIndicator('vendor', 'vendor')}</th>
                            <th style="padding: 15px; font-size: 11px;">SERVICE</th>
                            <th onclick="TransactionUI.handleSort('vendor', 'date')" style="cursor: pointer; padding: 15px; font-size: 11px;">DATE ${TransactionUI.getSortIndicator('vendor', 'date')}</th>
                            <th style="padding: 15px; text-align: right; font-size: 11px;">COST</th>
                            <th style="padding: 15px; text-align: center; font-size: 11px;">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedItems.map(trans => `
                            <tr style="border-bottom: 1px solid #f7fafc;">
                                <td style="padding: 15px;"><strong>${trans.vendor_name || 'Vendor'}</strong></td>
                                <td style="padding: 15px; color: #4a5568;">${trans.service_name || 'N/A'}</td>
                                <td style="padding: 15px; color: #718096; font-size: 13px;">${TransactionUI.formatDate(trans.purchase_date)}</td>
                                <td style="padding: 15px; text-align: right; font-weight: 700; color: #2d3748;">${TransactionUI.formatCurrency(trans.price_usd)}</td>
                                <td style="padding: 15px; text-align: center;">
                                    <div style="display: flex; gap: 5px; justify-content: center;">
                                        <button onclick="PrintManager.printVendorTransaction('${trans.transaction_id || trans.id}')" class="btn-icon" style="background: #f7fafc; padding: 6px;" title="Print">🖨️</button>
                                        <button onclick="TransactionUI.deleteTransaction('vendor', '${trans.transaction_id || trans.id}')" class="btn-icon" style="color: #e53e3e; background: #fff5f5; padding: 6px;" title="Delete">🗑️</button>
                                    </div>
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
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div style="background: white; padding: 15px; border-radius: 12px; border: 1px solid #edf2f7; display: flex; align-items: center; gap: 12px;">
                    <div style="font-size: 24px; background: #f0fff4; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 10px;">🏷️</div>
                    <div>
                        <div style="font-size: 11px; color: #a0aec0; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Orders</div>
                        <div style="font-size: 20px; font-weight: 800; color: #2d3748;">${filteredSales.length}</div>
                    </div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 12px; border: 1px solid #edf2f7; display: flex; align-items: center; gap: 12px;">
                    <div style="font-size: 24px; background: #ebf8ff; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 10px;">💰</div>
                    <div>
                        <div style="font-size: 11px; color: #a0aec0; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Total Revenue</div>
                        <div style="font-size: 20px; font-weight: 800; color: #3182ce;">${TransactionUI.formatCurrency(totalRev)}</div>
                    </div>
                </div>
            </div>
            <div class="table-responsive" style="border: 1px solid #edf2f7; box-shadow: none;">
                <table class="data-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="text-align: left; background: #f8fafc; border-bottom: 2px solid #edf2f7;">
                            <th onclick="TransactionUI.handleSort('customer', 'customer')" style="cursor: pointer; padding: 15px; font-size: 11px;">CUSTOMER ${TransactionUI.getSortIndicator('customer', 'customer')}</th>
                            <th style="padding: 15px; font-size: 11px;">ITEM / SERVICE</th>
                            <th onclick="TransactionUI.handleSort('customer', 'date')" style="cursor: pointer; padding: 15px; font-size: 11px;">DATE ${TransactionUI.getSortIndicator('customer', 'date')}</th>
                            <th style="padding: 15px; text-align: right; font-size: 11px;">AMOUNT</th>
                            <th style="padding: 15px; text-align: center; font-size: 11px;">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedItems.map(sale => `
                            <tr style="border-bottom: 1px solid #f7fafc;">
                                <td style="padding: 15px;">
                                    <strong style="color: #2d3748;">${sale.customerName || 'Unknown'}</strong>
                                    ${sale.isBundle ? '<br><span style="font-size: 10px; background: #ebf4ff; color: #3182ce; padding: 1px 6px; border-radius: 4px; font-weight: 700;">COMBO</span>' : ''}
                                </td>
                                <td style="padding: 15px; color: #4a5568; font-size: 13px;">
                                    ${(sale.service_name === 'IT App Services' && sale.vendor_service_name) ? `IT App Services - ${sale.vendor_service_name}` : (sale.service_name || 'N/A')}
                                </td>
                                <td style="padding: 15px; color: #718096; font-size: 13px;">${TransactionUI.formatDate(sale.start_date)}</td>
                                <td style="padding: 15px; text-align: right; font-weight: 700; color: #2d3748;">${TransactionUI.formatCurrency(sale.amount_paid)}</td>
                                <td style="padding: 15px; text-align: center;">
                                    <div style="display: flex; gap: 5px; justify-content: center;">
                                        ${sale.order_status === 'Open' ? `<button onclick="TransactionUI.closeOrder('${sale.isBundle ? 'bundle' : 'single'}', '${sale.isBundle ? sale.bundle_id : sale.id}')" class="btn-icon" style="background: #f0fff4; color: #38a169; padding: 6px;" title="Fullfill/Close">✅</button>` : ''}
                                        <button onclick="${sale.isBundle ? `PrintManager.printBundleReceipt('${sale.bundle_id}')` : `PrintManager.printSingleTransaction('${sale.customer_id}', '${sale.id}')`}" class="btn-icon" style="background: #f7fafc; padding: 6px;" title="Print Invoice">🖨️</button>
                                        <button onclick="TransactionUI.deleteTransaction('${sale.isBundle ? 'customer-bundle' : 'customer'}', '${sale.isBundle ? sale.bundle_id : sale.id}')" class="btn-icon" style="color: #e53e3e; background: #fff5f5; padding: 6px;" title="Delete">🗑️</button>
                                    </div>
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
        const msg = type === 'customer-bundle' 
            ? '⚠️ Confirm delete ENTIRE BUNDLE? This will remove ALL items in this combo order.' 
            : `Confirm delete ${type === 'vendor' ? 'purchase record' : 'transaction'}?`;
            
        if (!confirm(msg)) return;
        
        const password = prompt('Password:');
        if (password !== '1234') return;
        try {
            let endpoint = type === 'vendor' ? `/api/vendor-transactions/${id}` : (type === 'customer-bundle' ? `/api/subscriptions/bundle/${id}` : `/api/subscriptions/${id}`);
            const response = await fetch(endpoint, { method: 'DELETE', headers: { 'password': password } });
            if (response.ok) {
                await Promise.all([this.loadVendorTransactions(), this.loadCustomerSales()]);
                if (window.POSUI) POSUI.loadCatalog();
                DashboardUI.loadStats();
                Alerts.showSuccess('Deleted', 'Record removed successfully');
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