// Shared utility functions for both main and renderer processes

class Utils {
    static generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 5);
    }

    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    static formatDate(dateString) {
        if (!dateString) return 'N/A';

        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US');
        } catch (error) {
            return dateString;
        }
    }

    static formatDateTime(dateString) {
        if (!dateString) return 'N/A';

        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-US');
        } catch (error) {
            return dateString;
        }
    }

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validatePhone(phone) {
        if (!phone) return true; // Phone is optional
        const phoneRegex = /^[\+]?[1-9]?[\-\s\.]?[(]?[0-9]{3}[)]?[\-\s\.]?[0-9]{3}[\-\s\.]?[0-9]{4}$/;
        return phoneRegex.test(phone);
    }

    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.trim().replace(/[<>]/g, '');
    }

    static calculateDaysUntilExpiration(expirationDate) {
        if (!expirationDate) return null;

        try {
            const expDate = new Date(expirationDate);
            const today = new Date();
            const diffTime = expDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        } catch (error) {
            return null;
        }
    }

    static getExpirationStatus(expirationDate) {
        const days = this.calculateDaysUntilExpiration(expirationDate);

        if (days === null) return 'unknown';
        if (days < 0) return 'expired';
        if (days <= 7) return 'critical';
        if (days <= 30) return 'warning';
        return 'good';
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static async handleApiResponse(response) {
        try {
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error('Invalid response from server');
            }
            throw error;
        }
    }
}

// Export for Node.js (main process) and browser (renderer process)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
} else {
    window.Utils = Utils;
}
