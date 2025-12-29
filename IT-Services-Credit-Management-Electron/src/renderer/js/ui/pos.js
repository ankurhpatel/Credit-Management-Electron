class POSUI {
    static state = {
        selectedCustomer: null,
        cart: [], // Array of { id, serviceId, name, vendorId, type, duration, price, qty, classification, macAddress }
        allServices: [],
        balances: [],
        editingBundleId: null,
        editingSingleId: null,
        isInitializing: false
    };

    static async init() {
        if (this.state.isInitializing) return;
        this.state.isInitializing = true;
        
        console.log('🛒 Initializing POS...');
        await this.loadCatalog();
        
        // Only reset if we AREN'T currently loading an order from history
        if (!this.state.editingBundleId && !this.state.editingSingleId) {
            this.resetForm();
        }
        
        this.state.isInitializing = false;
        this.setupEventListeners();
    }

    static async loadCatalog() {
        try {
            const container = document.getElementById('posServiceCatalog');
            if (!container) return;
            container.innerHTML = '<div class="loading-message">Loading catalog...</div>';

            const [servicesRes, balancesRes] = await Promise.all([
                fetch('/api/vendor-services'),
                fetch('/api/credit-balances')
            ]);
            
            this.state.allServices = await servicesRes.json();
            this.state.balances = await balancesRes.json();
            this.renderCatalog(this.state.allServices);
        } catch (error) {
            console.error('❌ Error loading POS data:', error);
        }
    }

    static getStock(vendorId, serviceName) {
        const balance = this.state.balances.find(b => 
            (b.vendor_id || b.VendorID) === vendorId && 
            (b.service_name || b.ServiceName) === serviceName
        );
        return balance ? (balance.remaining_credits || balance.RemainingCredits || 0) : 0;
    }

    static renderCatalog(services) {
        const container = document.getElementById('posServiceCatalog');
        if (!container) return;

        const groups = {
            'hardware': { label: '🔌 Hardware & Devices', items: [] },
            'subscription': { label: '📺 IT Services (Subscriptions)', items: [] },
            'fee': { label: '💰 Fees & Shipping', items: [] }
        };

        services.forEach(s => {
            const type = s.item_type || 'subscription';
            if (groups[type]) groups[type].items.push(s);
        });

        let html = '';
        Object.entries(groups).forEach(([type, group]) => {
            if (group.items.length === 0) return;
            html += `
                <div class="pos-category-group">
                    <div class="pos-category-header"><span>${group.label}</span></div>
                    <div class="service-grid">
                        ${group.items.map(service => {
                            const stock = this.getStock(service.vendor_id, service.service_name);
                            const stockClass = stock <= 0 ? 'out-of-stock' : (stock < 5 ? 'low-stock' : 'in-stock');
                            return `
                                <div class="service-card type-${service.item_type} ${stockClass}" 
                                     onclick="POSUI.addToCart('${service.service_id}')">
                                    <div class="service-card-info">
                                        <h4 class="service-card-title">${service.service_name}</h4>
                                        <div class="service-card-price">$${(service.default_price || 0).toFixed(2)}</div>
                                        <div class="service-card-stock">Stock: <strong>${stock}</strong></div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html || '<div class="no-data">No items found.</div>';
    }

    // FIXED: Load an existing order from History to POS
    static async loadOrderForUpdate(type, id) {
        try {
            console.log(`📂 Preparing to load ${type} order ${id}...`);
            
            // 1. Fetch data first before switching tabs
            let items = [];
            if (type === 'bundle') {
                const res = await fetch(`/api/bundles/${id}`);
                items = await res.json();
            } else {
                const res = await fetch(`/api/subscriptions/${id}`);
                const sub = await res.json();
                items = [sub];
            }

            if (!items || items.length === 0) throw new Error('Order not found');

            // 2. Switch tab and wait for it to be ready
            // We use the global showTab which is already awaited in Tabs.js
            if (window.Tabs) {
                await Tabs.showTab('pos');
            } else {
                showTab('pos');
                await new Promise(r => setTimeout(r, 500));
            }

            // 3. Clear existing POS state manually (bypass the auto-reset in init)
            this.state.cart = [];
            this.state.editingBundleId = type === 'bundle' ? id : null;
            this.state.editingSingleId = type === 'single' ? id : null;

            // 4. Fill state with fetched items
            this.state.cart = items.map(item => ({
                id: item.id,
                serviceId: '', 
                name: item.service_name || item.ServiceName,
                vendorId: item.vendor_id,
                type: item.item_type || 'subscription',
                duration: item.credits_used || 1,
                qty: item.credits_used || 1,
                price: parseFloat(item.amount_paid) / (item.credits_used || 1),
                classification: item.classification || '',
                macAddress: item.mac_address || ''
            }));

            // 5. Select Customer (UI update)
            await this.selectCustomer(items[0].customer_id || items[0].CustomerID);

            // 6. Fill Footer UI
            document.getElementById('posOrderStatus').value = items[0].order_status || 'Open';
            document.getElementById('posPaymentType').value = items[0].payment_type || 'Cash';
            document.getElementById('posPaymentStatus').value = items[0].payment_status || 'Pending';
            document.getElementById('posTransactionIdRef').value = items[0].transaction_id_ref || '';
            document.getElementById('posOrderNotes').value = (items[0].notes || '').replace('POS: ', '');

            // 7. Final Render
            this.renderCart();
            document.getElementById('posCheckoutBtn').innerText = '💾 Update & Close Order';
            
            Alerts.showInfo('Order Loaded', 'You can now update and close this order.');

        } catch (error) {
            console.error('Error loading order:', error);
            Alerts.showError('Error', 'Failed to load order for update: ' + error.message);
        }
    }

    static addToCart(serviceId) {
        const service = this.state.allServices.find(s => s.service_id === serviceId);
        if (!service) return;

        const cartItem = {
            id: null, // New item
            serviceId: service.service_id,
            name: service.service_name,
            vendorId: service.vendor_id,
            type: service.item_type || 'subscription',
            duration: 1,
            qty: 1,
            price: service.default_price || 0,
            classification: '',
            macAddress: ''
        };

        this.state.cart.push(cartItem);
        this.renderCart();
    }

    static renderCart() {
        const container = document.getElementById('posCartItems');
        if (!container) return;

        if (this.state.cart.length === 0) {
            container.innerHTML = '<div class="placeholder-text">Click services on the left to add to cart</div>';
            this.updateTotal();
            return;
        }

        container.innerHTML = this.state.cart.map((item, index) => {
            const isSub = item.type === 'subscription';
            const isExisting = !!item.id;
            return `
                <div class="cart-item-card type-${item.type} ${isExisting ? 'existing-item' : ''}">
                    <div class="cart-item-header">
                        <span class="cart-item-title"><strong>${item.name}</strong> ${isExisting ? '<small>(Original)</small>' : ''}</span>
                        ${!isExisting ? `<button onclick="POSUI.removeFromCart(${index})" class="btn-icon">✕</button>` : ''}
                    </div>
                    
                    <div class="cart-item-body">
                        <div class="cart-item-row">
                            <label>${isSub ? 'Months' : 'Qty'}:</label>
                            <input type="number" value="${isSub ? item.duration : item.qty}" min="1" ${isExisting ? 'disabled' : ''}
                                   onchange="POSUI.updateCartItem(${index}, '${isSub ? 'duration' : 'qty'}', this.value)">
                        </div>
                        
                        <div class="cart-item-row">
                            <label>Unit Price ($):</label>
                            <input type="number" value="${item.price}" step="0.01" ${isExisting ? 'disabled' : ''}
                                   onchange="POSUI.updateCartItem(${index}, 'price', this.value)">
                        </div>

                        <div class="cart-item-row" style="grid-column: span 2;">
                            <label>Subtotal:</label>
                            <div style="font-weight: 700; color: #2d3748;">$${((isSub ? item.duration : item.qty) * item.price).toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.updateTotal();
    }

    static updateTotal() {
        const total = this.state.cart.reduce((sum, item) => {
            const q = item.type === 'subscription' ? item.duration : item.qty;
            return sum + (q * item.price);
        }, 0);
        const el = document.getElementById('posCartTotal');
        if (el) el.textContent = `$${total.toFixed(2)}`;
    }

    static async processSale() {
        if (!this.state.selectedCustomer) { Alerts.showError('Error', 'Select a customer'); return; }
        if (this.state.cart.length === 0) { Alerts.showError('Error', 'Cart is empty'); return; }

        const checkoutBtn = document.getElementById('posCheckoutBtn');
        const isUpdate = !!(this.state.editingBundleId || this.state.editingSingleId);
        
        checkoutBtn.disabled = true;
        const originalText = checkoutBtn.innerText;
        checkoutBtn.innerText = isUpdate ? '⏳ Updating...' : '⏳ Processing...';

        try {
            const meta = {
                orderStatus: document.getElementById('posOrderStatus').value,
                paymentType: document.getElementById('posPaymentType').value,
                paymentStatus: document.getElementById('posPaymentStatus').value,
                transactionIdRef: document.getElementById('posTransactionIdRef').value,
                notes: `POS: ${document.getElementById('posOrderNotes').value}`
            };

            if (isUpdate) {
                if (this.state.editingBundleId) {
                    await fetch(`/api/bundles/${this.state.editingBundleId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(meta)
                    });
                } else {
                    await fetch(`/api/subscriptions/${this.state.editingSingleId}/metadata`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(meta)
                    });
                }
                Alerts.showSuccess('Order Updated', 'The order has been updated and processed.');
            } else {
                const bundleID = 'BNDL-' + Date.now();
                for (const item of this.state.cart) {
                    const q = item.type === 'subscription' ? item.duration : item.qty;
                    await fetch('/api/subscriptions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            customerID: this.state.selectedCustomer.id,
                            serviceName: item.type === 'subscription' ? 'IT App Services' : `${item.type.toUpperCase()}: ${item.name}`,
                            vendorID: item.vendorId,
                            vendorServiceName: item.name,
                            startDate: new Date().toISOString().split('T')[0],
                            creditsSelected: q, 
                            amountPaid: q * item.price,
                            classification: item.classification,
                            macAddress: item.macAddress,
                            notes: meta.notes,
                            status: 'active',
                            itemType: item.type,
                            bundleID: bundleID,
                            orderStatus: meta.orderStatus,
                            paymentType: meta.paymentType,
                            paymentStatus: meta.paymentStatus,
                            transactionIdRef: meta.transactionIdRef
                        })
                    });
                }
                Alerts.showSuccess('Sale Complete', 'Transaction recorded.');
            }

            await PrintManager.printCustomerReceipt(this.state.selectedCustomer.id);
            this.resetForm();
        } catch (error) {
            Alerts.showError('Failed', error.message);
        } finally {
            checkoutBtn.disabled = false;
            checkoutBtn.innerText = '💳 Complete Bundle Sale & Print';
        }
    }

    static resetForm() {
        this.state.cart = [];
        this.state.selectedCustomer = null;
        this.state.editingBundleId = null;
        this.state.editingSingleId = null;
        this.clearCustomer();
        this.renderCart();
        ['posOrderNotes', 'posTransactionIdRef'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        ['posOrderStatus', 'posPaymentType', 'posPaymentStatus'].forEach(id => {
            const el = document.getElementById(id); if (el) el.selectedIndex = 0;
        });
        document.getElementById('posCheckoutBtn').innerText = '💳 Complete Bundle Sale & Print';
        this.loadCatalog();
    }

    static async searchCustomers() {
        const q = document.getElementById('posCustomerSearch').value.toLowerCase();
        const d = document.getElementById('posCustomerDropdown');
        if (q.length < 2) { d.style.display = 'none'; return; }
        const res = await fetch('/api/customers');
        const custs = await res.json();
        const filtered = custs.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
        d.innerHTML = filtered.map(c => `<div class="dropdown-item" onclick="POSUI.selectCustomer('${c.id}')"><strong>${c.name}</strong><br><small>${c.email}</small></div>`).join('');
        d.style.display = 'block';
    }

    static async selectCustomer(customerId) {
        const res = await fetch(`/api/customers/${customerId}`);
        const customer = await res.json();
        this.state.selectedCustomer = customer;
        
        // Hide search, show card
        const searchWrapper = document.querySelector('.customer-search-wrapper');
        const selectedCard = document.getElementById('posSelectedCustomer');
        
        if (searchWrapper) searchWrapper.style.display = 'none';
        if (selectedCard) {
            selectedCard.style.display = 'flex';
            selectedCard.querySelector('.customer-name-display').textContent = customer.name;
            selectedCard.querySelector('.customer-email-display').textContent = customer.email;
        }

        // Intelligence
        const intelPanel = document.getElementById('posCustomerIntelligence');
        if (intelPanel) {
            intelPanel.style.display = 'block';
            document.getElementById('posIntelNotes').textContent = customer.internal_notes || 'No notes.';
            const transRes = await fetch(`/api/customers/${customerId}/transactions`);
            const transData = await transRes.json();
            const last = transData.subscriptions?.[0];
            document.getElementById('posIntelLastPrice').textContent = last ? `$${parseFloat(last.amount_paid).toFixed(2)} (${last.service_name})` : 'First Order';
        }
    }

    static clearCustomer() {
        this.state.selectedCustomer = null;
        document.getElementById('posSelectedCustomer').style.display = 'none';
        if (document.getElementById('posCustomerIntelligence')) document.getElementById('posCustomerIntelligence').style.display = 'none';
        document.querySelector('.customer-search-wrapper').style.display = 'block';
    }

    static setupEventListeners() {
        // Clear global listener to prevent double triggers
        if (this._listenerAttached) return;
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('posCustomerDropdown');
            if (dropdown && !dropdown.contains(e.target) && !e.target.closest('#posCustomerSearch')) dropdown.style.display = 'none';
        });
        this._listenerAttached = true;
    }

    static showCustomerDropdown() {
        if (document.getElementById('posCustomerSearch').value.length >= 2) document.getElementById('posCustomerDropdown').style.display = 'block';
    }

    static removeFromCart(index) { this.state.cart.splice(index, 1); this.renderCart(); }
    static updateCartItem(index, field, value) {
        const item = this.state.cart[index];
        if (!item) return;
        if (field === 'qty' || field === 'duration') item[field] = parseInt(value) || 1;
        else if (field === 'price') item[field] = parseFloat(value) || 0;
        else item[field] = value;
        this.renderCart();
    }
}

window.POSUI = POSUI;
