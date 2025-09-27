// Alert system for user notifications
class Alerts {
    static showSuccess(title, message) {
        this.showAlert('success', title, message);
    }

    static showError(title, message) {
        this.showAlert('error', title, message);
    }

    static showWarning(title, message) {
        this.showAlert('warning', title, message);
    }

    static showInfo(title, message) {
        this.showAlert('info', title, message);
    }

    static showAlert(type, title, message) {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.app-alert');
        existingAlerts.forEach(alert => alert.remove());

        const alertDiv = document.createElement('div');
        alertDiv.className = `app-alert alert-${type}`;

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        alertDiv.innerHTML = `
            <div class="alert-content">
                <div class="alert-icon">${icons[type] || 'ℹ️'}</div>
                <div class="alert-text">
                    <strong>${title}</strong>
                    <p>${message}</p>
                </div>
                <button class="alert-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            min-width: 300px;
            max-width: 500px;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease-out;
        `;

        const colors = {
            success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
            error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
            warning: { bg: '#fff3cd', border: '#ffeaa7', text: '#856404' },
            info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' }
        };

        const color = colors[type] || colors.info;
        alertDiv.style.backgroundColor = color.bg;
        alertDiv.style.border = `1px solid ${color.border}`;
        alertDiv.style.color = color.text;

        document.body.appendChild(alertDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => alertDiv.remove(), 300);
            }
        }, 5000);

        // Add CSS animations if not already added
        if (!document.getElementById('alert-animations')) {
            const style = document.createElement('style');
            style.id = 'alert-animations';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
                .alert-content {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                }
                .alert-icon {
                    font-size: 20px;
                    margin-top: 2px;
                }
                .alert-text {
                    flex: 1;
                }
                .alert-text strong {
                    display: block;
                    margin-bottom: 4px;
                    font-size: 16px;
                }
                .alert-text p {
                    margin: 0;
                    font-size: 14px;
                    line-height: 1.4;
                }
                .alert-close {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 0;
                    margin: -5px -5px 0 0;
                    opacity: 0.7;
                }
                .alert-close:hover {
                    opacity: 1;
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Make available globally
window.Alerts = Alerts;
