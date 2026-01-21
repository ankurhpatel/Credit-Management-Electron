// Enhanced Customer UI management with Ajax-style search and print functionality
class CustomersUI {
    static currentCustomers = [];
    static filteredCustomers = [];
    static vendorServices = [];

    static async initialize() {
        console.log('👥 Initializing Customer UI...');
        await this.loadAndDisplayCustomers();
        await this.loadVendorServices();

        // Add print button to customer management tab
        this.addPrintButtons();

        console.log('✅ Customer UI initialized');
    }

    static async loadAndDisplayCustomers() {
        try {
            console.log('👥 Loading customer list...');
            const customers = await CustomersAPI.loadAll();
            this.currentCustomers = customers;
            this.filteredCustomers = customers;
            this.displayCustomers(customers);
            this.updateCustomerCount(customers.length);
        } catch (error) {
            console.error('❌ Error loading customer list:', error);
        }
    }

    static async loadVendorServices() {
        try {
            console.log('🔧 Loading vendor services for subscription dropdown...');

            // Load vendors first, then services
            await VendorsAPI.loadAll();
            const services = await VendorsAPI.loadServices();

            this.vendorServices = services;
            
            // Use the new method from VendorsAPI to populate the subscription dropdown
            VendorsAPI.populateSubscriptionServicesDropdown();

            console.log(`✅ Loaded ${services.length} vendor services`);
        } catch (error) {
            console.error('❌ Error loading vendor services:', error);
            Alerts.showError('Loading Error', 'Failed to load vendor services');
        }
    }

    static displayCustomers(customers) {
        const container = document.getElementById('customerListDisplay');
        if (!container) return;

        if (customers.length === 0) {
            container.innerHTML = '<div class="no-data">No customers found. Add your first customer to get started!</div>';
            return;
        }

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px;">
                ${customers.map(customer => {
                    const status = (customer.status || customer.Status || 'active').toLowerCase();
                    const isActive = status === 'active';
                    const statusColor = isActive ? '#38a169' : '#e53e3e';
                    const statusBg = isActive ? '#f0fff4' : '#fff5f5';

                    return `
                        <div class="customer-card" style="background: white; border-radius: 16px; border: 1px solid #edf2f7; box-shadow: 0 4px 6px rgba(0,0,0,0.02); overflow: hidden; display: flex; flex-direction: column; transition: all 0.3s ease;">
                            <div style="padding: 20px; flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                                    <div>
                                        <h4 class="customer-name" style="margin: 0; font-size: 18px; color: #2d3748; font-weight: 700; cursor: pointer; transition: color 0.2s;" onclick="CustomerProfileUI.loadProfile('${customer.id || customer.CustomerID}')">${customer.name || customer.Name}</h4>
                                        <div style="display: inline-block; background: ${statusBg}; color: ${statusColor}; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.5px;">${status}</div>
                                    </div>
                                    <div style="font-size: 24px; background: #f7fafc; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; border-radius: 10px;">👤</div>
                                </div>
                                
                                <div style="font-size: 13px; color: #4a5568; line-height: 1.6;">
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                        <span style="color: #a0aec0; width: 15px;">📧</span> <span>${customer.email || customer.Email}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                        <span style="color: #a0aec0; width: 15px;">📱</span> <span>${customer.phone || customer.Phone || 'Not provided'}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                        <span style="color: #a0aec0; width: 15px;">📅</span> <span style="font-size: 11px; color: #718096;">Added ${this.formatDate(customer.created_date || customer.CreatedDate)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div style="padding: 15px 20px; background: #fcfcfc; border-top: 1px solid #f7fafc; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <button onclick="CustomerProfileUI.loadProfile('${customer.id || customer.CustomerID}')" class="btn-small" style="background: #ebf8ff; color: #3182ce; font-weight: 700;">👤 Profile</button>
                                <button onclick="editCustomerById('${customer.id || customer.CustomerID}')" class="btn-small" style="background: #f7fafc; color: #4a5568; font-weight: 700;">✏️ Edit</button>
                                ${isActive ?
                                    `<button onclick="addSubscriptionForCustomer('${customer.id || customer.CustomerID}')" class="btn-small" style="background: #f0fff4; color: #38a169; font-weight: 700; grid-column: span 2;">📝 New Sale (POS)</button>`
                                    : `<button onclick="reactivateCustomer('${customer.id || customer.CustomerID}')" class="btn-small" style="background: #f0fff4; color: #38a169; font-weight: 700; grid-column: span 2;">✅ Activate</button>`
                                }
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    static formatDate(date) {
        if (!date) return 'N/A';
        
        try {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) return 'Invalid Date';
            
            return dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            console.warn('Error formatting date:', error);
            return 'Invalid Date';
        }
    }

    static updateCustomerCount(count) {
        const countElement = document.getElementById('customerCount');
        if (countElement) {
            countElement.textContent = count;
        }
    }

    static filterCustomers() {
        const searchTerm = document.getElementById('customerSearch')?.value.toLowerCase() || '';

        if (!searchTerm.trim()) {
            this.filteredCustomers = this.currentCustomers;
        } else {
            this.filteredCustomers = this.currentCustomers.filter(customer => {
                const name = (customer.name || customer.Name || '').toLowerCase();
                const email = (customer.email || customer.Email || '').toLowerCase();
                const phone = (customer.phone || customer.Phone || '').toLowerCase();
                const id = (customer.id || customer.CustomerID || '').toString().toLowerCase();

                return name.includes(searchTerm) ||
                    email.includes(searchTerm) ||
                    phone.includes(searchTerm) ||
                    id.includes(searchTerm);
            });
        }

        this.displayCustomers(this.filteredCustomers);
        this.updateCustomerCount(this.filteredCustomers.length);
    }

    static clearCustomerSearch() {
        document.getElementById('customerSearch').value = '';
        this.filterCustomers();
    }

    // Ajax-style customer search for subscription form
    static searchCustomersForSubscription() {
        const searchInput = document.getElementById('customerSearchInput');
        const searchTerm = searchInput.value.toLowerCase();

        if (searchTerm.length < 1) {
            this.hideCustomerDropdown();
            return;
        }

        const matchingCustomers = this.currentCustomers.filter(customer => {
            if ((customer.status || customer.Status || 'active').toLowerCase() !== 'active') {
                return false; // Don't show inactive customers
            }

            const name = (customer.name || customer.Name || '').toLowerCase();
            const email = (customer.email || customer.Email || '').toLowerCase();
            const phone = (customer.phone || customer.Phone || '').toLowerCase();
            const id = (customer.id || customer.CustomerID || '').toString().toLowerCase();

            return name.includes(searchTerm) ||
                email.includes(searchTerm) ||
                phone.includes(searchTerm) ||
                id.includes(searchTerm);
        });

        this.displayCustomerDropdown(matchingCustomers);
    }

    static displayCustomerDropdown(customers) {
        const dropdown = document.getElementById('customerDropdown');
        const dropdownList = document.getElementById('customerDropdownList');

        if (!dropdown || !dropdownList) return;

        if (customers.length === 0) {
            dropdownList.innerHTML = '<div class="dropdown-item no-results">No customers found</div>';
        } else {
            dropdownList.innerHTML = customers.slice(0, 10).map(customer => `
                <div class="dropdown-item" onclick="selectCustomerForSubscription('${customer.id || customer.CustomerID}')">
                    <div class="customer-dropdown-item">
                        <div class="customer-main-info">
                            <strong>${customer.name || customer.Name}</strong>
                            <span class="customer-id">ID: ${customer.id || customer.CustomerID}</span>
                        </div>
                        <div class="customer-sub-info">
                            📧 ${customer.email || customer.Email}
                            ${(customer.phone || customer.Phone) ? ` • 📱 ${customer.phone || customer.Phone}` : ''}
                        </div>
                        ${(customer.address || customer.Address) ?
                    `<div class="customer-address">🏠 ${customer.address || customer.Address}</div>` : ''
                }
                    </div>
                </div>
            `).join('');
        }

        dropdown.style.display = 'block';
    }

    static selectCustomerForSubscription(customerId) {
        const customer = this.currentCustomers.find(c => (c.id || c.CustomerID) === customerId);

        if (customer) {
            const searchInput = document.getElementById('customerSearchInput');
            const hiddenInput = document.getElementById('selectedCustomerID');

            searchInput.value = `${customer.name || customer.Name} (${customer.email || customer.Email})`;
            hiddenInput.value = customerId;

            console.log(`✅ Customer selected for subscription: ${customerId}`);
            this.hideCustomerDropdown();
        }
    }

    static showCustomerDropdown() {
        const searchInput = document.getElementById('customerSearchInput');
        if (searchInput.value.length >= 1) {
            this.searchCustomersForSubscription();
        }
    }

    static hideCustomerDropdown() {
        const dropdown = document.getElementById('customerDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }

    // Force reload vendor services
    static async reloadVendorServices() {
        console.log('🔄 Reloading vendor services...');
        await this.loadVendorServices();
        Alerts.showSuccess('Services Reloaded', 'Vendor services have been refreshed');
    }

    static async editCustomerById(customerId) {
        try {
            // Switch to edit customer tab
            Tabs.showCustomerTab('edit-customer');

            // Wait a moment for tab to load
            setTimeout(() => {
                const editSelect = document.getElementById('editCustomerSelect');
                if (editSelect) {
                    editSelect.value = customerId;
                    this.loadCustomerForEdit();
                }
            }, 100);
        } catch (error) {
            console.error('❌ Error editing customer:', error);
        }
    }

    static async viewCustomerTransactionsById(customerId) {
        try {
            console.log(`📄 Loading customer transactions for: ${customerId}`);
            const data = await CustomersAPI.loadTransactions(customerId);
            ReceiptUI.renderCustomerReceipt(data); // This will show modal with print button
        } catch (error) {
            console.error('❌ Error viewing customer transactions:', error);
            Alerts.showError('Error', 'Failed to load customer transactions');
        }
    }

    static async printCustomerReceiptById(customerId) {
        try {
            console.log(`🖨️ Printing customer receipt for: ${customerId}`);
            await PrintManager.printCustomerReceipt(customerId);
        } catch (error) {
            console.error('❌ Error printing customer receipt:', error);
            Alerts.showError('Print Error', 'Failed to print customer receipt');
        }
    }

    static async addSubscriptionForCustomer(customerId) {
        try {
            console.log(`🔄 Redirecting to POS for customer: ${customerId}`);
            
            // Switch to POS tab and wait for it to initialize
            if (window.Tabs) {
                await Tabs.showTab('pos');
            } else {
                showTab('pos');
                // Fallback delay if Tabs class isn't directly accessible (shouldn't happen)
                await new Promise(r => setTimeout(r, 500));
            }

            // Now that POS init (and its resetForm) is done, select the customer
            if (window.POSUI) {
                // We don't need to reset here because POSUI.init() already did it
                await POSUI.selectCustomer(customerId);
                console.log(`✅ Customer ${customerId} selected in POS`);
                Alerts.showInfo('Customer Selected', 'You are now in POS mode for this customer.');
            }
        } catch (error) {
            console.error('❌ Error adding subscription for customer:', error);
        }
    }

    static loadCustomerForEdit() {
        const customerId = document.getElementById('editCustomerSelect')?.value;
        if (!customerId) {
            document.getElementById('editCustomerForm').style.display = 'none';
            document.getElementById('customerTransactionHistory').style.display = 'none';
            return;
        }

        const customer = CustomersAPI.getById(customerId);
        if (!customer) {
            Alerts.showError('Error', 'Customer not found');
            return;
        }

        // Populate form
        document.getElementById('editCustomerId').value = customer.id || customer.CustomerID;
        document.getElementById('editCustomerName').value = customer.name || customer.Name;
        document.getElementById('editCustomerEmail').value = customer.email || customer.Email;
        document.getElementById('editCustomerPhone').value = customer.phone || customer.Phone || '';
        document.getElementById('editCustomerAddress').value = customer.address || customer.Address || '';
        document.getElementById('editCustomerStatus').value = customer.status || customer.Status || 'active';

        // Show form
        document.getElementById('editCustomerForm').style.display = 'block';
    }

    static async viewCustomerTransactions() {
        const customerId = document.getElementById('editCustomerId')?.value;
        if (!customerId) return;

        try {
            const data = await CustomersAPI.loadTransactions(customerId);
            const container = document.getElementById('editCustomerTransactions');
            ReceiptUI.renderCustomerReceipt(data, container);
            document.getElementById('customerTransactionHistory').style.display = 'block';
        } catch (error) {
            console.error('❌ Error loading customer transactions:', error);
        }
    }

    static cancelEdit() {
        document.getElementById('editCustomerForm').style.display = 'none';
        document.getElementById('customerTransactionHistory').style.display = 'none';
        document.getElementById('editCustomerSelect').value = '';
    }

    static async deleteCustomer() {
        const customerId = document.getElementById('editCustomerId')?.value;
        const customerName = document.getElementById('editCustomerName')?.value;

        if (!customerId) return;

        // Confirm deletion
        const confirmed = confirm(
            `⚠️ Are you sure you want to delete "${customerName}"?\n\n` +
            `This will mark the customer as inactive but preserve all historical data.\n` +
            `The customer will no longer appear in active lists but subscriptions and transactions will remain.`
        );

        if (!confirmed) return;

        try {
            console.log(`🗑️ Marking customer as inactive: ${customerId}`);

            // Update customer status to inactive
            await CustomersAPI.updateCustomerStatus(customerId, 'inactive');

            Alerts.showSuccess('Customer Deleted', `${customerName} has been marked as inactive`);

            // Refresh customer list and close edit form
            await this.loadAndDisplayCustomers();
            this.cancelEdit();

            // Switch back to customer list
            Tabs.showCustomerTab('customer-list');

        } catch (error) {
            console.error('❌ Error deleting customer:', error);
            Alerts.showError('Delete Error', 'Failed to delete customer');
        }
    }

    static async reactivateCustomer(customerId) {
        if (!customerId) return;

        if (!confirm('Are you sure you want to reactivate this customer?')) return;

        try {
            console.log(`🔄 Reactivating customer: ${customerId}`);
            await CustomersAPI.updateCustomerStatus(customerId, 'active');
            Alerts.showSuccess('Customer Activated', 'Customer is now active');
            await this.loadAndDisplayCustomers();
        } catch (error) {
            console.error('❌ Error activating customer:', error);
            Alerts.showError('Activation Error', 'Failed to activate customer');
        }
    }

    static addPrintButtons() {
        // Add print button to customer list
        setTimeout(() => {
            PrintManager.addPrintButtonToContainer('customer-list', 'Customer Directory');
        }, 500);
    }

    // Debug method to check dropdown status
    static debugVendorServices() {
        console.log('🔍 Debugging vendor services dropdown:');
        console.log('- Vendor services loaded:', this.vendorServices.length);
        console.log('- Services:', this.vendorServices);
        console.log('- Dropdown element:', document.getElementById('vendorServiceSelectSub'));

        const dropdown = document.getElementById('vendorServiceSelectSub');
        if (dropdown) {
            console.log('- Dropdown options:', dropdown.options.length);
            console.log('- Dropdown HTML:', dropdown.innerHTML);
            
            // Check if services have vendor info
            Array.from(dropdown.options).forEach((option, index) => {
                if (index > 0) { // Skip the first "Choose a service..." option
                    console.log(`- Option ${index}: ${option.textContent}`);
                    console.log(`  - Value: ${option.value}`);
                    console.log(`  - VendorId: ${option.dataset.vendorId}`);
                    console.log(`  - VendorName: ${option.dataset.vendorName}`);
                }
            });
        }
        
        // Debug vendor and service data in Store
        console.log('- Vendors in store:', Store.getVendors().length);
        console.log('- Services in store:', Store.getVendorServices().length);
    }
}

// Make available globally
window.CustomersUI = CustomersUI;

// Global functions for HTML onclick handlers
function showCustomerTab(tab) {
    Tabs.showCustomerTab(tab);
}

function filterCustomers() {
    CustomersUI.filterCustomers();
}

function clearCustomerSearch() {
    CustomersUI.clearCustomerSearch();
}

function searchCustomersForSubscription() {
    CustomersUI.searchCustomersForSubscription();
}

function selectCustomerForSubscription(customerId) {
    CustomersUI.selectCustomerForSubscription(customerId);
}

function showCustomerDropdown() {
    CustomersUI.showCustomerDropdown();
}

function loadCustomerForEdit() {
    CustomersUI.loadCustomerForEdit();
}

function viewCustomerTransactions() {
    CustomersUI.viewCustomerTransactions();
}

function cancelEdit() {
    CustomersUI.cancelEdit();
}

function deleteCustomer() {
    CustomersUI.deleteCustomer();
}

function editCustomerById(customerId) {
    CustomersUI.editCustomerById(customerId);
}

function viewCustomerTransactionsById(customerId) {
    CustomersUI.viewCustomerTransactionsById(customerId);
}

function printCustomerReceiptById(customerId) {
    CustomersUI.printCustomerReceiptById(customerId);
}

function addSubscriptionForCustomer(customerId) {
    CustomersUI.addSubscriptionForCustomer(customerId);
}

function reactivateCustomer(customerId) {
    CustomersUI.reactivateCustomer(customerId);
}

function calculateExpirationDateSub() {
    const startDateInput = document.querySelector('#add-subscription input[name="startDate"]');
    const creditsInput = document.querySelector('#add-subscription input[name="creditsSelected"]');
    const expirationInput = document.querySelector('#add-subscription input[name="expirationDate"]');

    if (startDateInput?.value && creditsInput?.value) {
        const expirationDate = SubscriptionsAPI.calculateExpirationDate(
            startDateInput.value,
            creditsInput.value
        );

        if (expirationInput && expirationDate) {
            expirationInput.value = expirationDate;
        }
    }
}

// Debug function
function debugVendorServices() {
    CustomersUI.debugVendorServices();
}

// Reload vendor services function
function reloadVendorServices() {
    CustomersUI.reloadVendorServices();
}

// Hide dropdown when clicking outside
document.addEventListener('click', function (event) {
    const dropdown = document.getElementById('customerDropdown');
    const searchInput = document.getElementById('customerSearchInput');

    if (dropdown && searchInput) {
        if (!dropdown.contains(event.target) && !searchInput.contains(event.target)) {
            CustomersUI.hideCustomerDropdown();
        }
    }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    // Initialize with delay to ensure all elements are loaded
    setTimeout(() => {
        if (window.CustomersUI) {
            CustomersUI.initialize();
        }
    }, 1000);
});