class AddSubscriptionWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.selectedCustomer = null;
        this.vendorServices = [];
        this.preloadCustomerId = options.preloadCustomerId;
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            preloadCustomerId: null,
            resetOnSuccess: true,
            validateOnSubmit: true,
            showMacAddressField: true,
            autoCalculateExpiration: true
        };
    }

    async loadData() {
        try {
            this.log('Loading vendor services...');
            const response = await fetch('/api/vendor-services');
            if (!response.ok) throw new Error('Failed to fetch vendor services');

            this.vendorServices = await response.json();

            // If preload customer ID is provided, load customer data
            if (this.preloadCustomerId) {
                await this.loadCustomerData(this.preloadCustomerId);
            }

            this.log(`Loaded ${this.vendorServices.length} vendor services`);
        } catch (error) {
            this.handleError('Failed to load subscription data', error);
        }
    }

    async loadCustomerData(customerId) {
        try {
            const response = await fetch(`/api/customers/${customerId}`);
            if (!response.ok) throw new Error('Failed to fetch customer');

            this.selectedCustomer = await response.json();
            this.log('Customer preloaded:', this.selectedCustomer.name);
        } catch (error) {
            console.error('Failed to preload customer:', error);
        }
    }

    async getTemplate() {
        const today = new Date().toISOString().split('T')[0];

        return `
            <div class="customer-tab-content">
                <h3>📝 Add New Subscription</h3>
                <form class="add-subscription-form">
                    ${this.getCustomerSelectTemplate()}
                    ${this.getServiceFieldsTemplate()}
                    ${this.getDateFieldsTemplate(today)}
                    ${this.getPaymentFieldsTemplate()}
                    ${this.getNotesFieldTemplate()}
                    ${this.getFormActionsTemplate()}
                </form>
            </div>
        `;
    }

    getCustomerSelectTemplate() {
        return `
            <div class="form-group">
                <label>👤 Select Customer:</label>
                <div class="customer-search-dropdown">
                    <input type="text" 
                           class="customer-search-input" 
                           placeholder="🔍 Type to search customers by name, email, phone, ID..."
                           value="${this.selectedCustomer ? this.getCustomerDisplayName(this.selectedCustomer) : ''}"
                           ${this.selectedCustomer ? 'readonly' : ''}>
                    <input type="hidden" name="customerID" class="selected-customer-id" 
                           value="${this.preloadCustomerId || ''}">
                    <div class="customer-dropdown search-dropdown" style="display: none;">
                        <div class="customer-dropdown-list"></div>
                    </div>
                    ${this.selectedCustomer ? `
                        <div class="selected-customer-info">
                            <strong>Selected:</strong> ${this.escapeHtml(this.selectedCustomer.name)} 
                            (${this.selectedCustomer.email})
                            <button type="button" class="btn-small change-customer-btn">Change</button>
                        </div>
                    ` : ''}
                </div>
                <small>Or <a href="#" class="add-customer-link">add a new customer first</a></small>
            </div>
        `;
    }

    getServiceFieldsTemplate() {
        return `
            <div class="form-group">
                <label>🔧 Service Name:</label>
                <input type="text" name="serviceName" value="IT App Services" readonly>
                <small>Service name is always "IT App Services"</small>
            </div>

            <div class="form-group">
                <label>📍 Classification (Room/Location):</label>
                <input type="text" name="classification" 
                       placeholder="living room, bedroom, office, etc." 
                       maxlength="50">
                <small>Specify room, location, or area for this service</small>
            </div>

            ${this.options.showMacAddressField ? `
                <div class="form-group">
                    <label>🖥️ Device MAC Address:</label>
                    <input type="text" name="macAddress"
                           placeholder="00:1A:2B:3C:4D:5E (optional)"
                           pattern="^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^$"
                           maxlength="17"
                           title="Format: XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX">
                    <small>MAC address of the TV/device (optional) - helps identify specific device</small>
                    <div class="mac-validation-feedback" style="display: none;"></div>
                </div>
            ` : ''}

            <div class="form-group">
                <label>🔧 Vendor Service:</label>
                <select name="vendorServiceName" class="vendor-service-select" required>
                    <option value="">Choose a service...</option>
                    ${this.getVendorServiceOptions()}
                </select>
                <small>Select the service you're providing to the customer</small>
                <div class="service-info" style="display: none;">
                    <div class="available-credits"></div>
                </div>
            </div>
        `;
    }

    getDateFieldsTemplate(today) {
        return `
            <div class="form-group">
                <label>📅 Start Date:</label>
                <input type="date" name="startDate" value="${today}" required>
            </div>

            <div class="form-group">
                <label>📊 Credits to Use:</label>
                <input type="number" name="creditsSelected" min="1" max="60" required 
                       class="credits-input">
                <small>Each credit = 1 month of service</small>
                <div class="credits-validation" style="display: none;"></div>
            </div>

            <div class="form-group">
                <label>⏰ Expiration Date:</label>
                <input type="date" name="expirationDate" readonly>
                <small>Automatically calculated based on start date and credits</small>
            </div>
        `;
    }

    getPaymentFieldsTemplate() {
        return `
            <div class="form-group">
                <label>💰 Amount Paid ($):</label>
                <input type="number" name="amountPaid" step="0.01" min="0" required>
                <div class="payment-suggestions" style="display: none;">
                    <small>Suggested amounts:</small>
                    <div class="suggestion-buttons"></div>
                </div>
            </div>

            <div class="form-group">
                <label>📊 Status:</label>
                <select name="status">
                    <option value="active">✅ Active</option>
                    <option value="expired">❌ Expired</option>
                    <option value="cancelled">🚫 Cancelled</option>
                </select>
            </div>
        `;
    }

    getNotesFieldTemplate() {
        return `
            <div class="form-group">
                <label>📝 Notes:</label>
                <textarea name="notes" rows="3" maxlength="500" 
                          placeholder="Optional notes about this subscription"></textarea>
                <div class="character-count">0/500 characters</div>
            </div>
        `;
    }

    getFormActionsTemplate() {
        return `
            <div class="form-actions">
                <button type="submit" class="btn-primary submit-btn">
                    Add Subscription & Use Credits
                </button>
                <button type="button" class="btn-secondary reset-btn">Reset Form</button>
                <button type="button" class="btn-info preview-btn">Preview Subscription</button>
                <button type="button" class="btn-secondary debug-btn">🔍 Debug Form</button>
            </div>
        `;
    }

    getVendorServiceOptions() {
        return this.vendorServices.map(service => `
            <option value="${service.service_name}" 
                    data-vendor-id="${service.vendor_id}" 
                    data-vendor-name="${service.vendor_name || ''}">
                ${service.vendor_name} - ${service.service_name}
            </option>
        `).join('');
    }

    bindEvents() {
        const form = this.$('.add-subscription-form');
        if (form) {
            this.addEventListener(form, 'submit', (e) => this.handleSubmit(e));
        }

        // Customer search functionality
        this.bindCustomerSearch();

        // Service selection
        this.bindServiceSelection();

        // Date and credit calculations
        this.bindDateCalculations();

        // Form controls
        this.bindFormControls();

        // Real-time validation
        this.bindValidation();
    }

    bindCustomerSearch() {
        const searchInput = this.$('.customer-search-input');
        const dropdown = this.$('.customer-dropdown');

        if (searchInput && !this.selectedCustomer) {
            this.addEventListener(searchInput, 'input',
                this.debounce((e) => this.searchCustomers(e.target.value), 300)
            );
            this.addEventListener(searchInput, 'focus', () => this.showCustomerDropdown());
        }

        // Change customer button
        const changeBtn = this.$('.change-customer-btn');
        if (changeBtn) {
            this.addEventListener(changeBtn, 'click', () => this.clearSelectedCustomer());
        }

        // Add customer link
        const addCustomerLink = this.$('.add-customer-link');
        if (addCustomerLink) {
            this.addEventListener(addCustomerLink, 'click', (e) => {
                e.preventDefault();
                this.emit('addCustomerRequested');
            });
        }

        // Click outside to hide dropdown
        this.addEventListener(document, 'click', (e) => {
            if (!this.container.contains(e.target)) {
                this.hideCustomerDropdown();
            }
        });
    }

    bindServiceSelection() {
        const serviceSelect = this.$('.vendor-service-select');
        if (serviceSelect) {
            this.addEventListener(serviceSelect, 'change', (e) => {
                this.handleServiceChange(e.target);
            });
        }
    }

    bindDateCalculations() {
        const startDateInput = this.$('input[name="startDate"]');
        const creditsInput = this.$('.credits-input');

        if (startDateInput && creditsInput) {
            this.addEventListener(startDateInput, 'change', () => this.calculateExpiration());
            this.addEventListener(creditsInput, 'input', () => {
                this.calculateExpiration();
                this.validateCredits();
            });
        }
    }

    bindFormControls() {
        // Reset button
        const resetBtn = this.$('.reset-btn');
        if (resetBtn) {
            this.addEventListener(resetBtn, 'click', () => this.resetForm());
        }

        // Preview button
        const previewBtn = this.$('.preview-btn');
        if (previewBtn) {
            this.addEventListener(previewBtn, 'click', () => this.showPreview());
        }

        // Debug button
        const debugBtn = this.$('.debug-btn');
        if (debugBtn) {
            this.addEventListener(debugBtn, 'click', () => this.debugForm());
        }
    }

    bindValidation() {
        // MAC address validation
        const macInput = this.$('input[name="macAddress"]');
        if (macInput) {
            this.addEventListener(macInput, 'input', (e) => this.validateMacAddress(e.target));
        }

        // Notes character counter
        const notesInput = this.$('textarea[name="notes"]');
        const charCount = this.$('.character-count');
        if (notesInput && charCount) {
            this.addEventListener(notesInput, 'input', (e) => {
                const length = e.target.value.length;
                charCount.textContent = `${length}/500 characters`;
                charCount.style.color = length > 450 ? '#e53e3e' : '#718096';
            });
        }

        // Amount paid suggestions
        const amountInput = this.$('input[name="amountPaid"]');
        if (amountInput) {
            this.addEventListener(amountInput, 'focus', () => this.showPaymentSuggestions());
        }
    }

    async searchCustomers(query) {
        if (query.length < 2) {
            this.hideCustomerDropdown();
            return;
        }

        try {
            const response = await fetch(`/api/customers?search=${encodeURIComponent(query)}&limit=10`);
            if (!response.ok) throw new Error('Search failed');

            const customers = await response.json();
            this.showCustomerResults(customers);
        } catch (error) {
            console.error('Customer search error:', error);
        }
    }

    showCustomerResults(customers) {
        const dropdown = this.$('.customer-dropdown-list');
        if (!dropdown) return;

        if (customers.length === 0) {
            dropdown.innerHTML = '<div class="no-results">No customers found</div>';
            this.showCustomerDropdown();
            return;
        }

        dropdown.innerHTML = customers.map(customer => `
            <div class="dropdown-item customer-item" data-customer-id="${customer.id}">
                <div class="customer-main-info">
                    <span class="customer-name">${this.escapeHtml(customer.name)}</span>
                    <span class="customer-id">${customer.id}</span>
                </div>
                <div class="customer-sub-info">
                    ${customer.email}
                    ${customer.phone ? ` • ${customer.phone}` : ''}
                </div>
                ${customer.address ? `
                    <div class="customer-address">${this.escapeHtml(customer.address)}</div>
                ` : ''}
            </div>
        `).join('');

        // Bind customer selection
        this.$$('.customer-item').forEach(item => {
            this.addEventListener(item, 'click', (e) => {
                const customerId = e.currentTarget.getAttribute('data-customer-id');
                const customer = customers.find(c => c.id === customerId);
                this.selectCustomer(customer);
            });
        });

        this.showCustomerDropdown();
    }

    selectCustomer(customer) {
        this.selectedCustomer = customer;

        // Update UI
        const searchInput = this.$('.customer-search-input');
        const hiddenInput = this.$('.selected-customer-id');

        if (searchInput) {
            searchInput.value = this.getCustomerDisplayName(customer);
            searchInput.setAttribute('readonly', 'true');
        }

        if (hiddenInput) {
            hiddenInput.value = customer.id;
        }

        this.hideCustomerDropdown();

        // Show selected customer info
        this.showSelectedCustomerInfo(customer);

        this.emit('customerSelected', { customer });
    }

    showSelectedCustomerInfo(customer) {
        const container = this.$('.customer-search-dropdown');
        if (!container) return;

        // Remove existing info
        const existingInfo = container.querySelector('.selected-customer-info');
        if (existingInfo) {
            existingInfo.remove();
        }

        // Add new info
        const infoDiv = document.createElement('div');
        infoDiv.className = 'selected-customer-info';
        infoDiv.innerHTML = `
            <strong>Selected:</strong> ${this.escapeHtml(customer.name)} (${customer.email})
            <button type="button" class="btn-small change-customer-btn">Change</button>
        `;

        container.appendChild(infoDiv);

        // Bind change button
        const changeBtn = infoDiv.querySelector('.change-customer-btn');
        this.addEventListener(changeBtn, 'click', () => this.clearSelectedCustomer());
    }

    clearSelectedCustomer() {
        this.selectedCustomer = null;

        const searchInput = this.$('.customer-search-input');
        const hiddenInput = this.$('.selected-customer-id');
        const infoDiv = this.$('.selected-customer-info');

        if (searchInput) {
            searchInput.value = '';
            searchInput.removeAttribute('readonly');
        }

        if (hiddenInput) {
            hiddenInput.value = '';
        }

        if (infoDiv) {
            infoDiv.remove();
        }
    }

    showCustomerDropdown() {
        const dropdown = this.$('.customer-dropdown');
        if (dropdown) {
            dropdown.style.display = 'block';
        }
    }

    hideCustomerDropdown() {
        const dropdown = this.$('.customer-dropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }

    handleServiceChange(select) {
        const selectedOption = select.options[select.selectedIndex];

        if (selectedOption && selectedOption.dataset.vendorId) {
            this.log('Vendor service selected:', {
                serviceName: selectedOption.value,
                vendorId: selectedOption.dataset.vendorId,
                vendorName: selectedOption.dataset.vendorName
            });

            this.showServiceInfo(selectedOption);
            this.checkCreditAvailability(selectedOption.dataset.vendorId, selectedOption.value);
        } else {
            this.hideServiceInfo();
        }
    }

    async checkCreditAvailability(vendorId, serviceName) {
        try {
            const response = await fetch('/api/credit-balances');
            if (!response.ok) throw new Error('Failed to check credit balances');

            const balances = await response.json();
            const balance = balances.find(b =>
                b.vendor_id === vendorId && b.service_name === serviceName
            );

            this.updateCreditInfo(balance);
        } catch (error) {
            console.error('Credit availability check failed:', error);
        }
    }

    updateCreditInfo(balance) {
        const infoDiv = this.$('.available-credits');
        if (!infoDiv) return;

        if (!balance) {
            infoDiv.innerHTML = `
                <div class="credit-warning">
                    ⚠️ No credit balance found for this service. 
                    <a href="#" onclick="WidgetManager.showTab('vendors')">Purchase credits first</a>
                </div>
            `;
        } else {
            const isLow = balance.remaining_credits < 10;
            infoDiv.innerHTML = `
                <div class="credit-info ${isLow ? 'low-credits' : ''}">
                    ${isLow ? '⚠️' : '✅'} Available Credits: ${balance.remaining_credits}
                    ${isLow ? ' (Low stock!)' : ''}
                </div>
            `;
        }
    }

    showServiceInfo(option) {
        const infoDiv = this.$('.service-info');
        if (infoDiv) {
            infoDiv.style.display = 'block';
        }
    }

    hideServiceInfo() {
        const infoDiv = this.$('.service-info');
        if (infoDiv) {
            infoDiv.style.display = 'none';
        }
    }

    calculateExpiration() {
        const startDateInput = this.$('input[name="startDate"]');
        const creditsInput = this.$('.credits-input');
        const expirationInput = this.$('input[name="expirationDate"]');

        if (startDateInput?.value && creditsInput?.value) {
            const startDate = new Date(startDateInput.value);
            const credits = parseInt(creditsInput.value);

            if (!isNaN(credits) && credits > 0) {
                const expirationDate = new Date(startDate);
                expirationDate.setMonth(expirationDate.getMonth() + credits);
                expirationDate.setDate(expirationDate.getDate() - 1);

                if (expirationInput) {
                    expirationInput.value = expirationDate.toISOString().split('T')[0];
                }
            }
        }
    }

    validateCredits() {
        const creditsInput = this.$('.credits-input');
        const validationDiv = this.$('.credits-validation');

        if (!creditsInput || !validationDiv) return;

        const credits = parseInt(creditsInput.value);
        let message = '';
        let isValid = true;

        if (isNaN(credits) || credits <= 0) {
            message = 'Credits must be a positive number';
            isValid = false;
        } else if (credits > 60) {
            message = 'Credits cannot exceed 60 months';
            isValid = false;
        }

        creditsInput.classList.toggle('error', !isValid);

        if (!isValid) {
            validationDiv.textContent = message;
            validationDiv.style.display = 'block';
            validationDiv.className = 'credits-validation error';
        } else {
            validationDiv.style.display = 'none';
        }

        return isValid;
    }

    validateMacAddress(input) {
        const validationDiv = this.$('.mac-validation-feedback');

        if (!input.value.trim()) {
            this.hideMacValidation(input, validationDiv);
            return true;
        }

        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^[0-9A-Fa-f]{12}$/;
        const isValid = macRegex.test(input.value.trim());

        input.classList.toggle('error', !isValid);

        if (!isValid) {
            this.showMacValidation(validationDiv, 'Invalid MAC address format. Use XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX', 'error');
        } else {
            this.showMacValidation(validationDiv, 'Valid MAC address format', 'success');
        }

        return isValid;
    }

    showMacValidation(div, message, type) {
        if (div) {
            div.textContent = message;
            div.className = `mac-validation-feedback ${type}`;
            div.style.display = 'block';
        }
    }

    hideMacValidation(input, div) {
        input.classList.remove('error');
        if (div) {
            div.style.display = 'none';
        }
    }

    showPaymentSuggestions() {
        const creditsInput = this.$('.credits-input');
        const suggestionsDiv = this.$('.payment-suggestions');

        if (!creditsInput?.value || !suggestionsDiv) return;

        const credits = parseInt(creditsInput.value);
        if (isNaN(credits) || credits <= 0) return;

        // Common pricing suggestions
        const suggestions = [
            credits * 15, // $15 per month
            credits * 20, // $20 per month
            credits * 25, // $25 per month
            credits * 30  // $30 per month
        ];

        const buttonsDiv = suggestionsDiv.querySelector('.suggestion-buttons');
        if (buttonsDiv) {
            buttonsDiv.innerHTML = suggestions.map(amount => `
                <button type="button" class="suggestion-btn" data-amount="${amount}">
                    $${amount}
                </button>
            `).join('');

            // Bind suggestion buttons
            buttonsDiv.querySelectorAll('.suggestion-btn').forEach(btn => {
                this.addEventListener(btn, 'click', (e) => {
                    const amount = e.target.getAttribute('data-amount');
                    this.$('input[name="amountPaid"]').value = amount;
                    suggestionsDiv.style.display = 'none';
                });
            });
        }

        suggestionsDiv.style.display = 'block';
    }

    async handleSubmit(event) {
        event.preventDefault();

        const submitBtn = this.$('.submit-btn');
        const originalText = submitBtn.textContent;

        try {
            submitBtn.textContent = '⏳ Adding Subscription...';
            submitBtn.disabled = true;

            // Validate form
            if (!this.validateForm()) {
                throw new Error('Please fix validation errors before submitting');
            }

            const formData = this.getFormData();

            // Submit to API
            const response = await fetch('/api/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to add subscription');
            }

            // Success
            console.log('✅ Subscription added successfully:', result.subscription);

            if (this.options.resetOnSuccess) {
                this.resetForm();
            }

            this.showSuccessMessage('Subscription added successfully!');
            this.emit('subscriptionAdded', { subscription: result.subscription });

        } catch (error) {
            console.error('❌ Error adding subscription:', error);
            this.showErrorMessage(error.message);
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    validateForm() {
        let isValid = true;
        const errors = [];

        // Customer validation
        if (!this.$('.selected-customer-id').value) {
            errors.push('Please select a customer');
            isValid = false;
        }

        // Service validation
        if (!this.$('.vendor-service-select').value) {
            errors.push('Please select a vendor service');
            isValid = false;
        }

        // Credits validation
        if (!this.validateCredits()) {
            isValid = false;
        }

        // MAC address validation
        const macInput = this.$('input[name="macAddress"]');
        if (macInput && !this.validateMacAddress(macInput)) {
            isValid = false;
        }

        // Amount validation
        const amountInput = this.$('input[name="amountPaid"]');
        if (!amountInput.value || parseFloat(amountInput.value) <= 0) {
            errors.push('Please enter a valid payment amount');
            isValid = false;
        }

        if (errors.length > 0) {
            this.showErrorMessage(errors.join('\n'));
        }

        return isValid;
    }

    getFormData() {
        const form = this.$('.add-subscription-form');
        const formData = new FormData(form);

        // Get vendor data from selected service
        const serviceSelect = this.$('.vendor-service-select');
        const selectedOption = serviceSelect?.options[serviceSelect.selectedIndex];

        return {
            customerID: formData.get('customerID') || this.$('.selected-customer-id').value,
            serviceName: formData.get('serviceName'),
            startDate: formData.get('startDate'),
            creditsSelected: parseInt(formData.get('creditsSelected')),
            amountPaid: parseFloat(formData.get('amountPaid')),
            status: formData.get('status'),
            vendorID: selectedOption?.dataset.vendorId || '',
            vendorServiceName: formData.get('vendorServiceName'),
            notes: formData.get('notes'),
            classification: formData.get('classification'),
            macAddress: formData.get('macAddress')
        };
    }

    resetForm() {
        const form = this.$('.add-subscription-form');
        if (form) {
            form.reset();

            // Clear customer selection if not preloaded
            if (!this.preloadCustomerId) {
                this.clearSelectedCustomer();
            }

            // Clear validation states
            this.$$('.error').forEach(el => el.classList.remove('error'));
            this.$$('.credits-validation, .mac-validation-feedback').forEach(el => {
                el.style.display = 'none';
            });

            // Reset date to today
            const today = new Date().toISOString().split('T')[0];
            this.$('input[name="startDate"]').value = today;

            // Hide service info
            this.hideServiceInfo();
        }
    }

    showPreview() {
        const formData = this.getFormData();

        const modal = WidgetManager.getWidget('confirmation-modal');
        if (modal) {
            modal.show({
                title: 'Subscription Preview',
                message: this.getPreviewContent(formData),
                confirmText: 'Confirm & Add',
                onConfirm: () => this.handleSubmit({ preventDefault: () => { } })
            });
        }
    }

    getPreviewContent(data) {
        return `
            <div class="subscription-preview">
                <strong>Customer:</strong> ${this.selectedCustomer?.name}<br>
                <strong>Service:</strong> ${data.serviceName}<br>
                <strong>Classification:</strong> ${data.classification || 'General'}<br>
                <strong>MAC Address:</strong> ${data.macAddress || 'Not specified'}<br>
                <strong>Vendor Service:</strong> ${data.vendorServiceName}<br>
                <strong>Credits:</strong> ${data.creditsSelected} months<br>
                <strong>Amount:</strong> $${data.amountPaid}<br>
                <strong>Start Date:</strong> ${data.startDate}<br>
                ${data.notes ? `<strong>Notes:</strong> ${data.notes}` : ''}
            </div>
        `;
    }

    debugForm() {
        console.log('🔍 Debugging subscription form:');
        console.log('Selected Customer:', this.selectedCustomer);
        console.log('Form Data:', this.getFormData());
        console.log('Vendor Services:', this.vendorServices);
    }

    getCustomerDisplayName(customer) {
        return `${customer.name} (${customer.email})`;
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

        const form = this.$('.add-subscription-form');
        if (form) {
            form.insertBefore(messageEl, form.firstChild);

            // Auto-hide after 5 seconds
            setTimeout(() => {
                messageEl.remove();
            }, 5000);
        }
    }

    // Utility methods
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Public API
    setCustomer(customer) {
        this.selectCustomer(customer);
    }

    setVendorService(vendorId, serviceName) {
        const serviceSelect = this.$('.vendor-service-select');
        if (serviceSelect) {
            const option = Array.from(serviceSelect.options).find(opt =>
                opt.dataset.vendorId === vendorId && opt.value === serviceName
            );
            if (option) {
                serviceSelect.value = option.value;
                this.handleServiceChange(serviceSelect);
            }
        }
    }
}

window.AddSubscriptionWidget = AddSubscriptionWidget;
