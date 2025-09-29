class AddVendorWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            resetOnSuccess: true,
            validateOnSubmit: true,
            showDescriptionField: true,
            showContactFields: true
        };
    }

    async getTemplate() {
        return `
            <div class="vendor-tab-content">
                <h3>➕ Add New Vendor</h3>
                <form class="add-vendor-form">
                    <div class="form-group">
                        <label>🏭 Vendor Name:</label>
                        <input type="text" name="name" required maxlength="100" 
                               placeholder="Enter vendor name">
                        <small>The name of the vendor or service provider</small>
                    </div>
                    
                    ${this.options.showContactFields ? this.getContactFieldsTemplate() : ''}
                    ${this.options.showDescriptionField ? this.getDescriptionFieldTemplate() : ''}
                    
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Add Vendor</button>
                        <button type="button" class="btn-secondary reset-btn">Reset Form</button>
                    </div>
                </form>
            </div>
        `;
    }

    getContactFieldsTemplate() {
        return `
            <div class="contact-fields">
                <h4>📞 Contact Information</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>📧 Contact Email:</label>
                        <input type="email" name="contactEmail" maxlength="100" 
                               placeholder="contact@vendor.com">
                        <small>Primary contact email (optional)</small>
                    </div>
                    <div class="form-group">
                        <label>📱 Contact Phone:</label>
                        <input type="tel" name="contactPhone" maxlength="20" 
                               placeholder="+1-555-123-4567">
                        <small>Primary contact phone (optional)</small>
                    </div>
                </div>
            </div>
        `;
    }

    getDescriptionFieldTemplate() {
        return `
            <div class="form-group">
                <label>📝 Description:</label>
                <textarea name="description" rows="3" maxlength="500" 
                          placeholder="Brief description of vendor services and capabilities"></textarea>
                <div class="character-count">0/500 characters</div>
                <small>Describe what services this vendor provides</small>
            </div>
        `;
    }

    bindEvents() {
        const form = this.$('.add-vendor-form');
        if (form) {
            this.addEventListener(form, 'submit', (e) => this.handleSubmit(e));
        }

        const resetBtn = this.$('.reset-btn');
        if (resetBtn) {
            this.addEventListener(resetBtn, 'click', () => this.resetForm());
        }

        // Character counter for description
        const descriptionField = this.$('textarea[name="description"]');
        const charCount = this.$('.character-count');
        if (descriptionField && charCount) {
            this.addEventListener(descriptionField, 'input', (e) => {
                const length = e.target.value.length;
                charCount.textContent = `${length}/500 characters`;
                charCount.style.color = length > 450 ? '#e53e3e' : '#718096';
            });
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
            submitBtn.textContent = '⏳ Adding Vendor...';
            submitBtn.disabled = true;

            const formData = new FormData(event.target);
            const vendorData = {
                name: formData.get('name'),
                contactEmail: formData.get('contactEmail'),
                contactPhone: formData.get('contactPhone'),
                description: formData.get('description')
            };

            // Validate data
            if (this.options.validateOnSubmit) {
                const validation = this.validateVendorData(vendorData);
                if (!validation.isValid) {
                    throw new Error(validation.errors.join('\n'));
                }
            }

            // Submit to API
            const response = await fetch('/api/vendors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vendorData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to add vendor');
            }

            // Success
            console.log('✅ Vendor added successfully:', result.vendor);

            if (this.options.resetOnSuccess) {
                this.resetForm();
            }

            this.showSuccessMessage('Vendor added successfully!');
            this.emit('vendorAdded', { vendor: result.vendor });

        } catch (error) {
            console.error('❌ Error adding vendor:', error);
            this.showErrorMessage(error.message);
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    validateVendorData(data) {
        const errors = [];

        // Name validation
        if (!data.name || data.name.trim().length < 2) {
            errors.push('Vendor name must be at least 2 characters long');
        }

        // Email validation (optional)
        if (data.contactEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.contactEmail)) {
                errors.push('Contact email must be a valid email address');
            }
        }

        // Phone validation (optional)
        if (data.contactPhone) {
            const phoneRegex = /^[\+]?[\s\-\(\)]*([0-9][\s\-\(\)]*){6,20}$/;
            if (!phoneRegex.test(data.contactPhone)) {
                errors.push('Contact phone must be a valid phone number');
            }
        }

        // Description length validation
        if (data.description && data.description.length > 500) {
            errors.push('Description cannot exceed 500 characters');
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
                if (!value) {
                    isValid = false;
                    errorMessage = 'Vendor name is required';
                } else if (value.length < 2) {
                    isValid = false;
                    errorMessage = 'Vendor name must be at least 2 characters long';
                }
                break;
            case 'contactEmail':
                if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid email address';
                }
                break;
            case 'contactPhone':
                if (value && !/^[\+]?[\s\-\(\)]*([0-9][\s\-\(\)]*){6,20}$/.test(value)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid phone number';
                }
                break;
            case 'description':
                if (value.length > 500) {
                    isValid = false;
                    errorMessage = 'Description cannot exceed 500 characters';
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
        const form = this.$('.add-vendor-form');
        if (form) {
            form.reset();

            // Clear validation errors
            this.$$('.error').forEach(el => el.classList.remove('error'));
            this.$$('.field-error').forEach(el => el.remove());

            // Reset character counter
            const charCount = this.$('.character-count');
            if (charCount) {
                charCount.textContent = '0/500 characters';
                charCount.style.color = '#718096';
            }

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

        const form = this.$('.add-vendor-form');
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
        const form = this.$('.add-vendor-form');
        if (form) {
            const formData = new FormData(form);
            return {
                name: formData.get('name'),
                contactEmail: formData.get('contactEmail'),
                contactPhone: formData.get('contactPhone'),
                description: formData.get('description')
            };
        }
        return null;
    }

    setFormData(data) {
        if (data.name) this.$('input[name="name"]').value = data.name;
        if (data.contactEmail) this.$('input[name="contactEmail"]').value = data.contactEmail;
        if (data.contactPhone) this.$('input[name="contactPhone"]').value = data.contactPhone;
        if (data.description) {
            this.$('textarea[name="description"]').value = data.description;
            // Update character counter
            const charCount = this.$('.character-count');
            if (charCount) {
                charCount.textContent = `${data.description.length}/500 characters`;
            }
        }
    }
}

window.AddVendorWidget = AddVendorWidget;
