// Vendor API calls and data management
class VendorsAPI {
    static async loadAll() {
        try {
            console.log('🏭 Loading vendors...');
            const response = await fetch('/api/vendors');
            const vendors = await response.json();

            // Update global state
            Store.setVendors(vendors);

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

            // Enhance services with vendor names
            const vendors = Store.getVendors();
            const enhancedServices = services.map(service => {
                const vendor = vendors.find(v => (v.VendorID || v.vendor_id) === (service.VendorID || service.vendor_id));
                return {
                    ...service,
                    vendor_name: vendor ? vendor.Name : 'Unknown Vendor',
                    VendorName: vendor ? vendor.Name : 'Unknown Vendor'
                };
            });

            // Update global state
            Store.setVendorServices(enhancedServices);

            console.log(`✅ Loaded ${enhancedServices.length} vendor services`);
            return enhancedServices;
        } catch (error) {
            console.error('❌ Error loading vendor services:', error);
            Alerts.showError('Loading Error', 'Failed to load vendor services');
            return [];
        }
    }

    static async add(vendorData) {
        try {
            console.log('➕ Adding new vendor...');

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

    static getById(vendorId) {
        const vendors = Store.getVendors();
        return vendors.find(v => (v.VendorID || v.vendor_id) === vendorId);
    }

    static getServicesByVendor(vendorId) {
        const services = Store.getVendorServices();
        return services.filter(s => (s.VendorID || s.vendor_id) === vendorId);
    }
}

// Make available globally
window.VendorsAPI = VendorsAPI;
