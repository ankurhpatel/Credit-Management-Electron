// Vendor API calls and data management
class VendorsAPI {
    static async loadAll() {
        try {
            console.log('🏭 Loading vendors...');
            const response = await fetch('/api/vendors');
            const vendors = await response.json();

            // Update global state
            Store.setVendors(vendors);

            // Update UI dropdowns
            this.populateVendorSelects();

            console.log(`✅ Loaded ${vendors.length} vendors`);
            return vendors;
        } catch (error) {
            console.error('❌ Error loading vendors:', error);
            Alerts.showError('Loading Error', 'Failed to load vendors');
            return [];
        }
    }

    static async loadServices() {
        try {
            console.log('🔧 Loading vendor services...');
            const response = await fetch('/api/vendor-services');
            const services = await response.json();

            // Update global state
            Store.setVendorServices(services);

            console.log(`✅ Loaded ${services.length} vendor services`);
            return services;
        } catch (error) {
            console.error('❌ Error loading vendor services:', error);
            Alerts.showError('Loading Error', 'Failed to load vendor services');
            return [];
        }
    }

    static async add(vendorData) {
        try {
            console.log('➕ Adding new vendor...');

            // Validate data first
            const validationResult = Validators.validateVendor(vendorData);
            if (!validationResult.isValid) {
                throw new Error(validationResult.errors.join(', '));
            }

            const response = await fetch('/api/vendors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(vendorData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to add vendor');
            }

            console.log('✅ Vendor added successfully');

            // Refresh vendor data
            await this.loadAll();

            Alerts.showSuccess('Vendor Added', result.message);
            return result.vendor;

        } catch (error) {
            console.error('❌ Error adding vendor:', error);
            Alerts.showError('Add Vendor Error', error.message);
            throw error;
        }
    }

    static async addService(serviceData) {
        try {
            console.log('🔧 Adding vendor service...');

            const response = await fetch('/api/vendor-services', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(serviceData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to add service');
            }

            console.log('✅ Vendor service added successfully');

            // Refresh services data
            await this.loadServices();

            Alerts.showSuccess('Service Added', result.message);
            return result.service;

        } catch (error) {
            console.error('❌ Error adding vendor service:', error);
            Alerts.showError('Add Service Error', error.message);
            throw error;
        }
    }

    static async delete(vendorId, password) {
        try {
            console.log(`🗑️ Deleting vendor: ${vendorId}`);
            const response = await fetch(`/api/vendors/${vendorId}`, {
                method: 'DELETE',
                headers: {
                    'password': password
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete vendor');
            }

            console.log('✅ Vendor deleted successfully');
            await this.loadAll(); // Refresh list
            return result;
        } catch (error) {
            console.error('❌ Error deleting vendor:', error);
            Alerts.showError('Delete Error', error.message);
            throw error;
        }
    }

    static populateVendorSelects() {
        const vendors = Store.getVendors();
        
        const selects = [
            document.getElementById('serviceVendorSelect'),
            document.getElementById('purchaseVendorSelect')
        ];

        selects.forEach(select => {
            if (!select) return;

            // Store current selection
            const currentValue = select.value;
            
            select.innerHTML = '<option value="">Choose a vendor...</option>';

            vendors.forEach(vendor => {
                const option = document.createElement('option');
                option.value = vendor.vendor_id || vendor.VendorID;
                option.textContent = vendor.name || vendor.Name;
                select.appendChild(option);
            });
            
            // Restore selection if it still exists
            if (currentValue) {
                select.value = currentValue;
            }
        });

        console.log(`🏭 Populated vendor selects with ${vendors.length} vendors`);
    }

    static async loadServicesForVendor(vendorId) {
        try {
            if (!vendorId) return;

            console.log(`🔧 Loading services for vendor: ${vendorId}`);
            const response = await fetch(`/api/vendor-services/${vendorId}`);
            const services = await response.json();

            const serviceSelect = document.getElementById('purchaseServiceSelect');
            if (serviceSelect) {
                serviceSelect.innerHTML = '<option value="">Choose a service...</option>';
                
                services.forEach(service => {
                    const option = document.createElement('option');
                    option.value = service.service_name || service.ServiceName;
                    option.textContent = service.service_name || service.ServiceName;
                    serviceSelect.appendChild(option);
                });
            }

            console.log(`✅ Loaded ${services.length} services for vendor`);
            return services;
        } catch (error) {
            console.error('❌ Error loading services for vendor:', error);
            return [];
        }
    }

    static async loadServicesForPurchase(vendorId) {
        return this.loadServicesForVendor(vendorId);
    }

    static getById(vendorId) {
        const vendors = Store.getVendors();
        return vendors.find(v => (v.vendor_id || v.VendorID) === vendorId);
    }

    static getServicesByVendor(vendorId) {
        const services = Store.getVendorServices();
        return services.filter(s => (s.vendor_id || s.VendorID) === vendorId);
    }

    static getAllServices() {
        return Store.getVendorServices();
    }

    // New method to populate services dropdown for subscription form
    static populateSubscriptionServicesDropdown() {
        const services = Store.getVendorServices();
        const vendors = Store.getVendors();
        
        const select = document.getElementById('vendorServiceSelectSub');
        if (!select) {
            console.warn('⚠️ vendorServiceSelectSub element not found');
            return;
        }

        select.innerHTML = '<option value="">Choose a service...</option>';

        if (services.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No services available - Add vendors and services first';
            option.disabled = true;
            select.appendChild(option);
            return;
        }

        services.forEach(service => {
            // Find vendor for this service
            const vendor = vendors.find(v => 
                (v.vendor_id || v.VendorID) === (service.vendor_id || service.VendorID)
            );
            
            const option = document.createElement('option');
            option.value = service.service_name || service.ServiceName;
            option.dataset.vendorId = service.vendor_id || service.VendorID;
            option.dataset.vendorName = vendor ? (vendor.name || vendor.Name) : 'Unknown Vendor';
            option.textContent = `${service.service_name || service.ServiceName} (${option.dataset.vendorName})`;
            select.appendChild(option);
        });

        console.log(`🔧 Populated subscription services dropdown with ${services.length} services`);
    }
}

// Make available globally
window.VendorsAPI = VendorsAPI;