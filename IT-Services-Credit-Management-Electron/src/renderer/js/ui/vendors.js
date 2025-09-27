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
                    <button onclick="purchaseCreditsForVendor('${vendor.vendor_id || vendor.VendorID}')" class="btn-small btn-info">💸 Purchase Credits</button>
                    <button onclick="viewVendorServices('${vendor.vendor_id || vendor.VendorID}')" class="btn-small btn-primary">📋 View Services</button>
                </div>
            </div>
        `).join('');
    }

    static updateVendorCount(count) {
        const countElement = document.getElementById('vendorCount');
        if (countElement) {
            countElement.textContent = count;
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

    serviceSelect.innerHTML = '<option value="">Choose a service...</option>';

    if (vendorId) {
        VendorsAPI.loadServices(vendorId).then(services => {
            services.forEach(service => {
                const option = document.createElement('option');
                option.value = service.service_name || service.ServiceName;
                option.textContent = service.service_name || service.ServiceName;
                serviceSelect.appendChild(option);
            });
        });
    }
}

// Update existing VendorsUI methods
VendorsUI.loadAndDisplayVendors = VendorsUI.loadAndDisplayVendors;

// Make available globally
window.VendorsUI = VendorsUI;
