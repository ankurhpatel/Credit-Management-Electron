// Form handling and validation
class Forms {
    static initialize() {
        console.log('📝 Initializing form system...');

        // Set default dates
        this.setDefaultDates();

        // Setup form event handlers
        this.setupFormHandlers();

        console.log('✅ Form system initialized');
    }

    static setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        document.querySelectorAll('input[type="date"]').forEach(input => {
            if (!input.value && input.name !== 'expirationDate') {
                input.value = today;
            }
        });
    }

    static setupFormHandlers() {
        // Customer form
        const customerForm = document.querySelector('form[onsubmit*="addCustomer"]');
        if (customerForm) {
            customerForm.addEventListener('submit', this.handleAddCustomer);
        }

        // Vendor form
        const vendorForm = document.querySelector('form[onsubmit*="addVendor"]');
        if (vendorForm) {
            vendorForm.addEventListener('submit', this.handleAddVendor);
        }

        // Subscription form
        const subscriptionForm = document.querySelector('form[onsubmit*="addSubscription"]');
        if (subscriptionForm) {
            subscriptionForm.addEventListener('submit', this.handleAddSubscription);
        }

        // Vendor service form
        const serviceForm = document.querySelector('form[onsubmit*="addVendorService"]');
        if (serviceForm) {
            serviceForm.addEventListener('submit', this.handleAddVendorService);
        }

        // Credit purchase form
        const creditForm = document.querySelector('form[onsubmit*="purchaseCredits"]');
        if (creditForm) {
            creditForm.addEventListener('submit', this.handlePurchaseCredits);
        }

        // Business money forms
        const addMoneyForm = document.querySelector('form[onsubmit*="addBusinessMoney"]');
        if (addMoneyForm) {
            addMoneyForm.addEventListener('submit', this.handleAddBusinessMoney);
        }

        const withdrawForm = document.querySelector('form[onsubmit*="withdrawBusinessMoney"]');
        if (withdrawForm) {
            withdrawForm.addEventListener('submit', this.handleWithdrawBusinessMoney);
        }

        // P&L forms
        const monthlyPLForm = document.querySelector('form[onsubmit*="loadMonthlyPL"]');
        if (monthlyPLForm) {
            monthlyPLForm.addEventListener('submit', this.handleLoadMonthlyPL);
        }

        const yearlyPLForm = document.querySelector('form[onsubmit*="loadYearlyPL"]');
        if (yearlyPLForm) {
            yearlyPLForm.addEventListener('submit', this.handleLoadYearlyPL);
        }

        // Setup vendor service dropdown change handler
        const vendorServiceSelect = document.getElementById('vendorServiceSelectSub');
        if (vendorServiceSelect) {
            vendorServiceSelect.addEventListener('change', this.handleVendorServiceChange);
        }
    }

    // Form handlers
    static async handleAddCustomer(event) {
        event.preventDefault();
        const formData = new FormData(event.target);

        const customerData = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            address: formData.get('address')
        };

        try {
            await CustomersAPI.add(customerData);
            event.target.reset();
        } catch (error) {
            // Error already handled in CustomersAPI
        }
    }

    static async handleAddVendor(event) {
        event.preventDefault();
        const formData = new FormData(event.target);

        const vendorData = {
            name: formData.get('name'),
            contactEmail: formData.get('contactEmail'),
            contactPhone: formData.get('contactPhone'),
            description: formData.get('description')
        };

        try {
            await VendorsAPI.add(vendorData);
            event.target.reset();
        } catch (error) {
            // Error already handled in VendorsAPI
        }
    }

    static async handleAddSubscription(event) {
        event.preventDefault();
        console.log('📝 Processing subscription form submission...');
        
        try {
            const formData = new FormData(event.target);
            
            // Get vendor ID from the selected service
            const vendorServiceSelect = document.getElementById('vendorServiceSelectSub');
            const selectedOption = vendorServiceSelect?.options[vendorServiceSelect.selectedIndex];
            const vendorID = selectedOption?.dataset.vendorId || '';
            
            console.log('Form data collected:', {
                customerID: formData.get('customerID'),
                serviceName: formData.get('serviceName'),
                vendorServiceName: formData.get('vendorServiceName'),
                vendorID: vendorID,
                startDate: formData.get('startDate'),
                creditsSelected: formData.get('creditsSelected'),
                amountPaid: formData.get('amountPaid')
            });

            const subscriptionData = {
                customerID: formData.get('customerID'),
                serviceName: formData.get('serviceName'),
                startDate: formData.get('startDate'),
                creditsSelected: formData.get('creditsSelected'),
                amountPaid: formData.get('amountPaid'),
                status: formData.get('status') || 'active',
                vendorID: vendorID,
                vendorServiceName: formData.get('vendorServiceName'),
                notes: formData.get('notes') || '',
                classification: formData.get('classification') || ''
            };

            // Validate required fields
            if (!subscriptionData.customerID) {
                throw new Error('Please select a customer');
            }
            
            if (!subscriptionData.vendorServiceName) {
                throw new Error('Please select a vendor service');
            }
            
            if (!subscriptionData.startDate) {
                throw new Error('Please select a start date');
            }
            
            if (!subscriptionData.creditsSelected || parseInt(subscriptionData.creditsSelected) <= 0) {
                throw new Error('Please enter a valid number of credits');
            }
            
            if (!subscriptionData.amountPaid || parseFloat(subscriptionData.amountPaid) <= 0) {
                throw new Error('Please enter a valid payment amount');
            }

            await SubscriptionsAPI.add(subscriptionData);
            
            // Reset form on success
            event.target.reset();
            document.getElementById('selectedCustomerID').value = '';
            document.getElementById('customerSearchInput').value = '';
            
            console.log('✅ Subscription added successfully');
        } catch (error) {
            console.error('❌ Error in handleAddSubscription:', error);
            // Error already handled in SubscriptionsAPI or thrown here
        }
    }

    static handleVendorServiceChange(event) {
        const select = event.target;
        const selectedOption = select.options[select.selectedIndex];
        
        if (selectedOption && selectedOption.dataset.vendorId) {
            console.log('Vendor service selected:', {
                serviceName: selectedOption.value,
                vendorId: selectedOption.dataset.vendorId,
                vendorName: selectedOption.dataset.vendorName
            });
        }
    }

    static async handleAddVendorService(event) {
        event.preventDefault();
        const formData = new FormData(event.target);

        const serviceData = {
            vendorID: formData.get('vendorID'),
            serviceName: formData.get('serviceName'),
            description: formData.get('description')
        };

        try {
            await VendorsAPI.addService(serviceData);
            event.target.reset();
        } catch (error) {
            // Error already handled in VendorsAPI
        }
    }

    static async handlePurchaseCredits(event) {
        event.preventDefault();
        const formData = new FormData(event.target);

        const purchaseData = {
            vendorID: formData.get('vendorID'),
            serviceName: formData.get('serviceName'),
            purchaseDate: formData.get('purchaseDate'),
            credits: formData.get('credits'),
            priceUSD: formData.get('priceUSD'),
            notes: formData.get('notes')
        };

        try {
            await CreditsAPI.purchaseCredits(purchaseData);
            event.target.reset();
        } catch (error) {
            // Error already handled in CreditsAPI
        }
    }

    static async handleAddBusinessMoney(event) {
        event.preventDefault();
        const formData = new FormData(event.target);

        const transactionData = {
            amount: formData.get('amount'),
            date: formData.get('date'),
            description: formData.get('description')
        };

        try {
            await BusinessAPI.addMoney(transactionData);
            event.target.reset();
        } catch (error) {
            // Error already handled in BusinessAPI
        }
    }

    static async handleWithdrawBusinessMoney(event) {
        event.preventDefault();
        const formData = new FormData(event.target);

        const transactionData = {
            amount: formData.get('amount'),
            date: formData.get('date'),
            description: formData.get('description')
        };

        try {
            await BusinessAPI.withdrawMoney(transactionData);
            event.target.reset();
        } catch (error) {
            // Error already handled in BusinessAPI
        }
    }

    static async handleLoadMonthlyPL(event) {
        event.preventDefault();
        const month = document.getElementById('selectMonth').value;
        const year = document.getElementById('selectYear').value;

        try {
            const result = await PLReportsAPI.loadMonthly(month, year);
            ReportUI.displayMonthlyPL(result, month, year);
        } catch (error) {
            // Error already handled in PLReportsAPI
        }
    }

    static async handleLoadYearlyPL(event) {
        event.preventDefault();
        const year = document.getElementById('selectYearOnly').value;

        try {
            const result = await PLReportsAPI.loadYearly(year);
            ReportUI.displayYearlyPL(result, year);
        } catch (error) {
            // Error already handled in PLReportsAPI
        }
    }

    static calculateExpirationDate() {
        const startDateInput = document.querySelector('input[name="startDate"]');
        const creditsInput = document.querySelector('input[name="creditsSelected"]');
        const expirationInput = document.querySelector('input[name="expirationDate"]');

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

    static handleInputValidation(event) {
        const input = event.target;

        // Remove any existing error styling
        input.classList.remove('error');

        // Validate based on input type and name
        let isValid = true;
        let errorMessage = '';

        switch (input.type) {
            case 'email':
                isValid = Validators.isValidEmail(input.value);
                errorMessage = 'Please enter a valid email address';
                break;
            case 'tel':
                isValid = Validators.isValidPhone(input.value);
                errorMessage = 'Please enter a valid phone number';
                break;
            case 'number':
                if (input.hasAttribute('min')) {
                    isValid = parseFloat(input.value) >= parseFloat(input.getAttribute('min'));
                    errorMessage = `Value must be at least ${input.getAttribute('min')}`;
                }
                break;
        }

        // Apply error styling if needed
        if (!isValid && input.value) {
            input.classList.add('error');
            input.title = errorMessage;
        } else {
            input.title = '';
        }
    }

    static autoSave(event) {
        const form = event.target.closest('form');
        if (!form) return;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Save to localStorage with form ID
        const formId = form.id || form.querySelector('button[type="submit"]')?.textContent || 'unknown';
        localStorage.setItem(`form_draft_${formId}`, JSON.stringify(data));

        console.log(`💾 Auto-saved form data for: ${formId}`);
    }

    static restoreFormData(formElement) {
        const formId = formElement.id || formElement.querySelector('button[type="submit"]')?.textContent || 'unknown';
        const savedData = localStorage.getItem(`form_draft_${formId}`);

        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                Object.entries(data).forEach(([name, value]) => {
                    const input = formElement.querySelector(`[name="${name}"]`);
                    if (input && value) {
                        input.value = value;
                    }
                });
                console.log(`📋 Restored form data for: ${formId}`);
            } catch (error) {
                console.error('❌ Error restoring form data:', error);
            }
        }
    }

    static clearFormDraft(formElement) {
        const formId = formElement.id || formElement.querySelector('button[type="submit"]')?.textContent || 'unknown';
        localStorage.removeItem(`form_draft_${formId}`);
    }

    // Debug method for troubleshooting form issues
    static debugSubscriptionForm() {
        console.log('🔍 Debugging subscription form:');
        
        const form = document.querySelector('form[onsubmit*="addSubscription"]');
        if (form) {
            const formData = new FormData(form);
            console.log('Form elements:', Object.fromEntries(formData));
            
            const customerID = document.getElementById('selectedCustomerID')?.value;
            const vendorService = document.getElementById('vendorServiceSelectSub')?.value;
            
            console.log('Hidden fields:');
            console.log('- customerID:', customerID);
            console.log('- vendorService:', vendorService);
            
            const select = document.getElementById('vendorServiceSelectSub');
            if (select) {
                const option = select.options[select.selectedIndex];
                console.log('- vendorID from option:', option?.dataset.vendorId);
                console.log('- vendorName from option:', option?.dataset.vendorName);
            }
        } else {
            console.log('Subscription form not found');
        }
    }
}

// Make available globally
window.Forms = Forms;

// Global functions for backward compatibility with HTML
function addCustomer(event) {
    Forms.handleAddCustomer(event);
}

function addVendor(event) {
    Forms.handleAddVendor(event);
}

function addSubscription(event) {
    Forms.handleAddSubscription(event);
}

function addVendorService(event) {
    Forms.handleAddVendorService(event);
}

function purchaseCredits(event) {
    Forms.handlePurchaseCredits(event);
}

function addBusinessMoney(event) {
    Forms.handleAddBusinessMoney(event);
}

function withdrawBusinessMoney(event) {
    Forms.handleWithdrawBusinessMoney(event);
}

function loadMonthlyPL(event) {
    Forms.handleLoadMonthlyPL(event);
}

function loadYearlyPL(event) {
    Forms.handleLoadYearlyPL(event);
}

function calculateExpirationDate() {
    Forms.calculateExpirationDate();
}

function loadServicesForVendor() {
    const vendorId = document.getElementById('vendorSelect').value;
    VendorsAPI.loadServicesForVendor(vendorId);
}

function loadSelectedCustomerTransactions() {
    const customerId = document.getElementById('customerViewSelect').value;
    if (customerId) {
        ReceiptUI.displayCustomerTransactions(customerId);
    }
}

// Debug function for troubleshooting
function debugSubscriptionForm() {
    Forms.debugSubscriptionForm();
}