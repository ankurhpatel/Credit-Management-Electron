class AppHeaderWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.currentTime = new Date();
        this.timeUpdateInterval = null;
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showClock: true,
            showUserInfo: false,
            showVersion: true
        };
    }

    async getTemplate() {
        return `
            <div class="app-header">
                <div class="header-left">
                    <div class="app-logo">💳</div>
                    <div class="app-title">
                        <h1>IT Services Credit Management</h1>
                        <p class="app-subtitle">Manage subscriptions, vendors, and monitor profit margins</p>
                    </div>
                </div>
                
                <div class="header-right">
                    ${this.options.showClock ? `
                        <div class="header-clock">
                            <span id="current-time">${this.formatTime(this.currentTime)}</span>
                            <span id="current-date">${this.formatDate(this.currentTime)}</span>
                        </div>
                    ` : ''}
                    
                    ${this.options.showVersion ? `
                        <div class="app-version">
                            <span>Version 2.0.0</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    async onAfterRender() {
        if (this.options.showClock) {
            this.startClockUpdate();
        }
    }

    startClockUpdate() {
        this.timeUpdateInterval = setInterval(() => {
            this.currentTime = new Date();
            const timeElement = this.$('#current-time');
            const dateElement = this.$('#current-date');

            if (timeElement) {
                timeElement.textContent = this.formatTime(this.currentTime);
            }

            if (dateElement) {
                dateElement.textContent = this.formatDate(this.currentTime);
            }
        }, 1000);
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour12: true,
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }

    destroy() {
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
        }
        super.destroy();
    }
}

window.AppHeaderWidget = AppHeaderWidget;
