// Customer API calls and data management
class CustomersAPI {
    static async loadAll() {
        try {
            console.log('📋 Loading customers...');
            const response = await fetch('/api/customers');
            const customers = await response.json();

            // Update global state
            Store.setCustomers(customers);

            // Update UI dropdowns
            this.populateCustomerSelects();

            console.log(`✅ Loaded ${customers.length} customers`);
            return customers;
        } catch (error) {
            console.error('❌ Error loading customers:', error);
            Alerts.showError('Loading Error', 'Failed to load customers');
            return [];
        }
    }

    static async add(customerData) {
        try {
            console.log('➕ Adding new customer...');

            // Validate data first
            const validationResult = Validators.validateCustomer(customerData);
            if (!validationResult.isValid) {
                throw new Error(validationResult.errors.join(', '));
            }

            const response = await fetch('/api/customers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(customerData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to add customer');
            }

            console.log('✅ Customer added successfully');

            // Refresh customer data
            await this.loadAll();

            Alerts.showSuccess('Customer Added', result.message);
            return result.customer;

        } catch (error) {
            console.error('❌ Error adding customer:', error);
            Alerts.showError('Add Customer Error', error.message);
            throw error;
        }
    }

    static async updateCustomerStatus(customerId, status) {
        try {
            console.log(`🔄 Updating customer status: ${customerId} to ${status}`);

            const response = await fetch(`/api/customers/${customerId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update customer status');
            }

            console.log('✅ Customer status updated successfully');

            // Refresh customer data
            await this.loadAll();

            return result;

        } catch (error) {
            console.error('❌ Error updating customer status:', error);
            throw error;
        }
    }

    static async loadTransactions(customerId) {
        try {
            console.log(`📋 Loading transactions for customer: ${customerId}`);

            if (!customerId) {
                throw new Error('Customer ID is required');
            }

            const response = await fetch(`/api/customers/${customerId}/transactions`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load customer transactions');
            }

            console.log('✅ Customer transactions loaded');
            return data;

        } catch (error) {
            console.error('❌ Error loading customer transactions:', error);
            Alerts.showError('Loading Error', 'Failed to load customer transactions');
            throw error;
        }
    }

    static populateCustomerSelects() {
        const customers = Store.getCustomers();
        // Only populate regular selects with active customers
        const activeCustomers = customers.filter(c =>
            (c.status || c.Status || 'active').toLowerCase() === 'active'
        );

        const selects = [
            document.getElementById('editCustomerSelect')
        ];

        selects.forEach(select => {
            if (!select) return;

            select.innerHTML = '<option value="">Choose a customer...</option>';

            activeCustomers.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.id || customer.CustomerID;
                option.textContent = `${customer.name || customer.Name} - ${customer.email || customer.Email}`;
                select.appendChild(option);
            });
        });

        console.log(`📋 Populated customer selects with ${activeCustomers.length} active customers`);
    }

    static async search(query) {
        const customers = Store.getCustomers();

        if (!query) return customers;

        const searchTerm = query.toLowerCase();
        return customers.filter(customer =>
            (customer.name || customer.Name || '').toLowerCase().includes(searchTerm) ||
            (customer.email || customer.Email || '').toLowerCase().includes(searchTerm) ||
            (customer.phone || customer.Phone || '').toLowerCase().includes(searchTerm) ||
            (customer.id || customer.CustomerID || '').toString().toLowerCase().includes(searchTerm)
        );
    }

    static getById(customerId) {
        const customers = Store.getCustomers();
        return customers.find(c => (c.id || c.CustomerID) === customerId);
    }
}

// Make available globally
window.CustomersAPI = CustomersAPI;
