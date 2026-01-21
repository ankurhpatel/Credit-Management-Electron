// Enhanced Vendor UI management
class VendorsUI {
    static currentVendors = [];
    static filteredVendors = [];

    static async loadAndDisplayVendors() {
        try {
            console.log('🏭 Loading vendor list...');
            const vendors = await VendorsAPI.loadAll();
            this.currentVendors = vendors;
            this.filteredVendors = vendors;
            this.displayVendorList(vendors);
            this.updateVendorCount(vendors.length);
        } catch (error) {
            console.error('❌ Error loading vendor list:', error);
        }
    }

    static displayVendorList(vendors) {
        const container = document.getElementById('vendorListDisplay');
        if (!container) return;

        if (vendors.length === 0) {
            container.innerHTML = '<div class="no-data">No vendors found. Add your first vendor to get started!</div>';
            return;
        }

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px;">
                ${vendors.map(vendor => `
                    <div class="vendor-card" style="background: white; border-radius: 16px; border: 1px solid #edf2f7; box-shadow: 0 4px 6px rgba(0,0,0,0.02); overflow: hidden; display: flex; flex-direction: column;">
                        <div style="padding: 20px; flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                                <div>
                                    <h4 style="margin: 0; font-size: 18px; color: #2d3748; font-weight: 700;">${vendor.name || vendor.Name}</h4>
                                    <div style="display: inline-block; background: #f0fff4; color: #38a169; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.5px;">Active</div>
                                </div>
                                <div style="font-size: 24px; background: #f7fafc; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; border-radius: 10px;">🏭</div>
                            </div>
                            
                            <div style="font-size: 13px; color: #4a5568; line-height: 1.6; margin-bottom: 15px;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                    <span style="color: #a0aec0;">📧</span> <span>${vendor.contact_email || 'No email'}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                    <span style="color: #a0aec0;">📱</span> <span>${vendor.contact_phone || 'No phone'}</span>
                                </div>
                                <div style="margin-top: 10px; font-style: italic; color: #718096; font-size: 12px; background: #f8fafc; padding: 8px; border-radius: 6px; border-left: 3px solid #edf2f7;">
                                    ${vendor.description || 'No description provided.'}
                                </div>
                            </div>
                        </div>
                        
                        <div style="padding: 15px 20px; background: #fcfcfc; border-top: 1px solid #f7fafc; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <button onclick="addServiceForVendor('${vendor.vendor_id || vendor.VendorID}')" class="btn-small" style="background: #ebf4ff; color: #3182ce; font-weight: 700;">🔧 Add Item</button>
                            <button onclick="purchaseCreditsForVendor('${vendor.vendor_id || vendor.VendorID}')" class="btn-small" style="background: #f0fff4; color: #38a169; font-weight: 700;">💸 Buy Stock</button>
                            <button onclick="viewVendorServices('${vendor.vendor_id || vendor.VendorID}')" class="btn-small" style="background: #f7fafc; color: #4a5568; font-weight: 700;">📋 Catalog</button>
                            <button onclick="VendorsUI.deleteVendor('${vendor.vendor_id || vendor.VendorID}')" class="btn-small" style="background: #fff5f5; color: #e53e3e; font-weight: 700;">🗑️ Remove</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    static async deleteVendor(vendorId) {
        if (!confirm('Are you sure you want to delete this vendor? This will also remove all their products and stock levels.')) {
            return;
        }

        const password = prompt('Please enter the safety password to confirm deletion:');
        if (password === null) return; // User cancelled

        try {
            await VendorsAPI.delete(vendorId, password);
            Alerts.showSuccess('Vendor Deleted', 'The vendor has been removed successfully.');
            this.loadAndDisplayVendors(); // Refresh the UI list
        } catch (error) {
            // Error is handled in VendorsAPI.delete
        }
    }

    static updateVendorCount(count) {
        const countElement = document.getElementById('vendorCount');
        if (countElement) {
            countElement.textContent = count;
        }
    }

    static async loadAndDisplayServices() {
        try {
            console.log('🔧 Loading service catalog...');
            const response = await fetch('/api/vendor-services');
            const services = await response.json();
            
            const container = document.getElementById('vendorServicesList');
            if (!container) return;

            if (services.length === 0) {
                container.innerHTML = '<div class="no-data">Your catalog is empty. Add products or services below.</div>';
                return;
            }

            container.innerHTML = `
                <div class="table-responsive" style="border: 1px solid #edf2f7; box-shadow: none;">
                    <table class="data-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="text-align: left; background: #f8fafc; border-bottom: 2px solid #edf2f7;">
                                <th style="padding: 15px; font-size: 11px; text-transform: uppercase; color: #a0aec0; letter-spacing: 0.5px;">Vendor</th>
                                <th style="padding: 15px; font-size: 11px; text-transform: uppercase; color: #a0aec0; letter-spacing: 0.5px;">Item Name</th>
                                <th style="padding: 15px; font-size: 11px; text-transform: uppercase; color: #a0aec0; letter-spacing: 0.5px;">Type</th>
                                <th style="padding: 15px; font-size: 11px; text-transform: uppercase; color: #a0aec0; letter-spacing: 0.5px; text-align: right;">Cost</th>
                                <th style="padding: 15px; font-size: 11px; text-transform: uppercase; color: #a0aec0; letter-spacing: 0.5px; text-align: right;">Price</th>
                                <th style="padding: 15px; font-size: 11px; text-transform: uppercase; color: #a0aec0; letter-spacing: 0.5px;">Description</th>
                                <th style="padding: 15px; font-size: 11px; text-transform: uppercase; color: #a0aec0; letter-spacing: 0.5px; text-align: center;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${services.map(s => {
                                const typeColors = {
                                    'subscription': { bg: '#ebf4ff', text: '#3182ce' },
                                    'hardware': { bg: '#faf5ff', text: '#805ad5' },
                                    'fee': { bg: '#fffaf0', text: '#dd6b20' }
                                };
                                const colors = typeColors[s.item_type] || typeColors['subscription'];
                                return `
                                    <tr style="border-bottom: 1px solid #f7fafc;">
                                        <td style="padding: 15px;"><strong>${s.vendor_name}</strong></td>
                                        <td style="padding: 15px; color: #2d3748; font-weight: 600;">${s.service_name}</td>
                                        <td style="padding: 15px;">
                                            <span style="background: ${colors.bg}; color: ${colors.text}; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase;">
                                                ${s.item_type || 'subscription'}
                                            </span>
                                        </td>
                                        <td style="padding: 15px; text-align: right; color: #718096; font-family: monospace;">$${(s.cost_price || 0).toFixed(2)}</td>
                                        <td style="padding: 15px; text-align: right; color: #2d3748; font-weight: 700; font-family: monospace;">$${(s.default_price || 0).toFixed(2)}</td>
                                        <td style="padding: 15px; color: #a0aec0; font-size: 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                            ${s.description || '-'}
                                        </td>
                                        <td style="padding: 15px; text-align: center;">
                                            <button onclick="VendorsUI.deleteService('${s.service_id}')" class="btn-icon" style="color: #e53e3e; background: #fff5f5; padding: 6px; border-radius: 4px;" title="Remove Item">🗑️</button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            console.error('❌ Error loading service catalog:', error);
        }
    }

    static async deleteService(serviceId) {
        if (!confirm('Are you sure you want to remove this item from the catalog? This action cannot be undone.')) {
            return;
        }

        const password = prompt('Please enter the admin password to confirm deletion:');
        if (password !== '1234') {
            Alerts.showError('Access Denied', 'Incorrect password.');
            return;
        }

        try {
            const response = await fetch(`/api/vendor-services/${serviceId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                Alerts.showSuccess('Deleted', 'Item removed from catalog.');
                this.loadAndDisplayServices();
                // Also update POS catalog if it's open or cached
                if (window.POSUI) POSUI.loadCatalog();
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete service');
            }
        } catch (error) {
            console.error('❌ Error deleting service:', error);
            Alerts.showError('Delete Error', error.message);
        }
    }

    static filterVendors() {
        const searchTerm = document.getElementById('vendorSearch')?.value.toLowerCase() || '';

        if (!searchTerm.trim()) {
            this.filteredVendors = this.currentVendors;
        } else {
            this.filteredVendors = this.currentVendors.filter(vendor => {
                const name = (vendor.name || vendor.Name || '').toLowerCase();
                const email = (vendor.contact_email || vendor.ContactEmail || '').toLowerCase();
                const description = (vendor.description || vendor.Description || '').toLowerCase();

                return name.includes(searchTerm) ||
                    email.includes(searchTerm) ||
                    description.includes(searchTerm);
            });
        }

        this.displayVendorList(this.filteredVendors);
        this.updateVendorCount(this.filteredVendors.length);
    }

    static clearVendorSearch() {
        document.getElementById('vendorSearch').value = '';
        this.filterVendors();
    }

    static loadRecentPurchases() {
        try {
            TransactionUI.loadVendorTransactions().then(() => {
                // Display only the 5 most recent purchases
                const recentContainer = document.getElementById('recentPurchasesList');
                const allTransactions = document.getElementById('vendorTransactionsList');

                if (recentContainer && allTransactions) {
                    const transactions = allTransactions.innerHTML;
                    if (transactions) {
                        recentContainer.innerHTML = transactions;
                    }
                }
            });
        } catch (error) {
            console.error('❌ Error loading recent purchases:', error);
        }
    }

    // Dynamic Labeling logic
    static updateCatalogLabels() {
        const type = document.getElementById('catalogItemType').value;
        const nameLabel = document.getElementById('catalogNameLabel');
        const priceLabel = document.getElementById('catalogPriceLabel');
        const priceHelp = document.getElementById('catalogPriceHelp');

        if (type === 'subscription') {
            nameLabel.innerHTML = '🔧 Service Name:';
            priceLabel.innerHTML = '💰 Sales Price (per Month):';
            priceHelp.innerHTML = 'Standard monthly rate.';
        } else if (type === 'hardware') {
            nameLabel.innerHTML = '🔌 Item Name:';
            priceLabel.innerHTML = '💰 Sales Price (per Unit):';
            priceHelp.innerHTML = 'Price for a single device.';
        } else {
            nameLabel.innerHTML = '📝 Fee Name:';
            priceLabel.innerHTML = '💰 Sales Price:';
            priceHelp.innerHTML = 'Standard charge.';
        }
    }

    static updatePurchaseLabels() {
        const select = document.getElementById('purchaseServiceSelect');
        if (!select || select.selectedIndex === -1) return;
        
        const selectedOption = select.options[select.selectedIndex];
        let type = selectedOption?.dataset.type;

        // Fallback: If dataset is missing, try to find the service in global Store
        if (!type && selectedOption?.value && window.Store) {
            const allServices = Store.getVendorServices();
            const service = allServices.find(s => (s.service_name || s.ServiceName) === selectedOption.value);
            type = service?.item_type || service?.ItemType || 'subscription';
        }

        if (!type) type = 'subscription'; // Final default

        console.log('🔄 Terminology update:', { item: selectedOption.value, type: type });

        const qtyLabel = document.getElementById('purchaseQtyLabel');
        const qtyHelp = document.getElementById('purchaseQtyHelp');

        if (!qtyLabel || !qtyHelp) return;

        if (type === 'subscription') {
            qtyLabel.innerHTML = '📊 Number of Credits (Months):';
            qtyHelp.innerHTML = 'Enter the total months of service purchased.';
        } else if (type === 'hardware') {
            qtyLabel.innerHTML = '📦 Number of Units:';
            qtyHelp.innerHTML = 'Enter the total number of physical devices bought.';
        } else {
            qtyLabel.innerHTML = '📊 Quantity:';
            qtyHelp.innerHTML = 'Enter the quantity for this fee/service.';
        }
    }
}

// Global functions for HTML onclick handlers
function showVendorTab(tab) {
    Tabs.showVendorTab(tab);
}

function filterVendors() {
    VendorsUI.filterVendors();
}

function clearVendorSearch() {
    VendorsUI.clearVendorSearch();
}

function addServiceForVendor(vendorId) {
    Tabs.showVendorTab('vendor-services');
    setTimeout(() => {
        const vendorSelect = document.getElementById('serviceVendorSelect');
        if (vendorSelect) {
            vendorSelect.value = vendorId;
            VendorsUI.updateCatalogLabels();
        }
    }, 100);
}

function purchaseCreditsForVendor(vendorId) {
    Tabs.showVendorTab('purchase-credits');
    setTimeout(() => {
        const vendorSelect = document.getElementById('purchaseVendorSelect');
        if (vendorSelect) {
            vendorSelect.value = vendorId;
            loadServicesForPurchaseVendor();
        }
    }, 100);
}

function viewVendorServices(vendorId) {
    Tabs.showVendorTab('vendor-services');
    // Could filter services by vendor here
}

function loadServicesForPurchaseVendor() {
    const vendorId = document.getElementById('purchaseVendorSelect').value;
    const serviceSelect = document.getElementById('purchaseServiceSelect');

    if (!serviceSelect) return;
    serviceSelect.innerHTML = '<option value="">Choose an item...</option>';

    if (vendorId) {
        // Fetch services for this vendor
        fetch(`/api/vendor-services/${vendorId}`)
            .then(res => res.json())
            .then(services => {
                if (!Array.isArray(services)) {
                    console.error('Expected array of services but got:', services);
                    return;
                }
                console.log('📦 API returned services:', services);
                services.forEach(service => {
                    const option = document.createElement('option');
                    const name = service.service_name || service.ServiceName;
                    const type = service.item_type || service.ItemType || 'subscription';
                    
                    option.value = name;
                    option.textContent = name;
                    option.setAttribute('data-type', type); // Explicit attribute
                    option.dataset.type = type; // Dataset property
                    serviceSelect.appendChild(option);
                });
                VendorsUI.updatePurchaseLabels();
            })
            .catch(err => console.error('Error loading services for purchase:', err));
    }
}

// Update existing VendorsUI methods
VendorsUI.loadAndDisplayVendors = VendorsUI.loadAndDisplayVendors;

// Make available globally
window.VendorsUI = VendorsUI;
