class WithdrawMoneyWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.currentBalance = 0;
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            resetOnSuccess: true,
            validateOnSubmit: true,
            showBalanceWarning: true,
            showPurposeField: true,
            requireConfirmation: true,
            maxWithdrawal: null // null for no limit
        };
    }

    async loadData() {
        try {
            this.log('Loading current business balance...');
            const response = await fetch('/api/business/transactions');
            if (response.ok) {
                const data = await response.json();
                this.currentBalance = data.balance || 0;
                this.log(`Current balance: ${this.formatCurrency(this.currentBalance)}`);
            }
        } catch (error) {
            console.error('Failed to load current balance:', error);
        }
    }

    async getTemplate() {
        const today = new Date().toISOString().split('T')[0];
        const maxWithdrawal = this.options.maxWithdrawal || this.currentBalance;

        return `
            <div class="business-form-section">
                <h3>💸 Withdraw Money from Business</h3>
                <div class="form-description">
                    Record money being withdrawn from the business account for various purposes.
                </div>
                
                ${this.options.showBalanceWarning ? this.getBalanceWarningTemplate() : ''}
                
                <form class="withdraw-money-form">
                    <div class="form-group">
                        <label>💵 Amount ($):</label>
                        <input type="number" name="amount" step="0.01" min="0" 
                               max="${maxWithdrawal}" required
                               class="amount-input" placeholder="0.00">
                        
                        <div class="withdrawal-limits">
                            <small>
                                Maximum available: ${this.formatCurrency(this.currentBalance)}
                                ${this.options.maxWithdrawal ? ` | Daily limit: ${this.formatCurrency(this.options.maxWithdrawal)}` : ''}
                            </small>
                        </div>
                        
                        <div class="balance-after" style="display: none;">
                            <div class="balance-after-content"></div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>📅 Date:</label>
                        <input type="date" name="date" value="${today}" required>
                        <small>The date when the money was withdrawn from the business</small>
                    </div>
                    
                    ${this.options.showPurposeField ? this.getPurposeFieldTemplate() : ''}
                    
                    <div class="form-group">
                        <label>📝 Description:</label>
                        <input type="text" name="description" maxlength="200" required
                               placeholder="Purpose of withdrawal (e.g., personal draw, business expense, loan repayment)">
                        <div class="character-count">0/200 characters</div>
                        <small>Brief description of why money is being withdrawn</small>
                    </div>
                    
                    <div class="form-preview" style="display: none;">
                        <h5>Withdrawal Preview:</h5>
                        <div class="preview-content"></div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn-danger">💸 Withdraw Money</button>
                        <button type="button" class="btn-secondary reset-form-btn">Reset</button>
                        <button type="button" class="btn-info preview-withdrawal-btn">Preview</button>
                    </div>
                </form>
            </div>
        `;
    }

    getBalanceWarningTemplate() {
        const balanceClass = this.currentBalance <= 0 ? 'insufficient' :
            this.currentBalance < 1000 ? 'low' : 'sufficient';

        return `
            <div class="balance-warning ${balanceClass}">
                <div class="warning-icon">${this.getBalanceIcon()}</div>
                <div class="warning-content">
                    <div class="current-balance">
                        Current Balance: ${this.formatCurrency(this.currentBalance)}
                    </div>
                    <div class="balance-status">
                        ${this.getBalanceStatusMessage()}
                    </div>
                </div>
            </div>
        `;
    }

    getPurposeFieldTemplate() {
        return `
            <div class="form-group">
                <label>💼 Purpose Category:</label>
                <select name="purpose" class="purpose-select">
                    <option value="">Select purpose type (optional)</option>
                    <option value="personal">Personal Draw</option>
                    <option value="expense">Business Expense</option>
                    <option value="investment">Business Investment</option>
                    <option value="loan_repayment">Loan Repayment</option>
                    <option value="tax">Tax Payment</option>
                    <option value="equipment">Equipment Purchase</option>
                    <option value="other">Other</option>
                </select>
            </div>
        `;
    }

    getBalanceIcon() {
        if (this.currentBalance <= 0) return '🔴';
        if (this.currentBalance < 1000) return '🟡';
        return '🟢';
    }

    getBalanceStatusMessage() {
        if (this.currentBalance <= 0) {
            return 'Insufficient funds - withdrawals not available';
        } else if (this.currentBalance < 1000) {
            return 'Low balance - consider your withdrawal carefully';
        }
        return 'Sufficient funds available for withdrawal';
    }

    bindEvents() {
        const form = this.$('.withdraw-money-form');
        if (form) {
            this.addEventListener(form, 'submit', (e) => this.handleSubmit(e));
        }

        // Amount input changes
        const amountInput = this.$('.amount-input');
        if (amountInput) {
            this.addEventListener(amountInput, 'input', () => this.updateBalanceAfter());
        }

        // Reset button
        const resetBtn = this.$('.reset-form-btn');
        if (resetBtn) {
            this.addEventListener(resetBtn, 'click', () => this.resetForm());
        }

        // Preview button
        const previewBtn = this.$('.preview-withdrawal-btn');
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

    updateBalanceAfter() {
        const amountInput = this.$('.amount-input');
        const balanceAfterDiv = this.$('.balance-after');
        const balanceAfterContent = this.$('.balance-after-content');

        if (!amountInput || !balanceAfterDiv || !balanceAfterContent) return;

        const amount = parseFloat(amountInput.value) || 0;

        if (amount > 0) {
            const balanceAfter = this.currentBalance - amount;
            const isNegative = balanceAfter < 0;
            const isLow = balanceAfter < 1000 && balanceAfter >= 0;

            balanceAfterContent.innerHTML = `
                <div class="balance-after-item ${isNegative ? 'negative' : isLow ? 'warning' : 'positive'}">
                    ${isNegative ? '⚠️' : isLow ? '🟡' : '✅'}
                    Balance after withdrawal: ${this.formatCurrency(balanceAfter)}
                    ${isNegative ? ' (Overdraft!)' : isLow ? ' (Low balance)' : ''}
                </div>
            `;
            balanceAfterDiv.style.display = 'block';
        } else {
            balanceAfterDiv.style.display = 'none';
        }
    }

    updatePreview() {
        const formData = this.getFormData();
        const previewDiv = this.$('.form-preview');
        const previewContent = this.$('.preview-content');

        if (!previewDiv || !previewContent) return;

        if (formData.amount && parseFloat(formData.amount) > 0) {
            const amount = parseFloat(formData.amount);
            const purpose = formData.purpose || 'Unspecified';
            const description = formData.description || 'Money withdrawn from business';
            const balanceAfter = this.currentBalance - amount;

            previewContent.innerHTML = `
                <div class="preview-transaction">
                    <div class="preview-item">
                        <strong>Amount:</strong> ${this.formatCurrency(amount)}
                    </div>
                    <div class="preview-item">
                        <strong>Date:</strong> ${this.formatDate(formData.date)}
                    </div>
                    <div class="preview-item">
                        <strong>Purpose:</strong> ${purpose}
                    </div>
                    <div class="preview-item">
                        <strong>Description:</strong> ${this.escapeHtml(description)}
                    </div>
                    <div class="preview-item balance-preview ${balanceAfter < 0 ? 'negative' : ''}">
                        <strong>Balance After:</strong> ${this.formatCurrency(balanceAfter)}
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

        const validation = this.validateFormData(formData);
        if (!validation.isValid) {
            this.showErrorMessage('Please fill in all required fields correctly');
            return;
        }

        const modal = WidgetManager.getWidget('confirmation-modal');
        if (modal) {
            modal.show({
                title: 'Withdrawal Confirmation',
                message: this.getConfirmationContent(formData),
                icon: '💸',
                confirmText: 'Withdraw Money',
                confirmClass: 'btn-danger',
                onConfirm: () => this.handleSubmit({ preventDefault: () => { } })
            });
        }
    }

    getConfirmationContent(data) {
        const amount = parseFloat(data.amount);
        const balanceAfter = this.currentBalance - amount;

        return `
            <div class="confirmation-content">
                <p><strong>You are about to withdraw ${this.formatCurrency(amount)} from the business.</strong></p>
                <div class="confirmation-details">
                    <div><strong>Current Balance:</strong> ${this.formatCurrency(this.currentBalance)}</div>
                    <div><strong>Withdrawal Amount:</strong> ${this.formatCurrency(amount)}</div>
                    <div class="${balanceAfter < 0 ? 'text-danger' : ''}">
                        <strong>Balance After:</strong> ${this.formatCurrency(balanceAfter)}
                    </div>
                    <div><strong>Date:</strong> ${this.formatDate(data.date)}</div>
                    ${data.purpose ? `<div><strong>Purpose:</strong> ${data.purpose}</div>` : ''}
                    <div><strong>Description:</strong> ${data.description}</div>
                </div>
                ${balanceAfter < 0 ? '<p class="text-danger"><strong>Warning:</strong> This will cause an overdraft!</p>' : ''}
                <p>This action cannot be undone.</p>
            </div>
        `;
    }

    async handleSubmit(event) {
        event.preventDefault();

        // Check if balance is sufficient
        if (this.currentBalance <= 0) {
            this.showErrorMessage('Cannot withdraw money - insufficient balance');
            return;
        }

        const submitBtn = this.$('button[type="submit"]');
        const originalText = submitBtn.textContent;

        try {
            submitBtn.textContent = '⏳ Processing Withdrawal...';
            submitBtn.disabled = true;

            const formData = this.getFormData();

            // Validate data
            const validation = this.validateFormData(formData);
            if (!validation.isValid) {
                throw new Error(validation.errors.join('\n'));
            }

            // Additional balance check
            const amount = parseFloat(formData.amount);
            if (amount > this.currentBalance && !this.options.allowOverdraft) {
                throw new Error('Withdrawal amount exceeds available balance');
            }

            // Submit to API
            const response = await fetch('/api/business/withdraw-money', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to withdraw money');
            }

            // Success
            console.log('✅ Money withdrawn successfully:', result);

            // Update current balance
            this.currentBalance -= amount;

            if (this.options.resetOnSuccess) {
                this.resetForm();
            }

            this.showSuccessMessage(`Successfully withdrew ${this.formatCurrency(formData.amount)} from business!`);
            this.emit('moneyWithdrawn', { amount: parseFloat(formData.amount), transaction: result });

        } catch (error) {
            console.error('❌ Error withdrawing money:', error);
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
        } else if (amount > this.currentBalance) {
            errors.push('Withdrawal amount cannot exceed available balance');
        } else if (this.options.maxWithdrawal && amount > this.options.maxWithdrawal) {
            errors.push(`Amount cannot exceed daily withdrawal limit of ${this.formatCurrency(this.options.maxWithdrawal)}`);
        }

        // Date validation
        if (!data.date) {
            errors.push('Date is required');
        } else {
            const inputDate = new Date(data.date);
            const today = new Date();
            const maxFutureDate = new Date();
            maxFutureDate.setDate(maxFutureDate.getDate() + 7);

            if (inputDate > maxFutureDate) {
                errors.push('Date cannot be more than a week in the future');
            }

            const minPastDate = new Date();
            minPastDate.setFullYear(minPastDate.getFullYear() - 5);
            if (inputDate < minPastDate) {
                errors.push('Date cannot be more than 5 years in the past');
            }
        }

        // Description validation
        if (!data.description || data.description.trim().length < 3) {
            errors.push('Description is required and must be at least 3 characters');
        } else if (data.description.length > 200) {
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
                } else if (amount > this.currentBalance) {
                    isValid = false;
                    errorMessage = 'Amount exceeds available balance';
                } else if (this.options.maxWithdrawal && amount > this.options.maxWithdrawal) {
                    isValid = false;
                    errorMessage = 'Amount exceeds withdrawal limit';
                }
                break;
            case 'date':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Date is required';
                }
                break;
            case 'description':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Description is required';
                } else if (value.length < 3) {
                    isValid = false;
                    errorMessage = 'Description must be at least 3 characters';
                } else if (value.length > 200) {
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
        const form = this.$('.withdraw-money-form');
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

            // Hide previews
            const previewDiv = this.$('.form-preview');
            const balanceAfterDiv = this.$('.balance-after');
            if (previewDiv) previewDiv.style.display = 'none';
            if (balanceAfterDiv) balanceAfterDiv.style.display = 'none';

            // Set today's date
            const today = new Date().toISOString().split('T')[0];
            this.$('input[name="date"]').value = today;
        }
    }

    getFormData() {
        const form = this.$('.withdraw-money-form');
        if (form) {
            const formData = new FormData(form);
            return {
                amount: formData.get('amount'),
                date: formData.get('date'),
                description: formData.get('description'),
                purpose: formData.get('purpose')
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

        const form = this.$('.withdraw-money-form');
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

    updateBalance(newBalance) {
        this.currentBalance = newBalance;
        this.render();
    }

    getCurrentBalance() {
        return this.currentBalance;
    }

    setMaxWithdrawal(amount) {
        this.options.maxWithdrawal = amount;
        const amountInput = this.$('.amount-input');
        if (amountInput) {
            amountInput.setAttribute('max', amount);
        }
    }
}

window.WithdrawMoneyWidget = WithdrawMoneyWidget;
