// Common utility functions
class Helpers {
    static generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 5);
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

    static throttle(func, limit) {
        let inThrottle;
        return function () {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static calculateDaysUntilExpiration(expirationDate) {
        if (!expirationDate) return null;

        try {
            const expDate = new Date(expirationDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of today
            expDate.setHours(23, 59, 59, 999); // End of expiration day

            const diffTime = expDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        } catch (error) {
            console.warn('❌ Error calculating days until expiration:', error);
            return null;
        }
    }

    static sortBy(array, key, direction = 'asc') {
        return [...array].sort((a, b) => {
            let aVal = a[key];
            let bVal = b[key];

            // Handle dates
            if (typeof aVal === 'string' && aVal.match(/^\d{4}-\d{2}-\d{2}/)) {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }

            // Handle numbers
            if (typeof aVal === 'string' && !isNaN(parseFloat(aVal))) {
                aVal = parseFloat(aVal);
                bVal = parseFloat(bVal);
            }

            if (direction === 'desc') {
                return bVal > aVal ? 1 : -1;
            } else {
                return aVal > bVal ? 1 : -1;
            }
        });
    }

    static groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key] || 'Other';
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(item);
            return groups;
        }, {});
    }

    static filterBy(array, filters) {
        return array.filter(item => {
            return Object.entries(filters).every(([key, value]) => {
                if (value === '' || value === null || value === undefined) return true;

                const itemValue = item[key];
                if (typeof value === 'string' && typeof itemValue === 'string') {
                    return itemValue.toLowerCase().includes(value.toLowerCase());
                }

                return itemValue === value;
            });
        });
    }

    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }

    static isEmpty(obj) {
        if (obj === null || obj === undefined) return true;
        if (typeof obj === 'string') return obj.trim().length === 0;
        if (Array.isArray(obj)) return obj.length === 0;
        if (typeof obj === 'object') return Object.keys(obj).length === 0;
        return false;
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

    static createLoadingSpinner(container) {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.innerHTML = `
            <div class="spinner"></div>
            <div class="loading-text">Loading...</div>
        `;

        if (container) {
            container.appendChild(spinner);
        }

        return spinner;
    }

    static removeLoadingSpinner(container) {
        if (container) {
            const spinner = container.querySelector('.loading-spinner');
            if (spinner) {
                spinner.remove();
            }
        }
    }

    static formatFormData(formData) {
        const data = {};

        for (const [key, value] of formData.entries()) {
            // Sanitize and format based on field type
            if (key.includes('email')) {
                data[key] = value.trim().toLowerCase();
            } else if (key.includes('phone')) {
                data[key] = value.replace(/\s+/g, ''); // Remove spaces
            } else if (key.includes('amount') || key.includes('price')) {
                data[key] = parseFloat(value) || 0;
            } else if (key.includes('credits')) {
                data[key] = parseInt(value) || 0;
            } else {
                data[key] = typeof value === 'string' ? value.trim() : value;
            }
        }

        return data;
    }

    static showFieldError(fieldName, message) {
        const field = document.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.classList.add('error');
            field.title = message;

            // Remove error after user starts typing
            field.addEventListener('input', function removeError() {
                field.classList.remove('error');
                field.title = '';
                field.removeEventListener('input', removeError);
            });
        }
    }

    static clearAllFieldErrors() {
        document.querySelectorAll('.error').forEach(field => {
            field.classList.remove('error');
            field.title = '';
        });
    }
}

// Make available globally
window.Validators = Validators;
