class SystemHealthWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.healthData = {};
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            autoRefresh: true,
            refreshInterval: 60000, // 1 minute
            showDatabaseStatus: true,
            showServerStatus: true,
            showMemoryUsage: false
        };
    }

    async loadData() {
        try {
            this.log('Checking system health...');
            const response = await fetch('/api/health');
            if (!response.ok) throw new Error('Health check failed');

            this.healthData = await response.json();
            this.log('System health loaded:', this.healthData);
        } catch (error) {
            this.handleError('Failed to check system health', error);
            this.healthData = { status: 'ERROR', message: error.message };
        }
    }

    async getTemplate() {
        const isHealthy = this.healthData.status === 'OK';

        return `
            <div class="system-health-section">
                <h3>🔧 System Health</h3>
                <div class="health-indicators">
                    <div class="health-indicator ${isHealthy ? 'healthy' : 'unhealthy'}">
                        <div class="health-icon">${isHealthy ? '✅' : '❌'}</div>
                        <div class="health-info">
                            <div class="health-status">System Status: ${this.healthData.status}</div>
                            <div class="health-timestamp">
                                Last Check: ${this.formatDate(this.healthData.timestamp, {
            hour: '2-digit',
            minute: '2-digit'
        })}
                            </div>
                            ${this.healthData.uptime ? `
                                <div class="health-uptime">
                                    Uptime: ${this.formatUptime(this.healthData.uptime)}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${this.options.showDatabaseStatus ? `
                        <div class="health-indicator healthy">
                            <div class="health-icon">🗄️</div>
                            <div class="health-info">
                                <div class="health-status">Database: ${this.healthData.database || 'Connected'}</div>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${this.options.showServerStatus ? `
                        <div class="health-indicator healthy">
                            <div class="health-icon">🌐</div>
                            <div class="health-info">
                                <div class="health-status">Server: Running</div>
                                <div class="health-version">Version: ${this.healthData.version || '2.0.0'}</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
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
