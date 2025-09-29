class SystemHealthWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.healthData = {};
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            autoRefresh: true,
            refreshInterval: 15000,
            showDetails: true
        };
    }

    async loadData() {
        try {
            this.log('Checking system health...');

            // Use Electron IPC instead of HTTP fetch
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                const health = await ipcRenderer.invoke('db-get-health');

                this.healthData = {
                    status: health.status || 'healthy',
                    api: health,
                    timestamp: new Date().toISOString(),
                    uptime: this.formatUptime(health.uptime || 0)
                };
            } else {
                // Fallback for browser testing
                this.healthData = {
                    status: 'unknown',
                    api: { database: 'Unknown', version: '2.0.0' },
                    timestamp: new Date().toISOString(),
                    uptime: 'Unknown'
                };
            }

            this.log('System health loaded:', this.healthData);
        } catch (error) {
            this.handleError('Failed to load system health', error);
            this.healthData = {
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async getTemplate() {
        if (!this.healthData || Object.keys(this.healthData).length === 0) {
            return '<div class="system-health-loading">Checking system health...</div>';
        }

        const isHealthy = this.healthData.status === 'healthy';
        const statusIcon = isHealthy ? '✅' : '❌';
        const statusText = isHealthy ? 'System Healthy' : 'System Issues Detected';

        return `
            <div class="system-health">
                <h3>${statusIcon} ${statusText}</h3>
                
                ${isHealthy ? this.getHealthyTemplate() : this.getErrorTemplate()}
                
                <div class="health-footer">
                    <small>Last checked: ${new Date(this.healthData.timestamp).toLocaleString()}</small>
                    <button class="btn-health-refresh" onclick="window.widgetManager.getWidget('system-health').refresh()">
                        🔄 Check Now
                    </button>
                </div>
            </div>
        `;
    }

    getHealthyTemplate() {
        const api = this.healthData.api || {};

        return `
            <div class="health-metrics">
                <div class="health-item">
                    <span class="health-label">Database:</span>
                    <span class="health-value success">${api.database || 'Connected'}</span>
                </div>
                
                <div class="health-item">
                    <span class="health-label">Application Uptime:</span>
                    <span class="health-value">${this.healthData.uptime}</span>
                </div>
                
                <div class="health-item">
                    <span class="health-label">Version:</span>
                    <span class="health-value">${api.version || '2.0.0'}</span>
                </div>
            </div>
        `;
    }

    getErrorTemplate() {
        return `
            <div class="health-error">
                <div class="error-message">
                    <p><strong>Error:</strong> ${this.healthData.error || 'Unknown error occurred'}</p>
                    <p>Database connection may be unavailable.</p>
                </div>
                
                <div class="error-actions">
                    <button class="btn btn-primary" onclick="window.widgetManager.getWidget('system-health').refresh()">
                        🔄 Retry Connection
                    </button>
                </div>
            </div>
        `;
    }

    formatUptime(seconds) {
        const safeSeconds = parseFloat(seconds) || 0;

        if (safeSeconds === 0) return '0s';

        const hours = Math.floor(safeSeconds / 3600);
        const minutes = Math.floor((safeSeconds % 3600) / 60);
        const secs = Math.floor(safeSeconds % 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    async onAfterRender() {
        if (this.options.autoRefresh) {
            this.startAutoRefresh();
        }
    }

    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(async () => {
            await this.refresh();
        }, this.options.refreshInterval);
    }

    destroy() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        super.destroy();
    }
}

window.SystemHealthWidget = SystemHealthWidget;
