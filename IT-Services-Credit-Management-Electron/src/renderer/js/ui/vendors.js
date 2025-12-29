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

        container.innerHTML = vendors.map(vendor => `
            <div class="vendor-card" data-vendor-id="${vendor.vendor_id || vendor.VendorID}">
                <div class="vendor-header">
                    <h4 class="vendor-name">${vendor.name || vendor.Name}</h4>
                    <div class="vendor-status active">ACTIVE</div>
                </div>
                <div class="vendor-details">
                    <div class="vendor-info">
                        <strong>📧 Email:</strong> ${vendor.contact_email || vendor.ContactEmail || 'Not provided'}<br>
                        <strong>📱 Phone:</strong> ${vendor.contact_phone || vendor.ContactPhone || 'Not provided'}<br>
                        <strong>📅 Added:</strong> ${Formatters.formatDate(vendor.created_date || vendor.CreatedDate)}
                        ${(vendor.description || vendor.Description) ?
                `<br><strong>📝 Description:</strong> ${vendor.description || vendor.Description}` : ''
            }
                    </div>
                </div>
                <div class="vendor-actions">
                    <button onclick="addServiceForVendor('${vendor.vendor_id || vendor.VendorID}')" class="btn-small btn-success">🔧 Add Service</button>
                    <button onclick="purchaseCreditsForVendor('${vendor.vendor_id || vendor.VendorID}')" class="btn-small btn-info">💸 Add Stock</button>
                    <button onclick="viewVendorServices('${vendor.vendor_id || vendor.VendorID}')" class="btn-small btn-primary">📋 View Services</button>
                    <button onclick="VendorsUI.deleteVendor('${vendor.vendor_id || vendor.VendorID}')" class="btn-small btn-danger">🗑️ Delete</button>
                </div>
            </div>
        `).join('');
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
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Vendor</th>
                                <th>Name</th>
                                <th>Type</th>
                                <th class="text-right">Cost</th>
                                <th class="text-right">Sales Price</th>
                                <th>Date Added</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${services.map(s => `
                                <tr>
                                    <td><strong>${s.vendor_name}</strong></td>
                                    <td>${s.service_name}</td>
                                    <td><span class="badge badge-light">${(s.item_type || 'subscription').toUpperCase()}</span></td>
                                    <td class="text-right font-mono text-muted">$${(s.cost_price || 0).toFixed(2)}</td>
                                    <td class="text-right font-mono"><strong>$${(s.default_price || 0).toFixed(2)}</strong></td>
                                    <td><small>${Formatters.formatDate(s.created_date)}</small></td>
                                    <td><small class="text-muted">${s.description || '-'}</small></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            console.error('❌ Error loading service catalog:', error);
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
        fetch(`/api/vendor-services/${vendorId}`).then(res => res.json()).then(services => {
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
        }).catch(err => console.error('Error loading services for purchase:', err));
    }
}

// Update existing VendorsUI methods
VendorsUI.loadAndDisplayVendors = VendorsUI.loadAndDisplayVendors;

// Make available globally
window.VendorsUI = VendorsUI;
