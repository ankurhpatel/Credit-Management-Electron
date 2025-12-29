// Global state management - IT Services Credit Management System
class Store {
    static data = {
        customers: [],
        vendors: [],
        vendorServices: [],
        subscriptions: [],
        vendorTransactions: [],
        creditBalances: [],
        businessTransactions: [],
        businessBalance: 0,
        dashboardStats: {},
        settings: {},
        currentTab: 'dashboard'
    };

    static async initialize() {
        console.log('🗄️ Initializing application state...');
        // Load any saved state from localStorage
        this.loadFromLocalStorage();
        console.log('✅ Application state initialized');
    }

    // Settings
    static setSettings(settings) {
        this.data.settings = settings || {};
        this.saveToLocalStorage('settings');
        this.notifyChange('settings', this.data.settings);
    }

    static getSettings() {
        return this.data.settings || {};
    }

    // Customers
    static setCustomers(customers) {
        this.data.customers = customers || [];
        this.saveToLocalStorage('customers');
        this.notifyChange('customers', this.data.customers);
    }

    static getCustomers() {
        return this.data.customers;
    }

    static addCustomer(customer) {
        if (customer) {
            this.data.customers.push(customer);
            this.saveToLocalStorage('customers');
            this.notifyChange('customers', this.data.customers);
        }
    }

    static updateCustomer(customerId, updates) {
        const index = this.data.customers.findIndex(c =>
            (c.id || c.CustomerID) === customerId
        );
        if (index !== -1) {
            this.data.customers[index] = { ...this.data.customers[index], ...updates };
            this.saveToLocalStorage('customers');
            this.notifyChange('customers', this.data.customers);
        }
    }

    static removeCustomer(customerId) {
        this.data.customers = this.data.customers.filter(c =>
            (c.id || c.CustomerID) !== customerId
        );
        this.saveToLocalStorage('customers');
        this.notifyChange('customers', this.data.customers);
    }

    // Vendors
    static setVendors(vendors) {
        this.data.vendors = vendors || [];
        this.saveToLocalStorage('vendors');
        this.notifyChange('vendors', this.data.vendors);
    }

    static getVendors() {
        return this.data.vendors;
    }

    static addVendor(vendor) {
        if (vendor) {
            this.data.vendors.push(vendor);
            this.saveToLocalStorage('vendors');
            this.notifyChange('vendors', this.data.vendors);
        }
    }

    static updateVendor(vendorId, updates) {
        const index = this.data.vendors.findIndex(v =>
            (v.vendor_id || v.VendorID) === vendorId
        );
        if (index !== -1) {
            this.data.vendors[index] = { ...this.data.vendors[index], ...updates };
            this.saveToLocalStorage('vendors');
            this.notifyChange('vendors', this.data.vendors);
        }
    }

    static removeVendor(vendorId) {
        this.data.vendors = this.data.vendors.filter(v =>
            (v.vendor_id || v.VendorID) !== vendorId
        );
        this.saveToLocalStorage('vendors');
        this.notifyChange('vendors', this.data.vendors);
    }

    // Vendor Services
    static setVendorServices(services) {
        this.data.vendorServices = services || [];
        this.saveToLocalStorage('vendorServices');
        this.notifyChange('vendorServices', this.data.vendorServices);
    }

    static getVendorServices() {
        return this.data.vendorServices;
    }

    static addVendorService(service) {
        if (service) {
            this.data.vendorServices.push(service);
            this.saveToLocalStorage('vendorServices');
            this.notifyChange('vendorServices', this.data.vendorServices);
        }
    }

    // Subscriptions
    static setSubscriptions(subscriptions) {
        this.data.subscriptions = subscriptions || [];
        this.saveToLocalStorage('subscriptions');
        this.notifyChange('subscriptions', this.data.subscriptions);
    }

    static getSubscriptions() {
        return this.data.subscriptions;
    }

    static addSubscription(subscription) {
        if (subscription) {
            this.data.subscriptions.push(subscription);
            this.saveToLocalStorage('subscriptions');
            this.notifyChange('subscriptions', this.data.subscriptions);
        }
    }

    static updateSubscription(subscriptionId, updates) {
        const index = this.data.subscriptions.findIndex(s =>
            (s.id || s.SubscriptionID) === subscriptionId
        );
        if (index !== -1) {
            this.data.subscriptions[index] = { ...this.data.subscriptions[index], ...updates };
            this.saveToLocalStorage('subscriptions');
            this.notifyChange('subscriptions', this.data.subscriptions);
        }
    }

    // Credit Balances
    static setCreditBalances(balances) {
        this.data.creditBalances = balances || [];
        this.saveToLocalStorage('creditBalances');
        this.notifyChange('creditBalances', this.data.creditBalances);
    }

    static getCreditBalances() {
        return this.data.creditBalances;
    }

    static updateCreditBalance(vendorId, serviceName, updates) {
        const index = this.data.creditBalances.findIndex(b =>
            (b.vendor_id || b.VendorID) === vendorId &&
            (b.service_name || b.ServiceName) === serviceName
        );
        if (index !== -1) {
            this.data.creditBalances[index] = { ...this.data.creditBalances[index], ...updates };
            this.saveToLocalStorage('creditBalances');
            this.notifyChange('creditBalances', this.data.creditBalances);
        }
    }

    // Vendor Transactions
    static setVendorTransactions(transactions) {
        this.data.vendorTransactions = transactions || [];
        this.saveToLocalStorage('vendorTransactions');
        this.notifyChange('vendorTransactions', this.data.vendorTransactions);
    }

    static getVendorTransactions() {
        return this.data.vendorTransactions;
    }

    static addVendorTransaction(transaction) {
        if (transaction) {
            this.data.vendorTransactions.push(transaction);
            this.saveToLocalStorage('vendorTransactions');
            this.notifyChange('vendorTransactions', this.data.vendorTransactions);
        }
    }

    // Business Transactions
    static setBusinessTransactions(transactions) {
        this.data.businessTransactions = transactions || [];
        this.saveToLocalStorage('businessTransactions');
        this.notifyChange('businessTransactions', this.data.businessTransactions);
    }

    static getBusinessTransactions() {
        return this.data.businessTransactions;
    }

    static addBusinessTransaction(transaction) {
        if (transaction) {
            this.data.businessTransactions.push(transaction);
            this.saveToLocalStorage('businessTransactions');
            this.notifyChange('businessTransactions', this.data.businessTransactions);
        }
    }

    // Business Balance
    static setBusinessBalance(balance) {
        this.data.businessBalance = balance || 0;
        this.saveToLocalStorage('businessBalance');
        this.notifyChange('businessBalance', this.data.businessBalance);
    }

    static getBusinessBalance() {
        return this.data.businessBalance;
    }

    // Dashboard Stats
    static setDashboardStats(stats) {
        this.data.dashboardStats = stats || {};
        this.saveToLocalStorage('dashboardStats');
        this.notifyChange('dashboardStats', this.data.dashboardStats);
    }

    static getDashboardStats() {
        return this.data.dashboardStats;
    }

    // Current Tab
    static setCurrentTab(tabName) {
        if (tabName) {
            this.data.currentTab = tabName;
            this.saveToLocalStorage('currentTab');
        }
    }

    static getCurrentTab() {
        return this.data.currentTab || 'dashboard';
    }

    // Persistence methods
    static saveToLocalStorage(key) {
        try {
            if (key && this.data.hasOwnProperty(key)) {
                localStorage.setItem(`itservices_${key}`, JSON.stringify(this.data[key]));
            }
        } catch (error) {
            console.warn(`⚠️ Failed to save ${key} to localStorage:`, error);
        }
    }

    static loadFromLocalStorage() {
        try {
            Object.keys(this.data).forEach(key => {
                const saved = localStorage.getItem(`itservices_${key}`);
                if (saved) {
                    try {
                        this.data[key] = JSON.parse(saved);
                    } catch (error) {
                        console.warn(`⚠️ Failed to parse saved ${key}:`, error);
                    }
                }
            });
        } catch (error) {
            console.warn('⚠️ Failed to load from localStorage:', error);
        }
    }

    static clearLocalStorage() {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('itservices_')) {
                    localStorage.removeItem(key);
                }
            });
            console.log('🗑️ Local storage cleared');
        } catch (error) {
            console.warn('⚠️ Failed to clear localStorage:', error);
        }
    }

    // Event system for state changes
    static listeners = {};

    static subscribe(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }

        this.listeners[event].push(callback);

        // Return unsubscribe function
        return () => {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        };
    }

    static notifyChange(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Error in state change listener for ${event}:`, error);
                }
            });
        }
    }

    // Utility methods
    static getAll() {
        return this.deepClone(this.data);
    }

    static reset() {
        this.data = {
            customers: [],
            vendors: [],
            vendorServices: [],
            subscriptions: [],
            vendorTransactions: [],
            creditBalances: [],
            businessTransactions: [],
            businessBalance: 0,
            dashboardStats: {},
            currentTab: 'dashboard'
        };
        this.clearLocalStorage();
        console.log('🔄 Application state reset');
    }

    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));

        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }

        return obj;
    }

    // Search and filter methods
    static searchCustomers(query) {
        if (!query) return this.data.customers;

        const searchTerm = query.toLowerCase();
        return this.data.customers.filter(customer =>
            (customer.name || customer.Name || '').toLowerCase().includes(searchTerm) ||
            (customer.email || customer.Email || '').toLowerCase().includes(searchTerm) ||
            (customer.phone || customer.Phone || '').toLowerCase().includes(searchTerm)
        );
    }

    static searchVendors(query) {
        if (!query) return this.data.vendors;

        const searchTerm = query.toLowerCase();
        return this.data.vendors.filter(vendor =>
            (vendor.name || vendor.Name || '').toLowerCase().includes(searchTerm) ||
            (vendor.contact_email || vendor.ContactEmail || '').toLowerCase().includes(searchTerm) ||
            (vendor.description || vendor.Description || '').toLowerCase().includes(searchTerm)
        );
    }

    static getCustomerById(customerId) {
        return this.data.customers.find(c =>
            (c.id || c.CustomerID) === customerId
        );
    }

    static getVendorById(vendorId) {
        return this.data.vendors.find(v =>
            (v.vendor_id || v.VendorID) === vendorId
        );
    }

    static getServicesByVendor(vendorId) {
        return this.data.vendorServices.filter(service =>
            (service.vendor_id || service.VendorID) === vendorId
        );
    }

    // Analytics methods
    static getCustomerStats() {
        return {
            totalCustomers: this.data.customers.length,
            activeCustomers: this.data.customers.filter(c =>
                (c.status || c.Status || 'active') === 'active'
            ).length
        };
    }

    static getVendorStats() {
        return {
            totalVendors: this.data.vendors.length,
            totalServices: this.data.vendorServices.length,
            totalCreditsRemaining: this.data.creditBalances.reduce((sum, balance) =>
                sum + (balance.remaining_credits || balance.RemainingCredits || 0), 0
            )
        };
    }

    static getSubscriptionStats() {
        const activeSubscriptions = this.data.subscriptions.filter(s =>
            (s.status || s.Status || 'active') === 'active'
        );

        return {
            totalSubscriptions: this.data.subscriptions.length,
            activeSubscriptions: activeSubscriptions.length,
            totalRevenue: activeSubscriptions.reduce((sum, sub) =>
                sum + (parseFloat(sub.amount_paid || sub.AmountPaid || 0)), 0
            ),
            totalCreditsUsed: activeSubscriptions.reduce((sum, sub) =>
                sum + (parseInt(sub.credits_used || sub.CreditsUsed || 0)), 0
            )
        };
    }

    // Debug methods
    static logState() {
        console.group('📊 Current Application State');
        console.log('Customers:', this.data.customers.length);
        console.log('Vendors:', this.data.vendors.length);
        console.log('Vendor Services:', this.data.vendorServices.length);
        console.log('Subscriptions:', this.data.subscriptions.length);
        console.log('Credit Balances:', this.data.creditBalances.length);
        console.log('Vendor Transactions:', this.data.vendorTransactions.length);
        console.log('Business Balance:', this.data.businessBalance);
        console.log('Current Tab:', this.data.currentTab);
        console.groupEnd();
    }

    static exportData() {
        try {
            const data = this.getAll();
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `it-services-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log('📁 Data exported successfully');
        } catch (error) {
            console.error('❌ Error exporting data:', error);
        }
    }

    static importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);

            // Validate data structure
            const requiredKeys = Object.keys(this.data);
            const hasValidStructure = requiredKeys.every(key => data.hasOwnProperty(key));

            if (!hasValidStructure) {
                throw new Error('Invalid data structure');
            }

            this.data = data;

            // Save all data to localStorage
            Object.keys(this.data).forEach(key => {
                this.saveToLocalStorage(key);
            });

            console.log('📁 Data imported successfully');
            return true;
        } catch (error) {
            console.error('❌ Error importing data:', error);
            return false;
        }
    }
}

// Make available globally
window.Store = Store;
