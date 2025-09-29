// Comprehensive validation utilities for form inputs and business data
class Validators {

    // ===============================
    // EMAIL VALIDATION
    // ===============================
    static isValidEmail(email) {
        if (!email) return false;
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return emailRegex.test(email.trim()) && email.trim().length <= 320; // RFC 5321 limit
    }

    static normalizeEmail(email) {
        if (!email) return '';
        return email.trim().toLowerCase();
    }

    // ===============================
    // PHONE NUMBER VALIDATION
    // ===============================
    static isValidPhone(phone) {
        if (!phone) return true; // Optional field
        const phoneRegex = /^[\+]?[\s\-\(\)]*([0-9][\s\-\(\)]*){6,20}$/;
        return phoneRegex.test(phone.trim());
    }

    static normalizePhone(phone) {
        if (!phone) return '';
        // Remove all non-digit characters except +
        return phone.replace(/[^\d+]/g, '');
    }

    static isValidUSPhone(phone) {
        if (!phone) return true; // Optional field
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length === 10 || (cleaned.length === 11 && cleaned[0] === '1');
    }

    // ===============================
    // MAC ADDRESS VALIDATION
    // ===============================
    static validateMacAddress(macAddress) {
        if (!macAddress || macAddress.trim() === '') {
            return true; // Optional field
        }

        // MAC address formats supported:
        // XX:XX:XX:XX:XX:XX (colon separated)
        // XX-XX-XX-XX-XX-XX (hyphen separated)  
        // XXXXXXXXXXXX (no separators)
        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^[0-9A-Fa-f]{12}$/;
        return macRegex.test(macAddress.trim());
    }

    static normalizeMacAddress(macAddress) {
        if (!macAddress) return '';
        const cleaned = macAddress.replace(/[:-]/g, '').toUpperCase();
        // Format as XX:XX:XX:XX:XX:XX
        return cleaned.match(/.{2}/g)?.join(':') || '';
    }

    static isBroadcastMac(macAddress) {
        const normalized = this.normalizeMacAddress(macAddress);
        return normalized === 'FF:FF:FF:FF:FF:FF';
    }

    static isMulticastMac(macAddress) {
        if (!this.validateMacAddress(macAddress)) return false;
        const firstOctet = parseInt(macAddress.replace(/[:-]/g, '').substring(0, 2), 16);
        return (firstOctet & 1) === 1;
    }

    // ===============================
    // CUSTOMER VALIDATION
    // ===============================
    static validateCustomer(customerData) {
        const errors = [];

        // Name validation
        if (!customerData.name || customerData.name.trim().length < 1) {
            errors.push('Customer name is required');
        } else if (customerData.name.trim().length < 2) {
            errors.push('Customer name must be at least 2 characters long');
        } else if (customerData.name.trim().length > 100) {
            errors.push('Customer name cannot exceed 100 characters');
        }

        // Email validation
        if (!customerData.email) {
            errors.push('Email address is required');
        } else if (!this.isValidEmail(customerData.email)) {
            errors.push('Valid email address is required');
        }

        // Phone validation (optional)
        if (customerData.phone && !this.isValidPhone(customerData.phone)) {
            errors.push('Phone number format is invalid');
        }

        // Address validation (optional but limited)
        if (customerData.address && customerData.address.length > 500) {
            errors.push('Address cannot exceed 500 characters');
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            normalizedData: {
                name: customerData.name?.trim(),
                email: this.normalizeEmail(customerData.email),
                phone: this.normalizePhone(customerData.phone),
                address: customerData.address?.trim()
            }
        };
    }

    // ===============================
    // SUBSCRIPTION VALIDATION
    // ===============================
    static validateSubscription(subscriptionData) {
        const errors = [];

        // Customer ID validation
        if (!subscriptionData.customerID || subscriptionData.customerID.trim() === '') {
            errors.push('Customer selection is required');
        }

        // Service name validation
        if (!subscriptionData.serviceName || subscriptionData.serviceName.trim() === '') {
            errors.push('Service name is required');
        }

        // Start date validation
        if (!subscriptionData.startDate) {
            errors.push('Start date is required');
        } else if (!this.isValidDate(subscriptionData.startDate)) {
            errors.push('Start date must be a valid date');
        }

        // Credits validation
        if (!subscriptionData.creditsSelected) {
            errors.push('Credits selection is required');
        } else {
            const credits = parseInt(subscriptionData.creditsSelected);
            if (isNaN(credits) || credits <= 0) {
                errors.push('Credits must be a positive number');
            } else if (credits > 60) {
                errors.push('Credits cannot exceed 60 months');
            }
        }

        // Amount paid validation
        if (!subscriptionData.amountPaid) {
            errors.push('Payment amount is required');
        } else {
            const amount = parseFloat(subscriptionData.amountPaid);
            if (isNaN(amount) || amount <= 0) {
                errors.push('Payment amount must be greater than $0');
            } else if (amount > 50000) {
                errors.push('Payment amount seems unusually high (max $50,000)');
            }
        }

        // MAC address validation (optional but must be valid format if provided)
        if (subscriptionData.macAddress && !this.validateMacAddress(subscriptionData.macAddress)) {
            errors.push('MAC address must be in format XX:XX:XX:XX:XX:XX, XX-XX-XX-XX-XX-XX, or XXXXXXXXXXXX');
        }

        // Classification validation (optional)
        if (subscriptionData.classification && subscriptionData.classification.length > 100) {
            errors.push('Classification cannot exceed 100 characters');
        }

        // Notes validation (optional)
        if (subscriptionData.notes && subscriptionData.notes.length > 1000) {
            errors.push('Notes cannot exceed 1000 characters');
        }

        // Date logic validation
        if (subscriptionData.startDate) {
            const startDate = new Date(subscriptionData.startDate);
            const today = new Date();
            const maxFutureDate = new Date();
            maxFutureDate.setMonth(maxFutureDate.getMonth() + 6); // Allow up to 6 months in future

            if (startDate > maxFutureDate) {
                errors.push('Start date cannot be more than 6 months in the future');
            }

            // Check if date is too far in the past
            const minPastDate = new Date();
            minPastDate.setFullYear(minPastDate.getFullYear() - 2);
            if (startDate < minPastDate) {
                errors.push('Start date cannot be more than 2 years in the past');
            }
        }

        // Vendor service validation
        if (!subscriptionData.vendorServiceName || subscriptionData.vendorServiceName.trim() === '') {
            errors.push('Vendor service selection is required');
        }

        // Status validation
        const validStatuses = ['active', 'expired', 'cancelled', 'suspended'];
        if (subscriptionData.status && !validStatuses.includes(subscriptionData.status)) {
            errors.push('Status must be one of: active, expired, cancelled, suspended');
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            normalizedData: {
                ...subscriptionData,
                serviceName: subscriptionData.serviceName?.trim(),
                classification: subscriptionData.classification?.trim(),
                notes: subscriptionData.notes?.trim(),
                macAddress: subscriptionData.macAddress ? this.normalizeMacAddress(subscriptionData.macAddress) : ''
            }
        };
    }

    // ===============================
    // VENDOR VALIDATION
    // ===============================
    static validateVendor(vendorData) {
        const errors = [];

        // Name validation
        if (!vendorData.name || vendorData.name.trim().length < 1) {
            errors.push('Vendor name is required');
        } else if (vendorData.name.trim().length < 2) {
            errors.push('Vendor name must be at least 2 characters long');
        } else if (vendorData.name.trim().length > 100) {
            errors.push('Vendor name cannot exceed 100 characters');
        }

        // Contact email validation (optional)
        if (vendorData.contactEmail && !this.isValidEmail(vendorData.contactEmail)) {
            errors.push('Contact email format is invalid');
        }

        // Contact phone validation (optional)
        if (vendorData.contactPhone && !this.isValidPhone(vendorData.contactPhone)) {
            errors.push('Contact phone format is invalid');
        }

        // Description validation (optional)
        if (vendorData.description && vendorData.description.length > 1000) {
            errors.push('Description cannot exceed 1000 characters');
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            normalizedData: {
                name: vendorData.name?.trim(),
                contactEmail: this.normalizeEmail(vendorData.contactEmail),
                contactPhone: this.normalizePhone(vendorData.contactPhone),
                description: vendorData.description?.trim()
            }
        };
    }

    // ===============================
    // VENDOR SERVICE VALIDATION
    // ===============================
    static validateVendorService(serviceData) {
        const errors = [];

        // Vendor ID validation
        if (!serviceData.vendorID || serviceData.vendorID.trim() === '') {
            errors.push('Vendor selection is required');
        }

        // Service name validation
        if (!serviceData.serviceName || serviceData.serviceName.trim().length < 1) {
            errors.push('Service name is required');
        } else if (serviceData.serviceName.trim().length < 2) {
            errors.push('Service name must be at least 2 characters long');
        } else if (serviceData.serviceName.trim().length > 100) {
            errors.push('Service name cannot exceed 100 characters');
        }

        // Description validation (optional)
        if (serviceData.description && serviceData.description.length > 500) {
            errors.push('Description cannot exceed 500 characters');
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            normalizedData: {
                vendorID: serviceData.vendorID?.trim(),
                serviceName: serviceData.serviceName?.trim(),
                description: serviceData.description?.trim()
            }
        };
    }

    // ===============================
    // CREDIT PURCHASE VALIDATION
    // ===============================
    static validateCreditPurchase(purchaseData) {
        const errors = [];

        // Vendor ID validation
        if (!purchaseData.vendorID || purchaseData.vendorID.trim() === '') {
            errors.push('Vendor selection is required');
        }

        // Service name validation
        if (!purchaseData.serviceName || purchaseData.serviceName.trim() === '') {
            errors.push('Service selection is required');
        }

        // Purchase date validation
        if (!purchaseData.purchaseDate) {
            errors.push('Purchase date is required');
        } else if (!this.isValidDate(purchaseData.purchaseDate)) {
            errors.push('Purchase date must be a valid date');
        } else {
            const purchaseDate = new Date(purchaseData.purchaseDate);
            const today = new Date();
            const maxFutureDate = new Date();
            maxFutureDate.setMonth(maxFutureDate.getMonth() + 1);

            if (purchaseDate > maxFutureDate) {
                errors.push('Purchase date cannot be more than 1 month in the future');
            }

            const minPastDate = new Date();
            minPastDate.setFullYear(minPastDate.getFullYear() - 5);
            if (purchaseDate < minPastDate) {
                errors.push('Purchase date cannot be more than 5 years in the past');
            }
        }

        // Credits validation
        if (!purchaseData.credits) {
            errors.push('Number of credits is required');
        } else {
            const credits = parseInt(purchaseData.credits);
            if (isNaN(credits) || credits <= 0) {
                errors.push('Credits must be a positive number');
            } else if (credits > 1000000) {
                errors.push('Credits cannot exceed 1,000,000');
            }
        }

        // Price validation
        if (!purchaseData.priceUSD) {
            errors.push('Price in USD is required');
        } else {
            const price = parseFloat(purchaseData.priceUSD);
            if (isNaN(price) || price <= 0) {
                errors.push('Price must be greater than $0');
            } else if (price > 1000000) {
                errors.push('Price seems unusually high (max $1,000,000)');
            }
        }

        // Notes validation (optional)
        if (purchaseData.notes && purchaseData.notes.length > 1000) {
            errors.push('Notes cannot exceed 1000 characters');
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            normalizedData: {
                vendorID: purchaseData.vendorID?.trim(),
                serviceName: purchaseData.serviceName?.trim(),
                purchaseDate: purchaseData.purchaseDate,
                credits: parseInt(purchaseData.credits),
                priceUSD: parseFloat(purchaseData.priceUSD),
                notes: purchaseData.notes?.trim()
            }
        };
    }

    // ===============================
    // BUSINESS TRANSACTION VALIDATION
    // ===============================
    static validateBusinessTransaction(transactionData) {
        const errors = [];

        // Amount validation
        if (!transactionData.amount) {
            errors.push('Amount is required');
        } else {
            const amount = parseFloat(transactionData.amount);
            if (isNaN(amount) || amount <= 0) {
                errors.push('Amount must be greater than $0');
            } else if (amount > 1000000) {
                errors.push('Amount seems unusually high (max $1,000,000)');
            }
        }

        // Date validation
        if (!transactionData.date) {
            errors.push('Transaction date is required');
        } else if (!this.isValidDate(transactionData.date)) {
            errors.push('Transaction date must be a valid date');
        }

        // Description validation (optional)
        if (transactionData.description && transactionData.description.length > 500) {
            errors.push('Description cannot exceed 500 characters');
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            normalizedData: {
                amount: parseFloat(transactionData.amount),
                date: transactionData.date,
                description: transactionData.description?.trim()
            }
        };
    }

    // ===============================
    // GENERIC VALIDATION UTILITIES
    // ===============================
    static isValidNumber(value, min = null, max = null, allowDecimals = true) {
        if (value === null || value === undefined || value === '') return false;

        const num = allowDecimals ? parseFloat(value) : parseInt(value);
        if (isNaN(num)) return false;
        if (min !== null && num < min) return false;
        if (max !== null && num > max) return false;

        // Check if it's an integer when decimals not allowed
        if (!allowDecimals && num !== Math.floor(num)) return false;

        return true;
    }

    static isValidDate(dateString) {
        if (!dateString) return false;
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
    }

    static isValidDateTime(dateTimeString) {
        if (!dateTimeString) return false;
        const date = new Date(dateTimeString);
        return date instanceof Date && !isNaN(date);
    }

    static isRequired(value) {
        return value !== null && value !== undefined && value.toString().trim().length > 0;
    }

    static isValidUrl(url) {
        if (!url) return false;
        try {
            const urlObj = new URL(url);
            return ['http:', 'https:'].includes(urlObj.protocol);
        } catch (e) {
            return false;
        }
    }

    static isValidLength(value, minLength = 0, maxLength = Infinity) {
        if (!value) return minLength === 0;
        const length = value.toString().length;
        return length >= minLength && length <= maxLength;
    }

    // ===============================
    // TEXT SANITIZATION
    // ===============================
    static sanitizeText(text) {
        if (!text) return '';
        return text.toString()
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .trim();
    }

    static sanitizeHtml(html) {
        if (!html) return '';
        // Basic HTML sanitization - removes script tags and javascript
        return html.toString()
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+="[^"]*"/gi, '')
            .replace(/on\w+='[^']*'/gi, '')
            .trim();
    }

    // ===============================
    // CREDIT CARD VALIDATION (for future use)
    // ===============================
    static isValidCreditCard(cardNumber) {
        if (!cardNumber) return false;
        const cleaned = cardNumber.replace(/\D/g, '');

        // Luhn algorithm
        let sum = 0;
        let alternate = false;

        for (let i = cleaned.length - 1; i >= 0; i--) {
            let digit = parseInt(cleaned.charAt(i));

            if (alternate) {
                digit *= 2;
                if (digit > 9) {
                    digit = (digit % 10) + 1;
                }
            }

            sum += digit;
            alternate = !alternate;
        }

        return (sum % 10) === 0 && cleaned.length >= 13 && cleaned.length <= 19;
    }

    static getCardType(cardNumber) {
        if (!cardNumber) return 'Unknown';
        const cleaned = cardNumber.replace(/\D/g, '');

        if (cleaned.match(/^4/)) return 'Visa';
        if (cleaned.match(/^5[1-5]/)) return 'Mastercard';
        if (cleaned.match(/^3[47]/)) return 'American Express';
        if (cleaned.match(/^6/)) return 'Discover';

        return 'Unknown';
    }

    // ===============================
    // BATCH VALIDATION
    // ===============================
    static validateBatch(dataArray, validatorFunction) {
        const results = {
            valid: [],
            invalid: [],
            totalErrors: 0
        };

        dataArray.forEach((item, index) => {
            const validation = validatorFunction(item);
            if (validation.isValid) {
                results.valid.push({ index, item: validation.normalizedData || item });
            } else {
                results.invalid.push({ index, item, errors: validation.errors });
                results.totalErrors += validation.errors.length;
            }
        });

        return {
            ...results,
            isValid: results.invalid.length === 0,
            successRate: results.valid.length / dataArray.length
        };
    }

    // ===============================
    // FORM VALIDATION HELPERS
    // ===============================
    static validateForm(formData, rules) {
        const errors = {};
        let isValid = true;

        Object.keys(rules).forEach(fieldName => {
            const rule = rules[fieldName];
            const value = formData[fieldName];
            const fieldErrors = [];

            // Required validation
            if (rule.required && !this.isRequired(value)) {
                fieldErrors.push(`${rule.label || fieldName} is required`);
            }

            // Skip other validations if field is empty and not required
            if (!this.isRequired(value) && !rule.required) {
                return;
            }

            // Length validation
            if (rule.minLength && (!value || value.length < rule.minLength)) {
                fieldErrors.push(`${rule.label || fieldName} must be at least ${rule.minLength} characters`);
            }
            if (rule.maxLength && value && value.length > rule.maxLength) {
                fieldErrors.push(`${rule.label || fieldName} cannot exceed ${rule.maxLength} characters`);
            }

            // Type-specific validation
            if (rule.type === 'email' && value && !this.isValidEmail(value)) {
                fieldErrors.push(`${rule.label || fieldName} must be a valid email address`);
            }
            if (rule.type === 'phone' && value && !this.isValidPhone(value)) {
                fieldErrors.push(`${rule.label || fieldName} must be a valid phone number`);
            }
            if (rule.type === 'number' && value && !this.isValidNumber(value, rule.min, rule.max)) {
                fieldErrors.push(`${rule.label || fieldName} must be a valid number${rule.min ? ` (min: ${rule.min})` : ''}${rule.max ? ` (max: ${rule.max})` : ''}`);
            }
            if (rule.type === 'date' && value && !this.isValidDate(value)) {
                fieldErrors.push(`${rule.label || fieldName} must be a valid date`);
            }
            if (rule.type === 'url' && value && !this.isValidUrl(value)) {
                fieldErrors.push(`${rule.label || fieldName} must be a valid URL`);
            }
            if (rule.type === 'mac' && value && !this.validateMacAddress(value)) {
                fieldErrors.push(`${rule.label || fieldName} must be a valid MAC address`);
            }

            // Custom validation function
            if (rule.custom && typeof rule.custom === 'function') {
                const customResult = rule.custom(value, formData);
                if (customResult !== true) {
                    fieldErrors.push(customResult || `${rule.label || fieldName} is invalid`);
                }
            }

            if (fieldErrors.length > 0) {
                errors[fieldName] = fieldErrors;
                isValid = false;
            }
        });

        return { isValid, errors };
    }
}

// Make available globally
window.Validators = Validators;
