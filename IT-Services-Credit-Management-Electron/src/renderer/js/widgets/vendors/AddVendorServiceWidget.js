class AddVendorServiceWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.vendors = [];
        this.preloadVendorId = options.preloadVendorId;
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            resetOnSuccess: true,
            validateOnSubmit: true,
            preloadVendorId: null,
            showDescriptionField: true
        };
    }

    async loadData() {
        try {
            this.log('Loading vendors for service creation...');
            const response = await fetch('/api/vendors');
            if (!response.ok) throw new Error('Failed to fetch vendors');

            this.vendors = await response.json().then(vendors =>
                vendors.filter(v => v.is_active !== 0)
            );
            this.log(`Loaded ${this.vendors.length} active vendors`);
        } catch (error) {
            this.handleError('Failed to load vendors', error);
        }
    }

    async getTemplate() {
        return `
            <div class="add-vendor-service-section">
                <h4>Add Service to Catalog</h4>
                <form class="add-vendor-service-form">
                    ${this.getVendorSelectTemplate()}
                    ${this.getServiceFieldsTemplate()}
                    
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Add Service to Catalog</button>
                        <button type="button" class="btn-secondary reset-service-btn">Reset</button>
                    </div>
                </form>
            </div>
        `;
    }

    getVendorSelectTemplate() {
        return `
            <div class="form-group">
                <label>🏭 Select Vendor:</label>
                <select name="vendorID" class="service-vendor-select" required>
                    <option value="">Choose a vendor...</option>
                    ${this.getVendorOptions()}
                </select>
                <small>Or <a href="#" class="add-vendor-link">add a new vendor first</a></small>
                
                <div class="selected-vendor-info" style="display: none;">
                    <div class="vendor-details"></div>
                </div>
            </div>
        `;
    }

    getVendorOptions() {
        return this.vendors.map(vendor => `
            <option value="${vendor.vendor_id}" 
                    ${this.preloadVendorId === vendor.vendor_id ? 'selected' : ''}
                    data-vendor-name="${vendor.name}"
                    data-vendor-email="${vendor.contact_email || ''}"
                    data-vendor-phone="${vendor.contact_phone || ''}">
                ${this.escapeHtml(vendor.name)}
            </option>
        `).join('');
    }

    getServiceFieldsTemplate() {
        return `
            <div class="form-group">
                <label>🔧 Service Name:</label>
                <input type="text" name="serviceName" required maxlength="100" 
                       placeholder="e.g., GOLDTV, SMART4K, IPTV Premium">
                <small>Enter a descriptive name for this service</small>
            </div>
            
            ${this.options.showDescriptionField ? `
                <div class="form-group">
                    <label>📝 Description:</label>
                    <textarea name="description" rows="2" maxlength="500" 
                              placeholder="Brief service description"></textarea>
                    <div class="character-count">0/500 characters</div>
                    <small>Optional description of the service features and capabilities</small>
                </div>
            ` : ''}
            
            <div class="service-preview" style="display: none;">
                <h5>Service Preview:</h5>
                <div class="preview-content"></div>
            </div>
        `;
    }

    bindEvents() {
        const form = this.$('.add-vendor-service-form');
        if (form) {
            this.addEventListener(form, 'submit', (e) => this.handleSubmit(e));
        }

        // Vendor selection
        const vendorSelect = this.$('.service-vendor-select');
        if (vendorSelect) {
            this.addEventListener(vendorSelect, 'change', (e) => this.handleVendorSelect(e.target));
        }

        // Reset button
        const resetBtn = this.$('.reset-service-btn');
        if (resetBtn) {
            this.addEventListener(resetBtn, 'click', () => this.resetForm());
        }

        // Add vendor link
        const addVendorLink = this.$('.add-vendor-link');
        if (addVendorLink) {
            this.addEventListener(addVendorLink, 'click', (e) => {
                e.preventDefault();
                this.emit('addVendorRequested');
            });
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

        // Real-time preview
        const serviceNameField = this.$('input[name="serviceName"]');
        if (serviceNameField) {
            this.addEventListener(serviceNameField, 'input', () => this.updatePreview());
        }
        if (descriptionField) {
            this.addEventListener(descriptionField, 'input', () => this.updatePreview());
        }

        // Real-time validation
        if (this.options.validateOnSubmit) {
            const inputs = this.$$('input, textarea, select');
            inputs.forEach(input => {
                this.addEventListener(input, 'blur', (e) => this.validateField(e.target));
            });
        }
    }

    handleVendorSelect(select) {
        const selectedOption = select.options[select.selectedIndex];

        if (selectedOption && selectedOption.value) {
            this.showVendorInfo(selectedOption);
        } else {
            this.hideVendorInfo();
        }

        this.updatePreview();
    }

    showVendorInfo(option) {
        const infoDiv = this.$('.selected-vendor-info');
        const detailsDiv = this.$('.vendor-details');

        if (infoDiv && detailsDiv) {
            const vendorName = option.dataset.vendorName;
            const vendorEmail = option.dataset.vendorEmail;
            const vendorPhone = option.dataset.vendorPhone;

            detailsDiv.innerHTML = `
                <div class="vendor-info-item">
                    <strong>Selected Vendor:</strong> ${this.escapeHtml(vendorName)}
                </div>
                ${vendorEmail ? `
                    <div class="vendor-info-item">
                        <strong>Email:</strong> ${vendorEmail}
                    </div>
                ` : ''}
                ${vendorPhone ? `
                    <div class="vendor-info-item">
                        <strong>Phone:</strong> ${vendorPhone}
                    </div>
                ` : ''}
            `;

            infoDiv.style.display = 'block';
        }
    }

    hideVendorInfo() {
        const infoDiv = this.$('.selected-vendor-info');
        if (infoDiv) {
            infoDiv.style.display = 'none';
        }
    }

    updatePreview() {
        const vendorSelect = this.$('.service-vendor-select');
        const serviceNameField = this.$('input[name="serviceName"]');
        const descriptionField = this.$('textarea[name="description"]');
        const previewDiv = this.$('.service-preview');
        const previewContent = this.$('.preview-content');

        if (!vendorSelect || !serviceNameField || !previewDiv || !previewContent) return;

        const vendorName = vendorSelect.options[vendorSelect.selectedIndex]?.dataset?.vendorName || '';
        const serviceName = serviceNameField.value.trim();

        if (vendorName && serviceName) {
            const description = descriptionField ? descriptionField.value.trim() : '';

            previewContent.innerHTML = `
                <div class="preview-service">
                    <strong>Full Service Name:</strong> ${this.escapeHtml(vendorName)} - ${this.escapeHtml(serviceName)}<br>
                    <strong>Vendor:</strong> ${this.escapeHtml(vendorName)}<br>
                    <strong>Service:</strong> ${this.escapeHtml(serviceName)}<br>
                    ${description ? `<strong>Description:</strong> ${this.escapeHtml(description)}<br>` : ''}
                </div>
            `;
            previewDiv.style.display = 'block';
        } else {
            previewDiv.style.display = 'none';
        }
    }

    async handleSubmit(event) {
        event.preventDefault();

        const submitBtn = this.$('button[type="submit"]');
        const originalText = submitBtn.textContent;

        try {
            submitBtn.textContent = '⏳ Adding Service...';
            submitBtn.disabled = true;

            const formData = new FormData(event.target);
            const serviceData = {
                vendorID: formData.get('vendorID'),
                serviceName: formData.get('serviceName'),
                description: formData.get('description')
            };

            // Validate data
            if (this.options.validateOnSubmit) {
                const validation = this.validateServiceData(serviceData);
                if (!validation.isValid) {
                    throw new Error(validation.errors.join('\n'));
                }
            }

            // Check for duplicate service name for this vendor
            await this.checkDuplicateService(serviceData.vendorID, serviceData.serviceName);

            // Submit to API
            const response = await fetch('/api/vendor-services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(serviceData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to add vendor service');
            }

            // Success
            console.log('✅ Vendor service added successfully:', result.service);

            if (this.options.resetOnSuccess) {
                this.resetForm();
            }

            this.showSuccessMessage(`Service "${serviceData.serviceName}" added successfully!`);
            this.emit('vendorServiceAdded', { service: result.service });

        } catch (error) {
            console.error('❌ Error adding vendor service:', error);
            this.showErrorMessage(error.message);
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    async checkDuplicateService(vendorID, serviceName) {
        try {
            const response = await fetch(`/api/vendor-services/${vendorID}`);
            if (response.ok) {
                const existingServices = await response.json();
                const duplicate = existingServices.find(service =>
                    service.service_name.toLowerCase() === serviceName.toLowerCase()
                );

                if (duplicate) {
                    throw new Error(`Service "${serviceName}" already exists for this vendor`);
                }
            }
        } catch (error) {
            if (error.message.includes('already exists')) {
                throw error; // Re-throw duplicate error
            }
            // Ignore other errors (like 404), we'll let the main API call handle validation
        }
    }

    validateServiceData(data) {
        const errors = [];

        // Vendor selection validation
        if (!data.vendorID) {
            errors.push('Please select a vendor');
        }

        // Service name validation
        if (!data.serviceName || data.serviceName.trim().length < 2) {
            errors.push('Service name must be at least 2 characters long');
        } else if (data.serviceName.trim().length > 100) {
            errors.push('Service name cannot exceed 100 characters');
        }

        // Description validation (optional)
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
            case 'vendorID':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Please select a vendor';
                }
                break;
            case 'serviceName':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Service name is required';
                } else if (value.length < 2) {
                    isValid = false;
                    errorMessage = 'Service name must be at least 2 characters long';
                } else if (value.length > 100) {
                    isValid = false;
                    errorMessage = 'Service name cannot exceed 100 characters';
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
        const form = this.$('.add-vendor-service-form');
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

            // Hide vendor info and preview
            this.hideVendorInfo();
            const previewDiv = this.$('.service-preview');
            if (previewDiv) {
                previewDiv.style.display = 'none';
            }

            // Reset to preload vendor if specified
            if (this.preloadVendorId) {
                const vendorSelect = this.$('.service-vendor-select');
                if (vendorSelect) {
                    vendorSelect.value = this.preloadVendorId;
                    this.handleVendorSelect(vendorSelect);
                }
            }

            // Focus first input
            const serviceNameInput = this.$('input[name="serviceName"]');
            if (serviceNameInput) {
                serviceNameInput.focus();
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

        const form = this.$('.add-vendor-service-form');
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

    setVendor(vendorId) {
        this.preloadVendorId = vendorId;
        const vendorSelect = this.$('.service-vendor-select');
        if (vendorSelect) {
            vendorSelect.value = vendorId;
            this.handleVendorSelect(vendorSelect);
        }
    }

    getFormData() {
        const form = this.$('.add-vendor-service-form');
        if (form) {
            const formData = new FormData(form);
            return {
                vendorID: formData.get('vendorID'),
                serviceName: formData.get('serviceName'),
                description: formData.get('description')
            };
        }
        return null;
    }
}

window.AddVendorServiceWidget = AddVendorServiceWidget;
