class EditCustomerWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.customers = [];
        this.selectedCustomer = null;
        this.customerTransactions = null;
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showTransactions: true,
            showDeleteButton: true,
            showStatusToggle: true,
            validateOnSubmit: true
        };
    }

    async loadData() {
        try {
            this.log('Loading customers for editing...');
            const response = await fetch('/api/customers');
            if (!response.ok) throw new Error('Failed to fetch customers');

            this.customers = await response.json();
            this.log(`Loaded ${this.customers.length} customers`);
        } catch (error) {
            this.handleError('Failed to load customers', error);
        }
    }

    async getTemplate() {
        return `
            <div class="customer-tab-content">
                <h3>✏️ Edit Customer</h3>
                
                <div class="customer-selector">
                    <div class="form-group">
                        <label>👤 Select Customer to Edit:</label>
                        <select class="edit-customer-select">
                            <option value="">Choose a customer to edit...</option>
                            ${this.getCustomerOptions()}
                        </select>
                    </div>
                </div>

                <div class="edit-customer-form-container" style="display: none;">
                    ${this.getEditFormTemplate()}
                </div>

                ${this.options.showTransactions ? `
                    <div class="customer-transaction-history" style="display: none;">
                        <h4>📄 Transaction History</h4>
                        <div class="transaction-summary"></div>
                        <div class="transactions-container"></div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getCustomerOptions() {
        // Only show active customers in dropdown
        const activeCustomers = this.customers.filter(c =>
            (c.status || 'active').toLowerCase() === 'active'
        );

        return activeCustomers.map(customer => `
            <option value="${customer.id}">
                ${this.escapeHtml(customer.name)} - ${customer.email}
            </option>
        `).join('');
    }

    getEditFormTemplate() {
        return `
            <form class="edit-customer-form">
                <input type="hidden" name="customerId" class="customer-id-field">

                <div class="form-row">
                    <div class="form-group">
                        <label>👤 Customer Name:</label>
                        <input type="text" name="name" class="customer-name-field" 
                               required maxlength="100">
                    </div>
                    <div class="form-group">
                        <label>📧 Email Address:</label>
                        <input type="email" name="email" class="customer-email-field" 
                               required maxlength="100">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>📱 Phone Number:</label>
                        <input type="tel" name="phone" class="customer-phone-field" 
                               maxlength="20">
                    </div>
                    ${this.options.showStatusToggle ? `
                        <div class="form-group">
                            <label>📊 Status:</label>
                            <select name="status" class="customer-status-field">
                                <option value="active">✅ Active</option>
                                <option value="inactive">❌ Inactive</option>
                            </select>
                        </div>
                    ` : ''}
                </div>

                <div class="form-group">
                    <label>🏠 Address:</label>
                    <textarea name="address" class="customer-address-field" 
                              rows="3" maxlength="200"></textarea>
                </div>

                <div class="customer-metadata">
                    <div class="metadata-item">
                        <strong>🆔 Customer ID:</strong> 
                        <span class="customer-id-display"></span>
                    </div>
                    <div class="metadata-item">
                        <strong>📅 Date Added:</strong> 
                        <span class="customer-created-display"></span>
                    </div>
                    <div class="metadata-item">
                        <strong>📊 Total Subscriptions:</strong> 
                        <span class="customer-subscriptions-display">0</span>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="submit" class="btn-primary update-btn">Update Customer</button>
                    <button type="button" class="btn-secondary cancel-btn">Cancel</button>
                    <button type="button" class="btn-info view-transactions-btn">📄 View Transactions</button>
                    <button type="button" class="btn-success duplicate-btn">📋 Duplicate Customer</button>
                    ${this.options.showDeleteButton ? `
                        <button type="button" class="btn-danger delete-btn">🗑️ Delete Customer</button>
                    ` : ''}
                </div>
            </form>
        `;
    }

    bindEvents() {
        // Customer selection
        const customerSelect = this.$('.edit-customer-select');
        if (customerSelect) {
            this.addEventListener(customerSelect, 'change', (e) => {
                this.loadCustomerForEdit(e.target.value);
            });
        }

        // Form submission
        const form = this.$('.edit-customer-form');
        if (form) {
            this.addEventListener(form, 'submit', (e) => this.handleUpdate(e));
        }

        // Action buttons
        this.bindActionButtons();

        // Real-time validation
        if (this.options.validateOnSubmit) {
            this.bindValidation();
        }
    }

    bindActionButtons() {
        // Cancel button
        const cancelBtn = this.$('.cancel-btn');
        if (cancelBtn) {
            this.addEventListener(cancelBtn, 'click', () => this.cancelEdit());
        }

        // View transactions button
        const viewTransactionsBtn = this.$('.view-transactions-btn');
        if (viewTransactionsBtn) {
            this.addEventListener(viewTransactionsBtn, 'click', () => this.loadTransactions());
        }

        // Duplicate button
        const duplicateBtn = this.$('.duplicate-btn');
        if (duplicateBtn) {
            this.addEventListener(duplicateBtn, 'click', () => this.duplicateCustomer());
        }

        // Delete button
        const deleteBtn = this.$('.delete-btn');
        if (deleteBtn) {
            this.addEventListener(deleteBtn, 'click', () => this.deleteCustomer());
        }
    }

    bindValidation() {
        const inputs = this.$$('input[required], input[type="email"]');
        inputs.forEach(input => {
            this.addEventListener(input, 'blur', (e) => this.validateField(e.target));
        });
    }

    async loadCustomerForEdit(customerId) {
        if (!customerId) {
            this.hideEditForm();
            return;
        }

        try {
            this.showLoading();

            // Find customer in loaded data
            const customer = this.customers.find(c => c.id === customerId);
            if (!customer) {
                throw new Error('Customer not found');
            }

            // Load fresh customer data from API
            const response = await fetch(`/api/customers/${customerId}`);
            if (!response.ok) throw new Error('Failed to load customer');

            this.selectedCustomer = await response.json();

            // Populate form
            this.populateForm(this.selectedCustomer);

            // Load subscription count
            await this.loadSubscriptionCount(customerId);

            this.showEditForm();

        } catch (error) {
            this.handleError('Failed to load customer for editing', error);
        } finally {
            this.hideLoading();
        }
    }

    async loadSubscriptionCount(customerId) {
        try {
            const response = await fetch(`/api/subscriptions?customer_id=${customerId}`);
            if (response.ok) {
                const subscriptions = await response.json();
                const countDisplay = this.$('.customer-subscriptions-display');
                if (countDisplay) {
                    countDisplay.textContent = subscriptions.length;
                }
            }
        } catch (error) {
            console.error('Failed to load subscription count:', error);
        }
    }

    populateForm(customer) {
        // Populate form fields
        this.$('.customer-id-field').value = customer.id;
        this.$('.customer-name-field').value = customer.name || '';
        this.$('.customer-email-field').value = customer.email || '';
        this.$('.customer-phone-field').value = customer.phone || '';
        this.$('.customer-address-field').value = customer.address || '';

        if (this.options.showStatusToggle) {
            this.$('.customer-status-field').value = customer.status || 'active';
        }

        // Populate metadata displays
        this.$('.customer-id-display').textContent = customer.id;
        this.$('.customer-created-display').textContent = this.formatDate(customer.created_date);
    }

    showEditForm() {
        const container = this.$('.edit-customer-form-container');
        if (container) {
            container.style.display = 'block';
        }
    }

    hideEditForm() {
        const container = this.$('.edit-customer-form-container');
        if (container) {
            container.style.display = 'none';
        }
        this.selectedCustomer = null;
        this.hideTransactionHistory();
    }

    async handleUpdate(event) {
        event.preventDefault();

        const updateBtn = this.$('.update-btn');
        const originalText = updateBtn.textContent;

        try {
            updateBtn.textContent = '⏳ Updating...';
            updateBtn.disabled = true;

            // Validate form
            if (!this.validateForm()) {
                throw new Error('Please fix validation errors');
            }

            const formData = this.getFormData();
            const customerId = this.selectedCustomer.id;

            // Submit to API
            const response = await fetch(`/api/customers/${customerId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update customer');
            }

            // Update local data
            this.selectedCustomer = result.customer;

            // Refresh customers list
            await this.loadData();
            this.render();

            // Reload the same customer
            await this.loadCustomerForEdit(customerId);

            this.showSuccessMessage('Customer updated successfully!');
            this.emit('customerUpdated', { customer: result.customer });

        } catch (error) {
            console.error('❌ Error updating customer:', error);
            this.showErrorMessage(error.message);
        } finally {
            updateBtn.textContent = originalText;
            updateBtn.disabled = false;
        }
    }

    validateForm() {
        let isValid = true;
        const errors = [];

        // Name validation
        const nameField = this.$('.customer-name-field');
        if (!nameField.value.trim()) {
            errors.push('Customer name is required');
            this.markFieldError(nameField);
            isValid = false;
        } else {
            this.clearFieldError(nameField);
        }

        // Email validation
        const emailField = this.$('.customer-email-field');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailField.value.trim()) {
            errors.push('Email is required');
            this.markFieldError(emailField);
            isValid = false;
        } else if (!emailRegex.test(emailField.value)) {
            errors.push('Please enter a valid email address');
            this.markFieldError(emailField);
            isValid = false;
        } else {
            this.clearFieldError(emailField);
        }

        if (errors.length > 0) {
            this.showErrorMessage(errors.join('\n'));
        }

        return isValid;
    }

    validateField(field) {
        let isValid = true;
        let errorMessage = '';

        switch (field.name) {
            case 'name':
                if (!field.value.trim()) {
                    isValid = false;
                    errorMessage = 'Customer name is required';
                }
                break;
            case 'email':
                if (!field.value.trim()) {
                    isValid = false;
                    errorMessage = 'Email is required';
                } else {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(field.value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid email address';
                    }
                }
                break;
        }

        if (isValid) {
            this.clearFieldError(field);
        } else {
            this.markFieldError(field, errorMessage);
        }

        return isValid;
    }

    markFieldError(field, message = '') {
        field.classList.add('error');

        // Show error message
        let errorEl = field.parentNode.querySelector('.field-error');
        if (message && !errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'field-error';
            field.parentNode.appendChild(errorEl);
        }
        if (errorEl) {
            errorEl.textContent = message;
        }
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const errorEl = field.parentNode.querySelector('.field-error');
        if (errorEl) {
            errorEl.remove();
        }
    }

    getFormData() {
        return {
            name: this.$('.customer-name-field').value.trim(),
            email: this.$('.customer-email-field').value.trim(),
            phone: this.$('.customer-phone-field').value.trim(),
            address: this.$('.customer-address-field').value.trim(),
            status: this.$('.customer-status-field')?.value || 'active'
        };
    }

    cancelEdit() {
        const select = this.$('.edit-customer-select');
        if (select) {
            select.value = '';
        }
        this.hideEditForm();
    }

    async loadTransactions() {
        if (!this.selectedCustomer) return;

        try {
            this.showLoading();

            const response = await fetch(`/api/customers/${this.selectedCustomer.id}/transactions`);
            if (!response.ok) throw new Error('Failed to load transactions');

            this.customerTransactions = await response.json();
            this.displayTransactionHistory();

        } catch (error) {
            this.handleError('Failed to load customer transactions', error);
        } finally {
            this.hideLoading();
        }
    }

    displayTransactionHistory() {
        const container = this.$('.customer-transaction-history');
        const summaryDiv = this.$('.transaction-summary');
        const transactionsDiv = this.$('.transactions-container');

        if (!container || !this.customerTransactions) return;

        // Show summary
        if (summaryDiv) {
            summaryDiv.innerHTML = `
                <div class="transaction-summary-cards">
                    <div class="summary-card">
                        <div class="summary-number">${this.customerTransactions.summary.totalTransactions}</div>
                        <div class="summary-label">Total Subscriptions</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-number">${this.formatCurrency(this.customerTransactions.summary.totalPaid)}</div>
                        <div class="summary-label">Total Paid</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-number">${this.customerTransactions.summary.totalMonths}</div>
                        <div class="summary-label">Total Months</div>
                    </div>
                </div>
            `;
        }

        // Show transactions grouped by classification
        if (transactionsDiv) {
            const groupedTransactions = this.customerTransactions.groupedSubscriptions;

            transactionsDiv.innerHTML = Object.entries(groupedTransactions).map(([classification, transactions]) => `
                <div class="classification-group">
                    <h5>${classification}</h5>
                    <div class="transactions-list">
                        ${transactions.map(transaction => `
                            <div class="transaction-item">
                                <div class="transaction-header">
                                    <strong>${transaction.service_name}</strong>
                                    <span class="transaction-amount">${this.formatCurrency(transaction.amount_paid)}</span>
                                </div>
                                <div class="transaction-details">
                                    <div class="detail-row">
                                        <strong>Period:</strong> ${this.formatDate(transaction.start_date)} - ${this.formatDate(transaction.expiration_date)}
                                    </div>
                                    <div class="detail-row">
                                        <strong>Credits:</strong> ${transaction.credits_used} months
                                    </div>
                                    ${transaction.mac_address ? `
                                        <div class="detail-row">
                                            <strong>MAC Address:</strong> ${transaction.mac_address}
                                        </div>
                                    ` : ''}
                                    <div class="detail-row">
                                        <strong>Status:</strong> 
                                        <span class="status ${transaction.status}">${transaction.status}</span>
                                    </div>
                                    ${transaction.notes ? `
                                        <div class="detail-row">
                                            <strong>Notes:</strong> ${transaction.notes}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }

        container.style.display = 'block';
    }

    hideTransactionHistory() {
        const container = this.$('.customer-transaction-history');
        if (container) {
            container.style.display = 'none';
        }
    }

    duplicateCustomer() {
        if (!this.selectedCustomer) return;

        // Emit event to create new customer with similar data
        const customerData = {
            name: `${this.selectedCustomer.name} (Copy)`,
            email: '', // Clear email as it must be unique
            phone: this.selectedCustomer.phone,
            address: this.selectedCustomer.address
        };

        this.emit('duplicateCustomerRequested', { customerData });
        console.log('Duplicate customer requested:', customerData);
    }

    deleteCustomer() {
        if (!this.selectedCustomer) return;

        const modal = WidgetManager.getWidget('confirmation-modal');
        if (modal) {
            modal.confirmDelete(this.selectedCustomer.name, async () => {
                try {
                    const response = await fetch(`/api/customers/${this.selectedCustomer.id}`, {
                        method: 'DELETE'
                    });

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(result.error || 'Failed to delete customer');
                    }

                    // Refresh customers list
                    await this.loadData();
                    this.render();

                    this.showSuccessMessage('Customer deleted successfully');
                    this.emit('customerDeleted', { customerId: this.selectedCustomer.id });

                } catch (error) {
                    this.showErrorMessage(error.message);
                }
            });
        }
    }

    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }

    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type) {
        // Remove existing messages
        this.$$('.form-message').forEach(el => el.remove());

        const messageEl = document.createElement('div');
        messageEl.className = `form-message ${type}`;
        messageEl.textContent = message;

        const form = this.$('.edit-customer-form');
        if (form) {
            form.insertBefore(messageEl, form.firstChild);

            // Auto-hide after 5 seconds
            setTimeout(() => {
                messageEl.remove();
            }, 5000);
        }
    }

    // Public API
    async refresh() {
        await this.loadData();
        this.render();
    }

    loadCustomer(customerId) {
        const select = this.$('.edit-customer-select');
        if (select) {
            select.value = customerId;
            this.loadCustomerForEdit(customerId);
        }
    }

    getSelectedCustomer() {
        return this.selectedCustomer;
    }
}

window.EditCustomerWidget = EditCustomerWidget;
