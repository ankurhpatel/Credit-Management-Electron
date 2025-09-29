class AddMoneyWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            resetOnSuccess: true,
            validateOnSubmit: true,
            showPresetAmounts: true,
            showSourceField: true,
            autoFocusAmount: true
        };
    }

    async getTemplate() {
        const today = new Date().toISOString().split('T')[0];

        return `
            <div class="business-form-section">
                <h3>💰 Add Money to Business</h3>
                <div class="form-description">
                    Record money being added to the business account from various sources.
                </div>
                
                <form class="add-money-form">
                    <div class="form-group">
                        <label>💵 Amount ($):</label>
                        <input type="number" name="amount" step="0.01" min="0" required
                               class="amount-input" placeholder="0.00"
                               ${this.options.autoFocusAmount ? 'autofocus' : ''}>
                        
                        ${this.options.showPresetAmounts ? this.getPresetAmountsTemplate() : ''}
                    </div>
                    
                    <div class="form-group">
                        <label>📅 Date:</label>
                        <input type="date" name="date" value="${today}" required>
                        <small>The date when the money was added to the business</small>
                    </div>
                    
                    ${this.options.showSourceField ? this.getSourceFieldTemplate() : ''}
                    
                    <div class="form-group">
                        <label>📝 Description:</label>
                        <input type="text" name="description" maxlength="200" 
                               placeholder="Source of money (e.g., personal investment, loan, revenue)">
                        <div class="character-count">0/200 characters</div>
                        <small>Brief description of where this money came from</small>
                    </div>
                    
                    <div class="form-preview" style="display: none;">
                        <h5>Transaction Preview:</h5>
                        <div class="preview-content"></div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn-success">💰 Add Money</button>
                        <button type="button" class="btn-secondary reset-form-btn">Reset</button>
                        <button type="button" class="btn-info preview-transaction-btn">Preview</button>
                    </div>
                </form>
            </div>
        `;
    }

    getPresetAmountsTemplate() {
        const presetAmounts = [100, 500, 1000, 2500, 5000, 10000];

        return `
            <div class="preset-amounts">
                <small>Quick amounts:</small>
                <div class="preset-buttons">
                    ${presetAmounts.map(amount => `
                        <button type="button" class="preset-btn" data-amount="${amount}">
                            $${amount.toLocaleString()}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    getSourceFieldTemplate() {
        return `
            <div class="form-group">
                <label>💼 Source Category:</label>
                <select name="source" class="source-select">
                    <option value="">Select source type (optional)</option>
                    <option value="personal">Personal Investment</option>
                    <option value="loan">Business Loan</option>
                    <option value="revenue">Business Revenue</option>
                    <option value="refund">Refund/Return</option>
                    <option value="grant">Grant/Award</option>
                    <option value="other">Other</option>
                </select>
            </div>
        `;
    }

    bindEvents() {
        const form = this.$('.add-money-form');
        if (form) {
            this.addEventListener(form, 'submit', (e) => this.handleSubmit(e));
        }

        // Preset amount buttons
        this.$$('.preset-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const amount = e.target.getAttribute('data-amount');
                this.setAmount(amount);
            });
        });

        // Reset button
        const resetBtn = this.$('.reset-form-btn');
        if (resetBtn) {
            this.addEventListener(resetBtn, 'click', () => this.resetForm());
        }

        // Preview button
        const previewBtn = this.$('.preview-transaction-btn');
        if (previewBtn) {
            this.addEventListener(previewBtn, 'click', () => this.showPreview());
        }

        // Character counter for description
        const descriptionField = this.$('input[name="description"]');
        const charCount = this.$('.character-count');
        if (descriptionField && charCount) {
            this.addEventListener(descriptionField, 'input', (e) => {
                const length = e.target.value.length;
                charCount.textContent = `${length}/200 characters`;
                charCount.style.color = length > 180 ? '#e53e3e' : '#718096';
            });
        }

        // Real-time preview updates
        const inputs = this.$$('input, select');
        inputs.forEach(input => {
            this.addEventListener(input, 'input', () => this.updatePreview());
        });

        // Real-time validation
        if (this.options.validateOnSubmit) {
            inputs.forEach(input => {
                this.addEventListener(input, 'blur', (e) => this.validateField(e.target));
            });
        }
    }

    setAmount(amount) {
        const amountInput = this.$('.amount-input');
        if (amountInput) {
            amountInput.value = amount;
            amountInput.focus();
            this.updatePreview();
        }
    }

    updatePreview() {
        const formData = this.getFormData();
        const previewDiv = this.$('.form-preview');
        const previewContent = this.$('.preview-content');

        if (!previewDiv || !previewContent) return;

        if (formData.amount && parseFloat(formData.amount) > 0) {
            const amount = parseFloat(formData.amount);
            const source = formData.source || 'Unspecified';
            const description = formData.description || 'Money added to business';

            previewContent.innerHTML = `
                <div class="preview-transaction">
                    <div class="preview-item">
                        <strong>Amount:</strong> ${this.formatCurrency(amount)}
                    </div>
                    <div class="preview-item">
                        <strong>Date:</strong> ${this.formatDate(formData.date)}
                    </div>
                    <div class="preview-item">
                        <strong>Source:</strong> ${source}
                    </div>
                    <div class="preview-item">
                        <strong>Description:</strong> ${this.escapeHtml(description)}
                    </div>
                </div>
            `;
            previewDiv.style.display = 'block';
        } else {
            previewDiv.style.display = 'none';
        }
    }

    showPreview() {
        const formData = this.getFormData();

        if (!this.validateFormData(formData).isValid) {
            this.showErrorMessage('Please fill in all required fields correctly');
            return;
        }

        const modal = WidgetManager.getWidget('confirmation-modal');
        if (modal) {
            modal.show({
                title: 'Add Money Confirmation',
                message: this.getConfirmationContent(formData),
                icon: '💰',
                confirmText: 'Add Money',
                confirmClass: 'btn-success',
                onConfirm: () => this.handleSubmit({ preventDefault: () => { } })
            });
        }
    }

    getConfirmationContent(data) {
        const amount = parseFloat(data.amount);
        return `
            <div class="confirmation-content">
                <p><strong>You are about to add ${this.formatCurrency(amount)} to the business.</strong></p>
                <div class="confirmation-details">
                    <div><strong>Date:</strong> ${this.formatDate(data.date)}</div>
                    ${data.source ? `<div><strong>Source:</strong> ${data.source}</div>` : ''}
                    <div><strong>Description:</strong> ${data.description || 'Money added to business'}</div>
                </div>
                <p>This will increase the business balance.</p>
            </div>
        `;
    }

    async handleSubmit(event) {
        event.preventDefault();

        const submitBtn = this.$('button[type="submit"]');
        const originalText = submitBtn.textContent;

        try {
            submitBtn.textContent = '⏳ Adding Money...';
            submitBtn.disabled = true;

            const formData = this.getFormData();

            // Validate data
            const validation = this.validateFormData(formData);
            if (!validation.isValid) {
                throw new Error(validation.errors.join('\n'));
            }

            // Submit to API
            const response = await fetch('/api/business/add-money', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to add money');
            }

            // Success
            console.log('✅ Money added successfully:', result);

            if (this.options.resetOnSuccess) {
                this.resetForm();
            }

            this.showSuccessMessage(`Successfully added ${this.formatCurrency(formData.amount)} to business!`);
            this.emit('moneyAdded', { amount: parseFloat(formData.amount), transaction: result });

        } catch (error) {
            console.error('❌ Error adding money:', error);
            this.showErrorMessage(error.message);
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    validateFormData(data) {
        const errors = [];

        // Amount validation
        const amount = parseFloat(data.amount);
        if (!data.amount || isNaN(amount) || amount <= 0) {
            errors.push('Amount must be greater than $0');
        } else if (amount > 1000000) {
            errors.push('Amount seems unusually high (max $1,000,000)');
        }

        // Date validation
        if (!data.date) {
            errors.push('Date is required');
        } else {
            const inputDate = new Date(data.date);
            const today = new Date();
            const maxFutureDate = new Date();
            maxFutureDate.setDate(maxFutureDate.getDate() + 7); // Allow up to 1 week in future

            if (inputDate > maxFutureDate) {
                errors.push('Date cannot be more than a week in the future');
            }

            // Check if date is too far in the past
            const minPastDate = new Date();
            minPastDate.setFullYear(minPastDate.getFullYear() - 5);
            if (inputDate < minPastDate) {
                errors.push('Date cannot be more than 5 years in the past');
            }
        }

        // Description validation (optional but limited)
        if (data.description && data.description.length > 200) {
            errors.push('Description cannot exceed 200 characters');
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
            case 'amount':
                const amount = parseFloat(value);
                if (!value || isNaN(amount) || amount <= 0) {
                    isValid = false;
                    errorMessage = 'Amount must be greater than $0';
                } else if (amount > 1000000) {
                    isValid = false;
                    errorMessage = 'Amount seems unusually high';
                }
                break;
            case 'date':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Date is required';
                }
                break;
            case 'description':
                if (value.length > 200) {
                    isValid = false;
                    errorMessage = 'Description cannot exceed 200 characters';
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
        const form = this.$('.add-money-form');
        if (form) {
            form.reset();

            // Clear validation errors
            this.$$('.error').forEach(el => el.classList.remove('error'));
            this.$$('.field-error').forEach(el => el.remove());

            // Reset character counter
            const charCount = this.$('.character-count');
            if (charCount) {
                charCount.textContent = '0/200 characters';
                charCount.style.color = '#718096';
            }

            // Hide preview
            const previewDiv = this.$('.form-preview');
            if (previewDiv) {
                previewDiv.style.display = 'none';
            }

            // Set today's date
            const today = new Date().toISOString().split('T')[0];
            this.$('input[name="date"]').value = today;

            // Focus amount input if enabled
            if (this.options.autoFocusAmount) {
                const amountInput = this.$('.amount-input');
                if (amountInput) {
                    amountInput.focus();
                }
            }
        }
    }

    getFormData() {
        const form = this.$('.add-money-form');
        if (form) {
            const formData = new FormData(form);
            return {
                amount: formData.get('amount'),
                date: formData.get('date'),
                description: formData.get('description'),
                source: formData.get('source')
            };
        }
        return null;
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

        const form = this.$('.add-money-form');
        if (form) {
            form.insertBefore(messageEl, form.firstChild);

            // Auto-hide after 5 seconds
            setTimeout(() => {
                messageEl.remove();
            }, 5000);
        }
    }

    // Public API
    setFormData(data) {
        if (data.amount) this.$('input[name="amount"]').value = data.amount;
        if (data.date) this.$('input[name="date"]').value = data.date;
        if (data.description) this.$('input[name="description"]').value = data.description;
        if (data.source) this.$('select[name="source"]').value = data.source;
        this.updatePreview();
    }

    focusAmount() {
        const amountInput = this.$('.amount-input');
        if (amountInput) {
            amountInput.focus();
        }
    }
}

window.AddMoneyWidget = AddMoneyWidget;
