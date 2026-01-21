class POSUI {
    static state = {
        selectedCustomer: null,
        cart: [], // Array of { id, serviceId, name, vendorId, type, duration, price, qty, classification, macAddress }
        allServices: [],
        balances: [],
        editingBundleId: null,
        editingSingleId: null,
        isInitializing: false,
        originalCart: [], // Track original items when editing an order
        removedItems: [] // Track items removed from the original order
    };

    static async init() {
        if (this.state.isInitializing) return;
        this.state.isInitializing = true;
        
        console.log('🛒 Initializing POS...');
        await this.loadCatalog();
        this.attachCustomerSearch();
        
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

    static attachCustomerSearch() {
        if (this._customerSearchAttached) return;
        const input = document.getElementById('posCustomerSearch');
        const dropdown = document.getElementById('posCustomerDropdown');
        if (!input || !dropdown) return;

        input.addEventListener('input', () => POSUI.searchCustomers());
        input.addEventListener('focus', () => POSUI.searchCustomers());
        this._customerSearchAttached = true;
    }

    static async getCustomerList() {
        const cached = Store.getCustomers();
        if (cached && cached.length) return cached;

        try {
            const res = await fetch('/api/customers');
            const customers = await res.json();
            Store.setCustomers(customers);
            return customers;
        } catch (error) {
            console.error('Error loading customers:', error);
            return [];
        }
    }

    static getStock(vendorId, serviceName) {
        const balance = this.state.balances.find(b => 
            (b.vendor_id || b.VendorID) === vendorId && 
            (b.service_name || b.ServiceName) === serviceName
        );
        return balance ? (balance.remaining_credits || balance.RemainingCredits || 0) : 0;
    }

    static filterServices() {
        const input = document.getElementById('posServiceSearch');
        const clearBtn = document.getElementById('posClearSearchBtn');
        if (!input) return;

        const query = input.value.trim().toLowerCase();

        // Show/hide clear button
        if (clearBtn) {
            clearBtn.style.display = query ? 'block' : 'none';
        }

        // If empty, show all services
        if (!query) {
            this.renderCatalog(this.state.allServices);
            return;
        }

        // Filter services by name, type, or vendor
        const filtered = this.state.allServices.filter(service => {
            const name = (service.service_name || '').toLowerCase();
            const type = (service.item_type || 'subscription').toLowerCase();
            const vendorName = (service.vendor_name || '').toLowerCase();
            const price = (service.default_price || 0).toString();

            return name.includes(query) || type.includes(query) || vendorName.includes(query) || price.includes(query);
        });

        this.renderCatalog(filtered);

        // Show search result feedback
        if (filtered.length === 0) {
            const container = document.getElementById('posServiceCatalog');
            if (container) {
                container.innerHTML = `
                    <div class="no-data" style="text-align: center; padding: 40px 20px; color: #718096;">
                        <div style="font-size: 48px; margin-bottom: 15px;">🔍</div>
                        <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">No services found</div>
                        <div style="font-size: 14px;">Try searching for "${query}" with different keywords</div>
                        <button onclick="document.getElementById('posServiceSearch').value=''; POSUI.filterServices();"
                                class="btn-small btn-secondary" style="margin-top: 15px;">Clear Search</button>
                    </div>
                `;
            }
        } else {
            console.log(`🔍 Found ${filtered.length} service(s) matching "${query}"`);
        }
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
                <div class="pos-category-group" style="margin-bottom: 25px;">
                    <div class="pos-category-header" style="padding: 10px 20px; background: #f8fafc; border-radius: 8px; margin: 0 15px 15px 15px;">
                        <span style="font-weight: 800; color: #4a5568; font-size: 13px; letter-spacing: 1px;">${group.label}</span>
                    </div>
                    <div class="service-grid" style="padding: 0 15px 10px 15px; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; overflow-x: visible;">
                        ${group.items.map(service => {
                            const stock = this.getStock(service.vendor_id, service.service_name);
                            const threshold = service.low_stock_threshold !== undefined ? service.low_stock_threshold : 5;
                            const isOutOfStock = stock <= 0;
                            const isLowStock = stock <= threshold && stock > 0;
                            
                            const borderColor = isOutOfStock ? '#feb2b2' : (isLowStock ? '#fbd38d' : '#e2e8f0');
                            const badgeBg = isOutOfStock ? '#fff5f5' : (isLowStock ? '#fffaf0' : '#f0fff4');
                            const badgeColor = isOutOfStock ? '#c53030' : (isLowStock ? '#975a16' : '#2f855a');

                            return `
                                <div class="service-card-modern" 
                                     onclick="POSUI.addToCart('${service.service_id}')"
                                     style="background: white; border: 2px solid ${borderColor}; border-radius: 12px; padding: 15px; cursor: pointer; transition: all 0.2s ease; display: flex; flex-direction: column; justify-content: space-between; height: 160px; box-shadow: 0 2px 4px rgba(0,0,0,0.04); position: relative; overflow: hidden;">
                                    
                                    <div style="margin-bottom: 10px;">
                                        <h4 style="margin: 0; font-size: 14px; color: #2d3748; font-weight: 700; line-height: 1.3;">${service.service_name}</h4>
                                        <small style="color: #718096; font-size: 11px;">${service.vendor_name || 'Generic'}</small>
                                    </div>

                                    <div>
                                        <div style="font-size: 18px; font-weight: 800; color: #667eea; margin-bottom: 8px;">
                                            $${(service.default_price || 0).toFixed(2)}
                                        </div>
                                        
                                        <div style="display: flex; align-items: center; gap: 5px; background: ${badgeBg}; color: ${badgeColor}; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; width: fit-content;">
                                            <span>${isOutOfStock ? '🔴' : (isLowStock ? '⚠️' : '✅')}</span>
                                            <span>Stock: ${stock}</span>
                                        </div>
                                    </div>

                                    <!-- Hover Effect Overlay -->
                                    <div class="hover-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(102, 126, 234, 0.05); opacity: 0; transition: opacity 0.2s;"></div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });

        // Add "Quick Actions" Section at the BOTTOM
        html += `
            <div class="pos-category-group" style="margin-bottom: 25px;">
                <div class="pos-category-header" style="padding: 10px 20px; background: #ebf8ff; border-radius: 8px; margin: 0 15px 15px 15px; border-left: 4px solid #3182ce;">
                    <span style="font-weight: 800; color: #2b6cb0; font-size: 13px; letter-spacing: 1px;">⚡ QUICK ACTIONS</span>
                </div>
                <div class="service-grid" style="padding: 0 15px 10px 15px; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px;">
                    <div class="service-card-modern" 
                         onclick="POSUI.openCustomItemModal()"
                         style="background: white; border: 2px dashed #3182ce; border-radius: 12px; padding: 15px; cursor: pointer; transition: all 0.2s ease; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 160px; box-shadow: 0 2px 4px rgba(0,0,0,0.04); text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 10px;">✨</div>
                        <h4 style="margin: 0; font-size: 15px; color: #2b6cb0; font-weight: 700;">Custom / Misc Item</h4>
                        <small style="color: #718096; margin-top: 5px;">Refunds, Fees, or One-offs</small>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html || '<div class="no-data">No items found.</div>';
    }

    static openCustomItemModal() {
        console.log('✨ Opening custom item modal...');
        const modal = document.getElementById('customItemModal');
        if (!modal) {
            console.error('❌ Modal element "customItemModal" not found in DOM');
            return;
        }
        document.getElementById('customItemName').value = '';
        document.getElementById('customItemPrice').value = '';
        document.getElementById('customItemQty').value = '1';
        document.getElementById('customItemType').value = 'subscription';
        modal.style.setProperty('display', 'flex', 'important');
        document.getElementById('customItemName').focus();
    }

    static closeCustomItemModal() {
        document.getElementById('customItemModal').style.display = 'none';
    }

    static addCustomItemToCart(event) {
        event.preventDefault();
        
        const name = document.getElementById('customItemName').value.trim();
        const price = parseFloat(document.getElementById('customItemPrice').value);
        const qty = parseInt(document.getElementById('customItemQty').value) || 1;
        const type = document.getElementById('customItemType').value;

        if (!name || isNaN(price)) {
            Alerts.showError('Invalid Input', 'Please enter a name and valid price.');
            return;
        }

        const cartItem = {
            id: null,
            serviceId: 'CUSTOM-' + Date.now(),
            name: name,
            vendorId: 'INTERNAL_STORE', // System vendor
            type: type,
            duration: type === 'subscription' ? qty : 1,
            qty: type === 'subscription' ? 1 : qty,
            price: price, // Can be negative
            classification: '',
            macAddress: ''
        };

        this.state.cart.push(cartItem);
        this.renderCart();
        this.closeCustomItemModal();
        Alerts.showSuccess('Added', 'Custom item added to cart.');
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
            this.state.originalCart = [];
            this.state.removedItems = [];
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
                macAddress: item.mac_address || '',
                bundleId: item.bundle_id || item.BundleID
            }));

            // Keep a copy of the original cart for comparison
            this.state.originalCart = JSON.parse(JSON.stringify(this.state.cart));

            // 5. Select Customer (UI update)
            await this.selectCustomer(items[0].customer_id || items[0].CustomerID);

            // 6. Fill Footer UI
            document.getElementById('posOrderStatus').value = items[0].order_status || 'Open';
            document.getElementById('posPaymentType').value = items[0].payment_type || 'Other';
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

        // Check if item already exists in cart (by serviceId AND treating new items only)
        // We only aggregate items that are newly added (id === null). 
        // Existing items loaded from history (id !== null) should remain distinct to preserve their specific history.
        const existingItemIndex = this.state.cart.findIndex(item => 
            item.serviceId === serviceId && item.id === null
        );

        if (existingItemIndex !== -1) {
            // Item exists, just increment quantity/duration
            const item = this.state.cart[existingItemIndex];
            if (item.type === 'subscription') {
                item.duration += 1;
            } else {
                item.qty += 1;
            }
            console.log(`➕ Increased quantity for ${item.name}`);
        } else {
            // Add new item
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
        }

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

        // Check if we're editing an existing order
        const isEditingOrder = !!(this.state.editingBundleId || this.state.editingSingleId);

        container.innerHTML = this.state.cart.map((item, index) => {
            const isSub = item.type === 'subscription';
            const isExisting = !!item.id;
            const isEditable = !isEditingOrder || !isExisting; // Allow editing new items or all items if not editing an order

            return `
                <div class="cart-item-card type-${item.type} ${isExisting ? 'existing-item' : ''}" style="border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.02); overflow: hidden;">
                    <!-- Header -->
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #f8fafc; border-bottom: 1px solid #edf2f7;">
                        <div style="font-weight: 800; color: #2d3748; font-size: 16px;">
                            ${item.name} ${isExisting ? '<span style="font-size: 10px; background: #edf2f7; padding: 2px 6px; border-radius: 4px; color: #718096; font-weight: 600; vertical-align: middle; margin-left: 5px;">ORIGINAL</span>' : ''}
                        </div>
                        <button onclick="POSUI.removeFromCart(${index})" class="btn-icon" style="color: #e53e3e; background: none; border: none; font-size: 18px; cursor: pointer; padding: 0 4px;">✕</button>
                    </div>

                    <div style="padding: 12px;">
                        <!-- Controls Row -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                            <div>
                                <label style="display: block; font-size: 11px; color: #718096; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${isSub ? 'Months' : 'Qty'}</label>
                                <input type="number" value="${isSub ? item.duration : item.qty}" min="1"
                                       onchange="POSUI.updateCartItem(${index}, '${isSub ? 'duration' : 'qty'}', this.value)"
                                       style="width: 100%; padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 11px; color: #718096; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Price ($)</label>
                                <input type="number" value="${item.price}" step="0.01"
                                       onchange="POSUI.updateCartItem(${index}, 'price', this.value)"
                                       style="width: 100%; padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px;">
                            </div>
                        </div>

                        <!-- Device/MAC Field -->
                        <div style="margin-bottom: 12px; background: #f0f4f8; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
                            <label style="display: block; font-size: 11px; color: #4a5568; margin-bottom: 4px; font-weight: 600;">🖥️ Device Name / MAC (Optional)</label>
                            <input type="text" value="${item.macAddress || ''}" placeholder="e.g. Living Room TV or AA:BB:CC..."
                                   onchange="POSUI.updateCartItem(${index}, 'macAddress', this.value)"
                                   style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 13px; background: white;">
                        </div>

                        <!-- Footer / Subtotal -->
                        <div style="display: flex; justify-content: flex-end; align-items: center; padding-top: 8px; border-top: 1px dashed #e2e8f0;">
                            <span style="font-size: 12px; color: #718096; margin-right: 8px;">Subtotal:</span>
                            <span style="font-size: 14px; font-weight: 600; color: #2d3748; margin-right: 2px;">$</span>
                            <input type="number" value="${((isSub ? item.duration : item.qty) * item.price).toFixed(2)}" step="0.01" 
                                   onchange="POSUI.updateCartItem(${index}, 'subtotal', this.value)" 
                                   style="width: 80px; padding: 4px; font-weight: 700; border: 1px solid #e2e8f0; border-radius: 4px; text-align: right; font-size: 16px;">
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
        if (el) el.value = total.toFixed(2);
    }

    static updateCartTotal(newValue) {
        const newTotal = parseFloat(newValue);
        if (isNaN(newTotal) || newTotal < 0) {
            this.updateTotal(); // Revert if invalid
            return;
        }

        const currentTotal = this.state.cart.reduce((sum, item) => {
            const q = item.type === 'subscription' ? item.duration : item.qty;
            return sum + (q * item.price);
        }, 0);

        if (this.state.cart.length === 0) return;

        if (currentTotal === 0) {
            // If starting from 0, distribute evenly based on quantity
            const totalQty = this.state.cart.reduce((sum, item) => sum + (item.type === 'subscription' ? item.duration : item.qty), 0);
            if (totalQty > 0) {
                const pricePerUnit = newTotal / totalQty;
                this.state.cart.forEach(item => item.price = pricePerUnit);
            }
        } else {
            // Scale prices proportionally
            const ratio = newTotal / currentTotal;
            this.state.cart.forEach(item => {
                item.price = item.price * ratio;
            });
        }

        this.renderCart();
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

            let currentBundleID = null;

            if (isUpdate) {
                // Step 1: Delete removed items
                for (const removedId of this.state.removedItems) {
                    await fetch(`/api/subscriptions/${removedId}`, {
                        method: 'DELETE'
                    });
                    console.log(`✅ Deleted item: ${removedId}`);
                }

                // Step 2: Update existing items and add new items
                currentBundleID = this.state.editingBundleId || this.state.cart[0]?.bundleId || 'BNDL-' + Date.now();

                for (const item of this.state.cart) {
                    const q = item.type === 'subscription' ? item.duration : item.qty;

                    if (item.id) {
                        // Existing item - update it
                        await fetch(`/api/subscriptions/${item.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                creditsUsed: q,
                                amountPaid: q * item.price,
                                classification: item.classification,
                                macAddress: item.macAddress,
                                orderStatus: meta.orderStatus,
                                paymentType: meta.paymentType,
                                paymentStatus: meta.paymentStatus,
                                transactionIdRef: meta.transactionIdRef,
                                notes: meta.notes
                            })
                        });
                        console.log(`✅ Updated item: ${item.id}`);
                    } else {
                        // New item - create it
                        await fetch('/api/subscriptions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                customerID: this.state.selectedCustomer.id,
                                serviceName: item.type === 'subscription' ? `IT App Services - ${item.name}` : `${item.type.toUpperCase()}: ${item.name}`,
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
                                bundleID: currentBundleID,
                                orderStatus: meta.orderStatus,
                                paymentType: meta.paymentType,
                                paymentStatus: meta.paymentStatus,
                                transactionIdRef: meta.transactionIdRef
                            })
                        });
                        console.log(`✅ Added new item: ${item.name}`);
                    }
                }

                // Step 3: Update bundle metadata if needed
                if (this.state.editingBundleId) {
                    await fetch(`/api/bundles/${this.state.editingBundleId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(meta)
                    });
                }

                Alerts.showSuccess('Order Updated', 'The order has been updated successfully.');
            } else {
                currentBundleID = 'BNDL-' + Date.now();
                for (const item of this.state.cart) {
                    const q = item.type === 'subscription' ? item.duration : item.qty;
                    await fetch('/api/subscriptions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            customerID: this.state.selectedCustomer.id,
                            serviceName: item.type === 'subscription' ? `IT App Services - ${item.name}` : `${item.type.toUpperCase()}: ${item.name}`,
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
                            bundleID: currentBundleID,
                            orderStatus: meta.orderStatus,
                            paymentType: meta.paymentType,
                            paymentStatus: meta.paymentStatus,
                            transactionIdRef: meta.transactionIdRef
                        })
                    });
                }
                Alerts.showSuccess('Sale Complete', 'Transaction recorded.');
            }

            // PRINT ONLY THE CURRENT BUNDLE (Prevents old items appearing on receipt)
            if (currentBundleID) {
                await PrintManager.printBundleReceipt(currentBundleID);
            } else {
                // Fallback to customer ID if bundle fails
                await PrintManager.printCustomerReceipt(this.state.selectedCustomer.id);
            }
            
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
        this.state.originalCart = [];
        this.state.removedItems = [];
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
        const input = document.getElementById('posCustomerSearch');
        const dropdown = document.getElementById('posCustomerDropdown');
        if (!input || !dropdown) return;

        const q = input.value.trim().toLowerCase();
        console.log(`🔍 POS Search: "${q}"`);

        const custs = await this.getCustomerList();
        console.log(`📊 Customers in store: ${custs.length}`);

        if (!custs.length) {
            dropdown.innerHTML = '<div class="dropdown-item no-results">No customers available</div>';
            dropdown.style.setProperty('display', 'block', 'important');
            return;
        }

        const filtered = (q.length ? custs.filter(c => {
            const name = (c.name || c.Name || '').toLowerCase();
            const email = (c.email || c.Email || '').toLowerCase();
            const phone = (c.phone || c.Phone || '').toString().toLowerCase();
            const id = (c.id || c.CustomerID || '').toString().toLowerCase();
            return name.includes(q) || email.includes(q) || phone.includes(q) || id.includes(q);
        }) : custs).slice(0, 50);

        console.log(`🎯 Filtered results: ${filtered.length}`);

        dropdown.innerHTML = filtered.length
            ? filtered.map(c => {
                const id = c.id || c.CustomerID;
                const name = c.name || c.Name || 'Unknown';
                const email = c.email || c.Email || '';
                const phone = c.phone || c.Phone || '';
                const meta = email ? email : phone;
                return `<div class="dropdown-item" onclick="POSUI.selectCustomer('${id}')"><strong>${name}</strong><br><small>${meta}</small></div>`;
            }).join('')
            : '<div class="dropdown-item no-results">No matching customers</div>';
        
        dropdown.style.setProperty('display', 'block', 'important');
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
            selectedCard.querySelector('.customer-name-display').textContent = customer.name || customer.Name || '';
            selectedCard.querySelector('.customer-email-display').textContent = customer.email || customer.Email || '';
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
        const input = document.getElementById('posCustomerSearch');
        const dropdown = document.getElementById('posCustomerDropdown');
        if (!input || !dropdown) return;
        POSUI.searchCustomers();
    }

    static removeFromCart(index) {
        const item = this.state.cart[index];
        if (!item) return;

        // If the item has an ID, it's an existing item - track it for deletion
        if (item.id) {
            this.state.removedItems.push(item.id);
            console.log(`🗑️ Marked item ${item.id} (${item.name}) for deletion`);
        }

        this.state.cart.splice(index, 1);
        this.renderCart();
    }
    static updateCartItem(index, field, value) {
        const item = this.state.cart[index];
        if (!item) return;

        const oldValue = item[field];
        if (field === 'qty' || field === 'duration') item[field] = parseInt(value) || 1;
        else if (field === 'price') item[field] = parseFloat(value) || 0;
        else if (field === 'subtotal') {
            // Reverse calculate unit price from new subtotal
            const newSubtotal = parseFloat(value) || 0;
            const quantity = item.type === 'subscription' ? item.duration : item.qty;
            item.price = quantity > 0 ? newSubtotal / quantity : 0;
        }
        else item[field] = value;

        if (item.id) {
            console.log(`✏️ Modified existing item ${item.id}: ${field} ${oldValue} → ${item[field]}`);
        }

        this.renderCart();
    }
}

window.POSUI = POSUI;
