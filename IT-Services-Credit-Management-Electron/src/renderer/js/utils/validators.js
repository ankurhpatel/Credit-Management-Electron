// Form validation utilities
class Validators {
    static validateCustomer(customerData) {
        const errors = [];

        // Name validation
        if (!customerData.name || customerData.name.trim().length === 0) {
            errors.push('Customer name is required');
        } else if (customerData.name.trim().length > 100) {
            errors.push('Customer name must be less than 100 characters');
        }

        // Email validation
        if (!customerData.email || customerData.email.trim().length === 0) {
            errors.push('Email address is required');
        } else if (!this.isValidEmail(customerData.email)) {
            errors.push('Please enter a valid email address');
        }

        // Phone validation (optional but must be valid if provided)
        if (customerData.phone && !this.isValidPhone(customerData.phone)) {
            errors.push('Please enter a valid phone number');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    static validateVendor(vendorData) {
        const errors = [];

        // Name validation
        if (!vendorData.name || vendorData.name.trim().length === 0) {
            errors.push('Vendor name is required');
        } else if (vendorData.name.trim().length > 100) {
            errors.push('Vendor name must be less than 100 characters');
        }

        // Email validation (optional but must be valid if provided)
        if (vendorData.contactEmail && !this.isValidEmail(vendorData.contactEmail)) {
            errors.push('Please enter a valid contact email address');
        }

        // Phone validation (optional but must be valid if provided)
        if (vendorData.contactPhone && !this.isValidPhone(vendorData.contactPhone)) {
            errors.push('Please enter a valid contact phone number');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    static validateSubscription(subscriptionData) {
        const errors = [];

        // Customer ID validation
        if (!subscriptionData.customerID) {
            errors.push('Please select a customer');
        }

        // Service name validation
        if (!subscriptionData.serviceName || subscriptionData.serviceName.trim().length === 0) {
            errors.push('Service name is required');
        }

        // Start date validation
        if (!subscriptionData.startDate) {
            errors.push('Start date is required');
        } else {
            const startDate = new Date(subscriptionData.startDate);
            if (isNaN(startDate.getTime())) {
                errors.push('Please enter a valid start date');
            }
        }

        // Credits validation
        if (!subscriptionData.creditsSelected || parseInt(subscriptionData.creditsSelected) <= 0) {
            errors.push('Credits must be greater than 0');
        } else if (parseInt(subscriptionData.creditsSelected) > 60) {
            errors.push('Credits cannot exceed 60 months');
        }

        // Amount validation
        if (!subscriptionData.amountPaid || parseFloat(subscriptionData.amountPaid) <= 0) {
            errors.push('Amount paid must be greater than $0');
        }

        // Vendor validation (if specified)
        if (subscriptionData.vendorID && !subscriptionData.vendorServiceName) {
            errors.push('Please select a vendor service when vendor is specified');
        }

        // Date logic validation
        if (subscriptionData.startDate && subscriptionData.creditsSelected) {
            const startDate = new Date(subscriptionData.startDate);
            const calculatedExpiry = new Date(startDate);
            calculatedExpiry.setMonth(calculatedExpiry.getMonth() + parseInt(subscriptionData.creditsSelected));

            if (calculatedExpiry <= startDate) {
                errors.push('Expiration date must be after start date');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    static validateCreditPurchase(purchaseData) {
        const errors = [];

        // Vendor validation
        if (!purchaseData.vendorID) {
            errors.push('Please select a vendor');
        }

        // Service validation
        if (!purchaseData.serviceName) {
            errors.push('Please select a service');
        }

        // Credits validation
        if (!purchaseData.credits || parseInt(purchaseData.credits) <= 0) {
            errors.push('Number of credits must be greater than 0');
        } else if (parseInt(purchaseData.credits) > 10000) {
            errors.push('Number of credits cannot exceed 10,000');
        }

        // Price validation
        if (!purchaseData.priceUSD || parseFloat(purchaseData.priceUSD) <= 0) {
            errors.push('Price must be greater than $0');
        }

        // Date validation
        if (!purchaseData.purchaseDate) {
            errors.push('Purchase date is required');
        } else {
            const purchaseDate = new Date(purchaseData.purchaseDate);
            const today = new Date();
            today.setHours(23, 59, 59, 999); // End of today

            if (isNaN(purchaseDate.getTime())) {
                errors.push('Please enter a valid purchase date');
            } else if (purchaseDate > today) {
                errors.push('Purchase date cannot be in the future');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    static validateBusinessTransaction(transactionData) {
        const errors = [];

        // Amount validation
        if (!transactionData.amount || parseFloat(transactionData.amount) <= 0) {
            errors.push('Amount must be greater than $0');
        }

        // Date validation
        if (!transactionData.date) {
            errors.push('Transaction date is required');
        } else {
            const transDate = new Date(transactionData.date);
            const today = new Date();
            today.setHours(23, 59, 59, 999);

            if (isNaN(transDate.getTime())) {
                errors.push('Please enter a valid transaction date');
            } else if (transDate > today) {
                errors.push('Transaction date cannot be in the future');
            }
        }

        // Description validation (optional but limit length)
        if (transactionData.description && transactionData.description.length > 200) {
            errors.push('Description must be less than 200 characters');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    static isValidEmail(email) {
        if (!email) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    }

    static isValidPhone(phone) {
        if (!phone) return true; // Phone is optional

        // Remove all non-digits to check
        const digits = phone.replace(/\D/g, '');

        // Must be 10 or 11 digits (US format with or without country code)
        return digits.length >= 10 && digits.length <= 11;
    }

    static isValidAmount(amount) {
        if (!amount) return false;
        const num = parseFloat(amount);
        return !isNaN(num) && num > 0;
    }

    static isValidInteger(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
        const num = parseInt(value);
        return !isNaN(num) && num >= min && num <= max;
    }

    static isValidDate(dateString) {
        if (!dateString) return false;
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    }

    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;

        // Remove potentially harmful characters
        return input.trim()
            .replace(/[<>]/g, '') // Remove angle brackets
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+=/gi, ''); // Remove event handlers
    }

    static validateRequired(fields, data) {
        const errors = [];

        fields.forEach(field => {
            if (!data[field] || (typeof data[field] === 'string' && data[field].trim().length === 0)) {
                errors.push(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
            }
        });

        return errors;
    }
}

// Make available globally
window.Validators = Validators;
