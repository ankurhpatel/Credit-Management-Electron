class PurchaseCreditsWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.vendors = [];
        this.vendorServices = [];
        this.recentPurchases = [];
        this.preloadVendorId = options.preloadVendorId;
        this.preloadServiceName = options.preloadServiceName;
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            resetOnSuccess: true,
            validateOnSubmit: true,
            showRecentPurchases: true,
            showCurrencyNote: true,
            showCostCalculator: true,
            preloadVendorId: null,
            preloadServiceName: null
        };
    }

    async loadData() {
        try {
            this.log('Loading data for credit purchase...');

            // Load vendors and services in parallel
            const [vendorsResponse, servicesResponse] = await Promise.all([
                fetch('/api/vendors'),
                fetch('/api/vendor-services')
            ]);

            if (!vendorsResponse.ok || !servicesResponse.ok) {
                throw new Error('Failed to fetch required data');
            }

            this.vendors = (await vendorsResponse.json()).filter(v => v.is_active !== 0);
            this.vendorServices = await servicesResponse.json();

            // Load recent purchases if enabled
            if (this.options.showRecentPurchases) {
                await this.loadRecentPurchases();
            }

            this.log(`Loaded ${this.vendors.length} vendors and ${this.vendorServices.length} services`);
        } catch (error) {
            this.handleError('Failed to load purchase data', error);
        }
    }

    async loadRecentPurchases() {
        try {
            const response = await fetch('/api/vendor-transactions?limit=5');
            if (response.ok) {
                this.recentPurchases = await response.json();
            }
        } catch (error) {
            console.error('Failed to load recent purchases:', error);
        }
    }

    async getTemplate() {
        const today = new Date().toISOString().split('T')[0];

        return `
            <div class="vendor-tab-content">
                <h3>💸 Purchase Credits</h3>

                ${this.options.showCurrencyNote ? this.getCurrencyNoteTemplate() : ''}

                <form class="purchase-credits-form">
                    ${this.getVendorSelectionTemplate()}
                    ${this.getServiceSelectionTemplate()}
                    ${this.getPurchaseDetailsTemplate(today)}
                    ${this.options.showCostCalculator ? this.getCostCalculatorTemplate() : ''}
                    
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">💸 Record Credit Purchase</button>
                        <button type="button" class="btn-secondary reset-purchase-btn">Reset Form</button>
                        <button type="button" class="btn-info preview-purchase-btn">Preview Purchase</button>
                    </div>
                </form>

                ${this.options.showRecentPurchases ? this.getRecentPurchasesTemplate() : ''}
            </div>
        `;
    }

    getCurrencyNoteTemplate() {
        return `
            <div class="currency-note">
                <div class="note-icon">💱</div>
                <div class="note-content">
                    <strong>Currency Note:</strong> Convert your purchase amount to USD before entering. 
                    This helps maintain consistent profit calculations across all transactions.
                </div>
            </div>
        `;
    }

    getVendorSelectionTemplate() {
        return `
            <div class="form-group">
                <label>🏭 Select Vendor:</label>
                <select name="vendorID" class="purchase-vendor-select" required>
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

    getServiceSelectionTemplate() {
        return `
            <div class="form-group">
                <label>🔧 Select Service:</label>
                <select name="serviceName" class="purchase-service-select" required>
                    <option value="">Choose a service...</option>
                </select>
                <small>Service must exist in catalog. <a href="#" class="manage-services-link">Add to catalog</a> if needed.</small>
                
                <div class="service-info" style="display: none;">
                    <div class="current-balance"></div>
                    <div class="service-description"></div>
                </div>
            </div>
        `;
    }

    getPurchaseDetailsTemplate(today) {
        return `
            <div class="purchase-details">
                <h4>💰 Purchase Details</h4>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>📅 Purchase Date:</label>
                        <input type="date" name="purchaseDate" value="${today}" required>
                    </div>
                    <div class="form-group">
                        <label>📊 Number of Credits:</label>
                        <input type="number" name="credits" min="1" max="1000000" required 
                               placeholder="e.g., 1000" class="credits-input">
                        <small>Each credit typically = 1 month of service to sell</small>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>💰 Total Cost in USD ($):</label>
                    <input type="number" name="priceUSD" step="0.01" min="0" required 
                           placeholder="0.00" class="price-input">
                    <small>Convert from other currencies to USD for consistent tracking</small>
                </div>
                
                <div class="form-group">
                    <label>📝 Notes:</label>
                    <textarea name="notes" rows="2" maxlength="500" 
                              placeholder="Exchange rates, payment method, additional notes..."></textarea>
                    <div class="character-count">0/500 characters</div>
                </div>
            </div>
        `;
    }

    getCostCalculatorTemplate() {
        return `
            <div class="cost-calculator" style="display: none;">
                <h5>🧮 Cost Calculator</h5>
                <div class="calculator-content">
                    <div class="calc-row">
                        <span class="calc-label">Cost per Credit:</span>
                        <span class="calc-value" id="costPerCredit">$0.00</span>
                    </div>
                    <div class="calc-row">
                        <span class="calc-label">Total Credits:</span>
                        <span class="calc-value" id="totalCredits">0</span>
                    </div>
                    <div class="calc-row">
                        <span class="calc-label">Total Cost:</span>
                        <span class="calc-value" id="totalCost">$0.00</span>
                    </div>
                    <div class="calc-row suggested-pricing">
                        <span class="calc-label">Suggested Selling Price (per credit):</span>
                        <div class="pricing-suggestions">
                            <span class="pricing-option" data-markup="1.5">$0.00 (50% markup)</span>
                            <span class="pricing-option" data-markup="2.0">$0.00 (100% markup)</span>
                            <span class="pricing-option" data-markup="2.5">$0.00 (150% markup)</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getRecentPurchasesTemplate() {
        return `
            <div class="recent-purchases">
                <h4>💳 Recent Credit Purchases</h4>
                <div class="recent-purchases-list">
                    ${this.getRecentPurchasesListTemplate()}
                </div>
            </div>
        `;
    }

    getRecentPurchasesListTemplate() {
        if (this.recentPurchases.length === 0) {
            return '<div class="no-recent-purchases">No recent purchases found</div>';
        }

        return this.recentPurchases.map(purchase => `
            <div class="recent-purchase-item">
                <div class="purchase-header">
                    <strong>${purchase.vendor_name} - ${purchase.service_name}</strong>
                    <span class="purchase-date">${this.formatDate(purchase.purchase_date)}</span>
                </div>
                <div class="purchase-details">
                    <span class="purchase-credits">${purchase.credits} credits</span>
                    <span class="purchase-cost">${this.formatCurrency(purchase.price_usd)}</span>
                    <span class="purchase-per-credit">${this.formatCurrency(purchase.price_usd / purchase.credits)}/credit</span>
                </div>
                ${purchase.notes ? `
                    <div class="purchase-notes">${this.escapeHtml(purchase.notes)}</div>
                ` : ''}
            </div>
        `).join('');
    }

    bindEvents() {
        const form = this.$('.purchase-credits-form');
        if (form) {
            this.addEventListener(form, 'submit', (e) => this.handleSubmit(e));
        }

        // Vendor selection
        const vendorSelect = this.$('.purchase-vendor-select');
        if (vendorSelect) {
            this.addEventListener(vendorSelect, 'change', (e) => this.handleVendorSelect(e.target));
        }

        // Service selection
        const serviceSelect = this.$('.purchase-service-select');
        if (serviceSelect) {
            this.addEventListener(serviceSelect, 'change', (e) => this.handleServiceSelect(e.target));
        }

        // Cost calculator inputs
        const creditsInput = this.$('.credits-input');
        const priceInput = this.$('.price-input');
        if (creditsInput && priceInput) {
            this.addEventListener(creditsInput, 'input', () => this.updateCostCalculator());
            this.addEventListener(priceInput, 'input', () => this.updateCostCalculator());
        }

        // Form controls
        this.bindFormControls();

        // Links
        this.bindLinks();

        // Real-time validation
        if (this.options.validateOnSubmit) {
            this.bindValidation();
        }
    }

    bindFormControls() {
        const resetBtn = this.$('.reset-purchase-btn');
        if (resetBtn) {
            this.addEventListener(resetBtn, 'click', () => this.resetForm());
        }

        const previewBtn = this.$('.preview-purchase-btn');
        if (previewBtn) {
            this.addEventListener(previewBtn, 'click', () => this.showPreview());
        }

        // Character counter for notes
        const notesField = this.$('textarea[name="notes"]');
        const charCount = this.$('.character-count');
        if (notesField && charCount) {
            this.addEventListener(notesField, 'input', (e) => {
                const length = e.target.value.length;
                charCount.textContent = `${length}/500 characters`;
                charCount.style.color = length > 450 ? '#e53e3e' : '#718096';
            });
        }
    }

    bindLinks() {
        const addVendorLink = this.$('.add-vendor-link');
        if (addVendorLink) {
            this.addEventListener(addVendorLink, 'click', (e) => {
                e.preventDefault();
                this.emit('addVendorRequested');
            });
        }

        const manageServicesLink = this.$('.manage-services-link');
        if (manageServicesLink) {
            this.addEventListener(manageServicesLink, 'click', (e) => {
                e.preventDefault();
                this.emit('manageServicesRequested');
            });
        }
    }

    bindValidation() {
        const inputs = this.$$('input[required], select[required], textarea');
        inputs.forEach(input => {
            this.addEventListener(input, 'blur', (e) => this.validateField(e.target));
        });
    }

    async handleVendorSelect(select) {
        const vendorId = select.value;
        const selectedOption = select.options[select.selectedIndex];

        if (vendorId && selectedOption) {
            this.showVendorInfo(selectedOption);
            await this.loadServicesForVendor(vendorId);
        } else {
            this.hideVendorInfo();
            this.clearServices();
        }
    }

    showVendorInfo(option) {
        const infoDiv = this.$('.selected-vendor-info');
        const detailsDiv = this.$('.vendor-details');

        if (infoDiv && detailsDiv) {
            const vendorName = option.dataset.vendorName;
            const vendorEmail = option.dataset.vendorEmail;
            const vendorPhone = option.dataset.vendorPhone;

            detailsDiv.innerHTML = `
                <div class="vendor-info-grid">
                    <div class="vendor-info-item">
                        <strong>Vendor:</strong> ${this.escapeHtml(vendorName)}
                    </div>
                    ${vendorEmail ? `
                        <div class="vendor-info-item">
                            <strong>Email:</strong> <a href="mailto:${vendorEmail}">${vendorEmail}</a>
                        </div>
                    ` : ''}
                    ${vendorPhone ? `
                        <div class="vendor-info-item">
                            <strong>Phone:</strong> <a href="tel:${vendorPhone}">${vendorPhone}</a>
                        </div>
                    ` : ''}
                </div>
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

    async loadServicesForVendor(vendorId) {
        try {
            const serviceSelect = this.$('.purchase-service-select');
            if (!serviceSelect) return;

            // Filter services for selected vendor
            const vendorServices = this.vendorServices.filter(s =>
                s.vendor_id === vendorId && s.is_available !== 0
            );

            // Update service options
            serviceSelect.innerHTML = `
                <option value="">Choose a service...</option>
                ${vendorServices.map(service => `
                    <option value="${service.service_name}"
                            ${this.preloadServiceName === service.service_name ? 'selected' : ''}
                            data-service-id="${service.service_id}"
                            data-description="${service.description || ''}">
                        ${this.escapeHtml(service.service_name)}
                    </option>
                `).join('')}
            `;

            // Auto-select preloaded service if available
            if (this.preloadServiceName && vendorServices.find(s => s.service_name === this.preloadServiceName)) {
                serviceSelect.value = this.preloadServiceName;
                this.handleServiceSelect(serviceSelect);
            }

        } catch (error) {
            console.error('Error loading services for vendor:', error);
        }
    }

    clearServices() {
        const serviceSelect = this.$('.purchase-service-select');
        if (serviceSelect) {
            serviceSelect.innerHTML = '<option value="">Choose a service...</option>';
        }
        this.hideServiceInfo();
    }

    async handleServiceSelect(select) {
        const serviceName = select.value;
        const vendorId = this.$('.purchase-vendor-select').value;

        if (serviceName && vendorId) {
            await this.showServiceInfo(vendorId, serviceName);
        } else {
            this.hideServiceInfo();
        }
    }

    async showServiceInfo(vendorId, serviceName) {
        try {
            // Get current credit balance
            const balanceResponse = await fetch('/api/credit-balances');
            let currentBalance = null;

            if (balanceResponse.ok) {
                const balances = await balanceResponse.json();
                currentBalance = balances.find(b =>
                    b.vendor_id === vendorId && b.service_name === serviceName
                );
            }

            // Show service information
            const serviceInfo = this.$('.service-info');
            const balanceDiv = this.$('.current-balance');
            const descriptionDiv = this.$('.service-description');

            if (serviceInfo && balanceDiv) {
                if (currentBalance) {
                    const isLow = currentBalance.remaining_credits < 10;
                    balanceDiv.innerHTML = `
                        <div class="balance-display ${isLow ? 'low-balance' : 'good-balance'}">
                            ${isLow ? '⚠️' : '💳'} Current Balance: ${currentBalance.remaining_credits} credits
                            ${isLow ? ' (Low stock!)' : ''}
                        </div>
                    `;
                } else {
                    balanceDiv.innerHTML = `
                        <div class="balance-display no-balance">
                            ℹ️ No existing balance for this service
                        </div>
                    `;
                }

                // Show description if available
                const selectedOption = this.$('.purchase-service-select').options[this.$('.purchase-service-select').selectedIndex];
                const description = selectedOption?.dataset?.description;
                if (description && descriptionDiv) {
                    descriptionDiv.innerHTML = `
                        <div class="service-desc">
                            <strong>Description:</strong> ${this.escapeHtml(description)}
                        </div>
                    `;
                }

                serviceInfo.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading service info:', error);
        }
    }

    hideServiceInfo() {
        const serviceInfo = this.$('.service-info');
        if (serviceInfo) {
            serviceInfo.style.display = 'none';
        }
    }

    updateCostCalculator() {
        const creditsInput = this.$('.credits-input');
        const priceInput = this.$('.price-input');
        const calculator = this.$('.cost-calculator');

        if (!creditsInput || !priceInput || !calculator) return;

        const credits = parseInt(creditsInput.value) || 0;
        const totalCost = parseFloat(priceInput.value) || 0;

        if (credits > 0 && totalCost > 0) {
            const costPerCredit = totalCost / credits;

            // Update calculator display
            this.$('#costPerCredit').textContent = this.formatCurrency(costPerCredit);
            this.$('#totalCredits').textContent = credits.toLocaleString();
            this.$('#totalCost').textContent = this.formatCurrency(totalCost);

            // Update pricing suggestions
            this.$$('.pricing-option').forEach(option => {
                const markup = parseFloat(option.dataset.markup);
                const suggestedPrice = costPerCredit * markup;
                const markupPercent = ((markup - 1) * 100).toFixed(0);
                option.textContent = `${this.formatCurrency(suggestedPrice)} (${markupPercent}% markup)`;
            });

            calculator.style.display = 'block';
        } else {
            calculator.style.display = 'none';
        }
    }

    async handleSubmit(event) {
        event.preventDefault();

        const submitBtn = this.$('button[type="submit"]');
        const originalText = submitBtn.textContent;

        try {
            submitBtn.textContent = '⏳ Recording Purchase...';
            submitBtn.disabled = true;

            const formData = new FormData(event.target);
            const purchaseData = {
                vendorID: formData.get('vendorID'),
                serviceName: formData.get('serviceName'),
                purchaseDate: formData.get('purchaseDate'),
                credits: formData.get('credits'),
                priceUSD: formData.get('priceUSD'),
                notes: formData.get('notes')
            };

            // Validate data
            if (this.options.validateOnSubmit) {
                const validation = this.validatePurchaseData(purchaseData);
                if (!validation.isValid) {
                    throw new Error(validation.errors.join('\n'));
                }
            }

            // Submit to API
            const response = await fetch('/api/vendor-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(purchaseData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to record credit purchase');
            }

            // Success
            console.log('✅ Credit purchase recorded successfully:', result);

            if (this.options.resetOnSuccess) {
                this.resetForm();
            }

            // Refresh recent purchases
            if (this.options.showRecentPurchases) {
                await this.loadRecentPurchases();
                this.updateRecentPurchasesDisplay();
            }

            this.showSuccessMessage(`Successfully purchased ${purchaseData.credits} credits for ${this.formatCurrency(purchaseData.priceUSD)}!`);
            this.emit('creditsPurchased', { purchase: result });

        } catch (error) {
            console.error('❌ Error recording credit purchase:', error);
            this.showErrorMessage(error.message);
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    validatePurchaseData(data) {
        const errors = [];

        // Vendor validation
        if (!data.vendorID) {
            errors.push('Please select a vendor');
        }

        // Service validation
        if (!data.serviceName) {
            errors.push('Please select a service');
        }

        // Date validation
        if (!data.purchaseDate) {
            errors.push('Purchase date is required');
        } else {
            const purchaseDate = new Date(data.purchaseDate);
            const today = new Date();
            const maxFutureDate = new Date();
            maxFutureDate.setMonth(maxFutureDate.getMonth() + 1);

            if (purchaseDate > maxFutureDate) {
                errors.push('Purchase date cannot be more than 1 month in the future');
            }
        }

        // Credits validation
        const credits = parseInt(data.credits);
        if (!data.credits || isNaN(credits) || credits <= 0) {
            errors.push('Number of credits must be a positive number');
        } else if (credits > 1000000) {
            errors.push('Credits cannot exceed 1,000,000');
        }

        // Price validation
        const price = parseFloat(data.priceUSD);
        if (!data.priceUSD || isNaN(price) || price <= 0) {
            errors.push('Price must be greater than $0');
        } else if (price > 1000000) {
            errors.push('Price seems unusually high (max $1,000,000)');
        }

        // Notes validation (optional)
        if (data.notes && data.notes.length > 500) {
            errors.push('Notes cannot exceed 500 characters');
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
                    errorMessage = 'Please select a service';
                }
                break;
            case 'credits':
                const credits = parseInt(value);
                if (!value || isNaN(credits) || credits <= 0) {
                    isValid = false;
                    errorMessage = 'Credits must be a positive number';
                } else if (credits > 1000000) {
                    isValid = false;
                    errorMessage = 'Credits cannot exceed 1,000,000';
                }
                break;
            case 'priceUSD':
                const price = parseFloat(value);
                if (!value || isNaN(price) || price <= 0) {
                    isValid = false;
                    errorMessage = 'Price must be greater than $0';
                } else if (price > 1000000) {
                    isValid = false;
                    errorMessage = 'Price seems unusually high';
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

    showPreview() {
        const formData = this.getFormData();

        if (!formData.vendorID || !formData.serviceName || !formData.credits || !formData.priceUSD) {
            this.showErrorMessage('Please fill in all required fields before previewing');
            return;
        }

        const vendorName = this.$('.purchase-vendor-select').options[this.$('.purchase-vendor-select').selectedIndex].dataset.vendorName;
        const costPerCredit = parseFloat(formData.priceUSD) / parseInt(formData.credits);

        const modal = WidgetManager.getWidget('confirmation-modal');
        if (modal) {
            modal.show({
                title: 'Purchase Preview',
                message: this.getPreviewContent(formData, vendorName, costPerCredit),
                confirmText: 'Confirm Purchase',
                onConfirm: () => this.handleSubmit({ preventDefault: () => { } })
            });
        }
    }

    getPreviewContent(data, vendorName, costPerCredit) {
        return `
            <div class="purchase-preview">
                <strong>Vendor:</strong> ${vendorName}<br>
                <strong>Service:</strong> ${data.serviceName}<br>
                <strong>Credits:</strong> ${parseInt(data.credits).toLocaleString()}<br>
                <strong>Total Cost:</strong> ${this.formatCurrency(data.priceUSD)}<br>
                <strong>Cost per Credit:</strong> ${this.formatCurrency(costPerCredit)}<br>
                <strong>Purchase Date:</strong> ${this.formatDate(data.purchaseDate)}<br>
                ${data.notes ? `<strong>Notes:</strong> ${data.notes}` : ''}
            </div>
        `;
    }

    resetForm() {
        const form = this.$('.purchase-credits-form');
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

            // Hide displays
            this.hideVendorInfo();
            this.hideServiceInfo();
            this.clearServices();

            const calculator = this.$('.cost-calculator');
            if (calculator) {
                calculator.style.display = 'none';
            }

            // Reset to preload values if specified
            if (this.preloadVendorId) {
                const vendorSelect = this.$('.purchase-vendor-select');
                if (vendorSelect) {
                    vendorSelect.value = this.preloadVendorId;
                    this.handleVendorSelect(vendorSelect);
                }
            }

            // Set today's date
            const today = new Date().toISOString().split('T')[0];
            this.$('input[name="purchaseDate"]').value = today;
        }
    }

    updateRecentPurchasesDisplay() {
        const listContainer = this.$('.recent-purchases-list');
        if (listContainer) {
            listContainer.innerHTML = this.getRecentPurchasesListTemplate();
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

        const form = this.$('.purchase-credits-form');
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

    setVendorAndService(vendorId, serviceName) {
        this.preloadVendorId = vendorId;
        this.preloadServiceName = serviceName;

        const vendorSelect = this.$('.purchase-vendor-select');
        if (vendorSelect) {
            vendorSelect.value = vendorId;
            this.handleVendorSelect(vendorSelect);
        }
    }

    getFormData() {
        const form = this.$('.purchase-credits-form');
        if (form) {
            const formData = new FormData(form);
            return {
                vendorID: formData.get('vendorID'),
                serviceName: formData.get('serviceName'),
                purchaseDate: formData.get('purchaseDate'),
                credits: formData.get('credits'),
                priceUSD: formData.get('priceUSD'),
                notes: formData.get('notes')
            };
        }
        return null;
    }
}

window.PurchaseCreditsWidget = PurchaseCreditsWidget;
