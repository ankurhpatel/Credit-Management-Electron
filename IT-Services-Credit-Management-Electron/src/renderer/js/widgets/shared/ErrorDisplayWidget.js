class ErrorDisplayWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.errors = [];
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            autoHide: true,
            hideDelay: 5000,
            maxErrors: 5,
            showRetry: true
        };
    }

    async getTemplate() {
        return `
            <div class="error-container" style="display: none;">
                <div class="error-list" id="errorList"></div>
            </div>
        `;
    }

    showError(title, message, details = '', retryCallback = null) {
        const error = {
            id: Date.now(),
            title,
            message,
            details,
            retryCallback,
            timestamp: new Date()
        };

        this.errors.unshift(error);

        // Limit number of errors
        if (this.errors.length > this.options.maxErrors) {
            this.errors = this.errors.slice(0, this.options.maxErrors);
        }

        this.render();
        this.show();

        if (this.options.autoHide) {
            setTimeout(() => {
                this.hideError(error.id);
            }, this.options.hideDelay);
        }
    }

    hideError(errorId) {
        this.errors = this.errors.filter(error => error.id !== errorId);

        if (this.errors.length === 0) {
            this.hide();
        } else {
            this.updateErrorList();
        }
    }

    show() {
        const container = this.$('.error-container');
        if (container) {
            container.style.display = 'block';
        }
    }

    hide() {
        const container = this.$('.error-container');
        if (container) {
            container.style.display = 'none';
        }
    }

    async render() {
        await super.render();
        this.updateErrorList();
    }

    updateErrorList() {
        const errorList = this.$('#errorList');
        if (!errorList) return;

        errorList.innerHTML = this.errors.map(error => `
            <div class="error-item" data-error-id="${error.id}">
                <div class="error-header">
                    <div class="error-icon">❌</div>
                    <div class="error-title">${this.escapeHtml(error.title)}</div>
                    <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="error-message">${this.escapeHtml(error.message)}</div>
                ${error.details ? `<div class="error-details">${this.escapeHtml(error.details)}</div>` : ''}
                <div class="error-footer">
                    <div class="error-time">${this.formatDate(error.timestamp, {
            hour: '2-digit',
            minute: '2-digit'
        })}</div>
                    ${error.retryCallback && this.options.showRetry ? `
                        <button class="btn-small btn-primary error-retry" 
                                onclick="window.ErrorDisplayWidget.retry('${error.id}')">
                            🔄 Retry
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    retry(errorId) {
        const error = this.errors.find(e => e.id.toString() === errorId.toString());
        if (error && error.retryCallback) {
            error.retryCallback();
            this.hideError(error.id);
        }
    }

    clearAll() {
        this.errors = [];
        this.hide();
    }
}

// Make retry method globally accessible
window.ErrorDisplayWidget = {
    retry: (errorId) => {
        const widget = WidgetManager.getWidget('error-display');
        if (widget) {
            widget.retry(errorId);
        }
    }
};

window.ErrorDisplayWidget = ErrorDisplayWidget;
