// Formatting utilities
class Formatters {
    static formatCurrency(amount, currency = 'USD') {
        if (amount === null || amount === undefined) return '$0.00';

        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(parseFloat(amount));
        } catch (error) {
            console.warn('❌ Currency formatting error:', error);
            return `$${parseFloat(amount || 0).toFixed(2)}`;
        }
    }

    static formatDate(date) {
        if (!date) return 'N/A';

        try {
            const dateObj = date instanceof Date ? date : new Date(date);
            return dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            console.warn('❌ Date formatting error:', error);
            return String(date);
        }
    }

    static formatDateTime(date) {
        if (!date) return 'N/A';

        try {
            const dateObj = date instanceof Date ? date : new Date(date);
            return dateObj.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.warn('❌ DateTime formatting error:', error);
            return String(date);
        }
    }

    static formatNumber(num, decimals = 0) {
        if (num === null || num === undefined) return '0';

        try {
            return new Intl.NumberFormat('en-US', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }).format(parseFloat(num));
        } catch (error) {
            console.warn('❌ Number formatting error:', error);
            return String(num);
        }
    }

    static formatPercentage(value, total) {
        if (!total || total === 0) return '0%';

        const percentage = (parseFloat(value) / parseFloat(total)) * 100;
        return `${percentage.toFixed(1)}%`;
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static truncateText(text, maxLength = 50) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    static capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    static formatPhoneNumber(phone) {
        if (!phone) return '';

        // Remove all non-digits
        const digits = phone.replace(/\D/g, '');

        // Format based on length
        if (digits.length === 10) {
            return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
        } else if (digits.length === 11) {
            return `+${digits.substring(0, 1)} (${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7)}`;
        }

        return phone; // Return original if can't format
    }

    static formatDuration(months) {
        if (!months || months === 0) return '0 months';

        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;

        if (years === 0) {
            return `${months} month${months !== 1 ? 's' : ''}`;
        } else if (remainingMonths === 0) {
            return `${years} year${years !== 1 ? 's' : ''}`;
        } else {
            return `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
        }
    }
}

// Make available globally
window.Formatters = Formatters;
