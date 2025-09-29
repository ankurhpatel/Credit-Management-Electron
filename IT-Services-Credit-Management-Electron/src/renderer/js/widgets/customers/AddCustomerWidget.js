class AddCustomerWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showInModal: false,
            resetOnSuccess: true,
            validateOnSubmit: true
        };
    }

    async getTemplate() {
        return `
            <div class="customer-tab-content">
                <h3>➕ Add New Customer</h3>
                <form class="add-customer-form">
                    <div class="form-group">
                        <label>👤 Customer Name:</label>
                        <input type="text" name="name" required maxlength="100" 
                               placeholder="Enter customer name">
                    </div>
                    <div class="form-group">
                        <label>📧 Email Address:</label>
                        <input type="email" name="email" required maxlength="100" 
                               placeholder="customer@example.com">
                    </div>
                    <div class="form-group">
                        <label>📱 Phone Number:</label>
                        <input type="tel" name="phone" maxlength="20" 
                               placeholder="+1-555-123-4567">
                    </div>
                    <div class="form-group">
                        <label>🏠 Address:</label>
                        <textarea name="address" rows="3" maxlength="200" 
                                  placeholder="Customer address (optional)"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Add Customer</button>
                        <button type="button" class="btn-secondary reset-btn">Reset Form</button>
                    </div>
                </form>
            </div>
        `;
    }

    bindEvents() {
        const form = this.$('.add-customer-form');
        if (form) {
            this.addEventListener(form, 'submit', (e) => this.handleSubmit(e));
        }

        const resetBtn = this.$('.reset-btn');
        if (resetBtn) {
            this.addEventListener(resetBtn, 'click', () => this.resetForm());
        }

        // Real-time validation
        if (this.options.validateOnSubmit) {
            const inputs = this.$$('input, textarea');
            inputs.forEach(input => {
                this.addEventListener(input, 'blur', (e) => this.validateField(e.target));
            });
        }
    }

    async handleSubmit(event) {
        event.preventDefault();

        const submitBtn = this.$('button[type="submit"]');
        const originalText = submitBtn.textContent;

        try {
            submitBtn.textContent = '⏳ Adding Customer...';
            submitBtn.disabled = true;

            const formData = new FormData(event.target);
            const customerData = {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                address: formData.get('address')
            };

            // Validate data
            if (this.options.validateOnSubmit) {
                const validation = this.validateCustomerData(customerData);
                if (!validation.isValid) {
                    throw new Error(validation.errors.join('\n'));
                }
            }

            // Submit to API
            const response = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customerData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to add customer');
            }

            // Success
            console.log('✅ Customer added successfully:', result.customer);

            if (this.options.resetOnSuccess) {
                this.resetForm();
            }

            // Show success message
            this.showSuccessMessage('Customer added successfully!');

            // Emit success event
            this.emit('customerAdded', { customer: result.customer });

        } catch (error) {
            console.error('❌ Error adding customer:', error);
            this.showErrorMessage(error.message);
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    validateCustomerData(data) {
        const errors = [];

        // Name validation
        if (!data.name || data.name.trim().length < 2) {
            errors.push('Customer name must be at least 2 characters long');
        }

        // Email validation
        if (!data.email) {
            errors.push('Email address is required');
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                errors.push('Please enter a valid email address');
            }
        }

        // Phone validation (optional)
        if (data.phone) {
            const phoneRegex = /^[\+]?[\s\-\(\)]*([0-9][\s\-\(\)]*){6,20}$/;
            if (!phoneRegex.test(data.phone)) {
                errors.push('Please enter a valid phone number');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        switch (field.name) {
            case 'name':
                if (value.length < 2) {
                    isValid = false;
                    errorMessage = 'Name must be at least 2 characters long';
                }
                break;
            case 'email':
                if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid email address';
                }
                break;
            case 'phone':
                if (value && !/^[\+]?[\s\-\(\)]*([0-9][\s\-\(\)]*){6,20}$/.test(value)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid phone number';
                }
                break;
        }

        // Update field styling
        field.classList.toggle('error', !isValid);

        // Show/hide error message
        let errorEl = field.parentNode.querySelector('.field-error');
        if (!isValid && errorMessage) {
            if (!errorEl) {
                errorEl = document.createElement('div');
                errorEl.className = 'field-error';
                field.parentNode.appendChild(errorEl);
            }
            errorEl.textContent = errorMessage;
        } else if (errorEl) {
            errorEl.remove();
        }

        return isValid;
    }

    resetForm() {
        const form = this.$('.add-customer-form');
        if (form) {
            form.reset();

            // Clear validation errors
            this.$$('.error').forEach(el => el.classList.remove('error'));
            this.$$('.field-error').forEach(el => el.remove());

            // Focus first input
            const firstInput = this.$('input[name="name"]');
            if (firstInput) {
                firstInput.focus();
            }
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

        const form = this.$('.add-customer-form');
        if (form) {
            form.insertBefore(messageEl, form.firstChild);

            // Auto-hide after 5 seconds
            setTimeout(() => {
                messageEl.remove();
            }, 5000);
        }
    }

    // Public API
    getFormData() {
        const form = this.$('.add-customer-form');
        if (form) {
            const formData = new FormData(form);
            return {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                address: formData.get('address')
            };
        }
        return null;
    }

    setFormData(data) {
        if (data.name) this.$('input[name="name"]').value = data.name;
        if (data.email) this.$('input[name="email"]').value = data.email;
        if (data.phone) this.$('input[name="phone"]').value = data.phone;
        if (data.address) this.$('textarea[name="address"]').value = data.address;
    }
}

window.AddCustomerWidget = AddCustomerWidget;
