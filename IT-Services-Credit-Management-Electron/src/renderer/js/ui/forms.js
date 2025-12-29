// Form handling and validation - UPDATED VERSION
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
        // Form handlers are handled via onsubmit attribute in HTML 
        // linked to global functions at bottom of this file.
        // No manual addEventListener needed here to avoid duplicate triggers.
        console.log('📋 Form handlers verified');
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

    static async handleUpdateCustomer(event) {
        event.preventDefault();
        const formData = new FormData(event.target);

        const customerId = formData.get('customerId');
        const customerData = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            status: formData.get('status')
        };

        try {
            await CustomersAPI.update(customerId, customerData);
            // Don't reset form, user might want to make more changes
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

    // FIXED handleAddSubscription method with MAC address support
    static async handleAddSubscription(event) {
        event.preventDefault();
        console.log('📝 Processing subscription form submission...');

        // Show loading state
        const submitButton = event.target.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = '⏳ Adding Subscription...';
        submitButton.disabled = true;

        try {
            const formData = new FormData(event.target);

            // Get vendor ID from the selected service
            const vendorServiceSelect = document.getElementById('vendorServiceSelectSub');
            const selectedOption = vendorServiceSelect?.options[vendorServiceSelect.selectedIndex];
            const vendorID = selectedOption?.dataset.vendorId || '';
            const vendorName = selectedOption?.dataset.vendorName || '';

            console.log('📋 Form data collected:', {
                customerID: formData.get('customerID'),
                serviceName: formData.get('serviceName'),
                vendorServiceName: formData.get('vendorServiceName'),
                vendorID: vendorID,
                vendorName: vendorName,
                startDate: formData.get('startDate'),
                creditsSelected: formData.get('creditsSelected'),
                amountPaid: formData.get('amountPaid'),
                classification: formData.get('classification'),
                macAddress: formData.get('macAddress'),
                notes: formData.get('notes'),
                status: formData.get('status')
            });

            const subscriptionData = {
                customerID: formData.get('customerID'),
                serviceName: formData.get('serviceName') || 'IT App Services',
                startDate: formData.get('startDate'),
                creditsSelected: parseInt(formData.get('creditsSelected')),
                amountPaid: parseFloat(formData.get('amountPaid')),
                status: formData.get('status') || 'active',
                vendorID: vendorID,
                vendorServiceName: formData.get('vendorServiceName'),
                notes: formData.get('notes') || '',
                classification: formData.get('classification') || '',
                macAddress: formData.get('macAddress') || ''  // NEW LINE ADDED
            };

            // Enhanced client-side validation
            const validationErrors = [];

            if (!subscriptionData.customerID) {
                validationErrors.push('Please select a customer');
            }

            if (!subscriptionData.vendorServiceName) {
                validationErrors.push('Please select a vendor service');
            }

            if (!subscriptionData.vendorID) {
                validationErrors.push('Vendor service selection is incomplete. Please reselect the service.');
            }

            if (!subscriptionData.startDate) {
                validationErrors.push('Please select a start date');
            }

            if (!subscriptionData.creditsSelected || subscriptionData.creditsSelected <= 0) {
                validationErrors.push('Please enter a valid number of credits (greater than 0)');
            }

            if (subscriptionData.creditsSelected > 60) {
                validationErrors.push('Credits cannot exceed 60 months');
            }

            if (!subscriptionData.amountPaid || subscriptionData.amountPaid <= 0) {
                validationErrors.push('Please enter a valid payment amount (greater than $0)');
            }

            // MAC address validation (optional but must be valid format if provided)
            if (subscriptionData.macAddress && !Validators.validateMacAddress(subscriptionData.macAddress)) {
                validationErrors.push('MAC address must be in format XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX');
            }

            // Check if start date is not in the future beyond reasonable limits
            const startDate = new Date(subscriptionData.startDate);
            const today = new Date();
            const maxFutureDate = new Date();
            maxFutureDate.setMonth(maxFutureDate.getMonth() + 3); // Allow up to 3 months in future

            if (startDate > maxFutureDate) {
                validationErrors.push('Start date cannot be more than 3 months in the future');
            }

            if (validationErrors.length > 0) {
                throw new Error(validationErrors.join('\n• '));
            }

            // Show validation passed
            console.log('✅ Client-side validation passed');

            // Call API to add subscription
            console.log('🚀 Sending subscription to server...');
            await SubscriptionsAPI.add(subscriptionData);

            // Reset form on success
            event.target.reset();
            document.getElementById('selectedCustomerID').value = '';
            document.getElementById('customerSearchInput').value = '';

            // Hide dropdown if open
            const dropdown = document.getElementById('customerDropdown');
            if (dropdown) {
                dropdown.style.display = 'none';
            }

            console.log('✅ Subscription added successfully - form reset');

        } catch (error) {
            console.error('❌ Error in handleAddSubscription:', error);

            // Show detailed error message
            const errorMessage = error.message || 'An unknown error occurred while adding the subscription';

            if (errorMessage.includes('\n•')) {
                // Multiple validation errors
                Alerts.showError('Validation Errors', `Please fix the following issues:\n• ${errorMessage}`);
            } else {
                // Single error
                Alerts.showError('Subscription Error', errorMessage);
            }
        } finally {
            // Restore button state
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
        }
    }

    static handleVendorServiceChange(event) {
        const select = event.target;
        const selectedOption = select.options[select.selectedIndex];

        if (selectedOption && selectedOption.dataset.vendorId) {
            console.log('🔧 Vendor service selected:', {
                serviceName: selectedOption.value,
                vendorId: selectedOption.dataset.vendorId,
                vendorName: selectedOption.dataset.vendorName
            });
        } else {
            console.log('⚠️ No vendor service selected or missing vendor data');
        }
    }

    static async handleAddVendorService(event) {
        event.preventDefault();
        const formData = new FormData(event.target);

        const serviceData = {
            vendorID: formData.get('vendorID'),
            serviceName: formData.get('serviceName'),
            description: formData.get('description'),
            itemType: formData.get('itemType'),
            defaultPrice: formData.get('defaultPrice'),
            costPrice: formData.get('costPrice')
        };

        try {
            await VendorsAPI.addService(serviceData);
            event.target.reset();
            // Refresh catalog list if visible
            if (window.VendorsUI) VendorsUI.loadAndDisplayServices();
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

    static async handleLoadLifetimePL() {
        try {
            const result = await PLReportsAPI.loadLifetime();
            ReportUI.displayLifetimePL(result);
        } catch (error) {
            // Error already handled
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

        // MAC address validation for macAddress fields
        if (input.name === 'macAddress') {
            isValid = Validators.validateMacAddress(input.value);
            errorMessage = 'MAC address must be in format XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX';
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

            // Check credit balances
            const creditBalances = Store.getCreditBalances();
            console.log('- Available credit balances:', creditBalances.length);
            creditBalances.forEach(balance => {
                console.log(`  - ${balance.vendor_name} ${balance.service_name}: ${balance.remaining_credits} credits`);
            });
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

function updateCustomer(event) {
    Forms.handleUpdateCustomer(event);
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

function loadLifetimePL() {
    Forms.handleLoadLifetimePL();
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
