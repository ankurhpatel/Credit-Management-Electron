// Alert and notification system
class Alerts {
    static showSuccess(title, message) {
        this.show('success', title, message);
    }

    static showError(title, message) {
        this.show('error', title, message);
    }

    static showWarning(title, message) {
        this.show('warning', title, message);
    }

    static showInfo(title, message) {
        this.show('info', title, message);
    }

    static show(type, title, message) {
        // Remove existing alerts
        this.clearExisting();

        // Create alert element
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <div class="alert-content">
                <div class="alert-icon">${this.getIcon(type)}</div>
                <div class="alert-text">
                    <div class="alert-title">${title}</div>
                    <div class="alert-message">${message}</div>
                </div>
                <button class="alert-close" onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
        `;

        // Add to DOM
        document.body.appendChild(alert);

        // Auto-remove after delay
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, type === 'error' ? 8000 : 5000);

        // Animate in
        requestAnimationFrame(() => {
            alert.classList.add('show');
        });

        console.log(`${this.getLogIcon(type)} ${title}: ${message}`);
    }

    static clearExisting() {
        document.querySelectorAll('.alert').forEach(alert => alert.remove());
    }

    static getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }

    static getLogIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }

    static confirm(title, message) {
        return new Promise((resolve) => {
            const result = window.confirm(`${title}\n\n${message}`);
            resolve(result);
        });
    }

    static async prompt(title, message, defaultValue = '') {
        return new Promise((resolve) => {
            const result = window.prompt(`${title}\n\n${message}`, defaultValue);
            resolve(result);
        });
    }

    // Business-specific alerts
    static showLowCreditAlert(vendor, service, remaining) {
        this.showWarning(
            'Low Credit Alert',
            `${vendor} - ${service} has only ${remaining} credits remaining. Consider purchasing more credits.`
        );
    }

    static showExpirationAlert(customerName, service, daysUntilExpiry) {
        const urgency = daysUntilExpiry <= 7 ? 'error' : 'warning';
        this.show(
            urgency,
            'Subscription Expiring',
            `${customerName}'s ${service} subscription expires in ${daysUntilExpiry} days.`
        );
    }

    static showCreditInsufficientAlert(vendor, service, needed, available) {
        this.showError(
            'Insufficient Credits',
            `Cannot allocate ${needed} credits for ${vendor} - ${service}. Only ${available} credits available.`
        );
    }
}

// Add CSS for alerts
if (!document.getElementById('alert-styles')) {
    const style = document.createElement('style');
    style.id = 'alert-styles';
    style.textContent = `
        .alert {
            position: fixed;
            top: 20px;
            right: 20px;
            min-width: 300px;
            max-width: 500px;
            z-index: 9999;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        }
        
        .alert.show {
            opacity: 1;
            transform: translateX(0);
        }
        
        .alert-content {
            display: flex;
            align-items: flex-start;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(10px);
        }
        
        .alert-success .alert-content {
            background: rgba(72, 187, 120, 0.9);
            color: white;
            border: 1px solid #48bb78;
        }
        
        .alert-error .alert-content {
            background: rgba(245, 101, 101, 0.9);
            color: white;
            border: 1px solid #f56565;
        }
        
        .alert-warning .alert-content {
            background: rgba(237, 137, 54, 0.9);
            color: white;
            border: 1px solid #ed8936;
        }
        
        .alert-info .alert-content {
            background: rgba(66, 153, 225, 0.9);
            color: white;
            border: 1px solid #4299e1;
        }
        
        .alert-icon {
            margin-right: 10px;
            font-size: 18px;
        }
        
        .alert-text {
            flex: 1;
        }
        
        .alert-title {
            font-weight: 600;
            margin-bottom: 4px;
        }
        
        .alert-message {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .alert-close {
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
            font-size: 16px;
            margin-left: 10px;
            opacity: 0.7;
            transition: opacity 0.2s;
        }
        
        .alert-close:hover {
            opacity: 1;
        }
        
        /* Print styles */
        @media print {
            .alert {
                display: none !important;
            }
        }
    `;
    document.head.appendChild(style);
}

// Make available globally
window.Alerts = Alerts;
