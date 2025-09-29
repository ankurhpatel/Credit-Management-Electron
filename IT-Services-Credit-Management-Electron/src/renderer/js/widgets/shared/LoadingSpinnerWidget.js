class LoadingSpinnerWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.isVisible = false;
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            message: 'Loading...',
            spinner: 'circle',
            backdrop: true,
            autoHide: true
        };
    }

    async getTemplate() {
        return `
            <div class="loading-overlay ${this.options.backdrop ? 'with-backdrop' : ''}" style="display: none;">
                <div class="loading-content">
                    <div class="loading-spinner ${this.options.spinner}"></div>
                    <div class="loading-message">${this.options.message}</div>
                </div>
            </div>
        `;
    }

    show(message = null) {
        if (message) {
            this.options.message = message;
            const messageEl = this.$('.loading-message');
            if (messageEl) {
                messageEl.textContent = message;
            }
        }

        const overlay = this.$('.loading-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            this.isVisible = true;
        }
    }

    hide() {
        const overlay = this.$('.loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            this.isVisible = false;
        }
    }

    setMessage(message) {
        this.options.message = message;
        const messageEl = this.$('.loading-message');
        if (messageEl) {
            messageEl.textContent = message;
        }
    }
}

window.LoadingSpinnerWidget = LoadingSpinnerWidget;
