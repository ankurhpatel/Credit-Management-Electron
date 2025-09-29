class MainNavigationWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.activeTab = 'dashboard';
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            tabs: [
                { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
                { id: 'pnl', label: '📈 P&L Statement', icon: '📈' },
                { id: 'credits', label: '💳 Credit Balances', icon: '💳' },
                { id: 'customers', label: '👥 Customer Management', icon: '👥' },
                { id: 'vendors', label: '🏭 Vendor Management', icon: '🏭' },
                { id: 'business', label: '💼 Business Management', icon: '💼' },
                { id: 'transactions', label: '📊 Transaction History', icon: '📊' }
            ]
        };
    }

    async getTemplate() {
        return `
            <nav class="tab-nav">
                ${this.options.tabs.map(tab => `
                    <button class="tab-btn ${tab.id === this.activeTab ? 'active' : ''}" 
                            data-tab="${tab.id}">
                        ${tab.label}
                    </button>
                `).join('')}
            </nav>
        `;
    }

    bindEvents() {
        const tabButtons = this.$$('.tab-btn');
        tabButtons.forEach(button => {
            this.addEventListener(button, 'click', (e) => {
                const tabId = e.target.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });
    }

    switchTab(tabId) {
        if (tabId === this.activeTab) return;

        console.log(`🔄 Switching tab from ${this.activeTab} to ${tabId}`);

        // Update active state
        this.$$('.tab-btn').forEach(btn => btn.classList.remove('active'));
        this.$(`[data-tab="${tabId}"]`).classList.add('active');

        this.activeTab = tabId;

        // Notify WidgetManager to handle tab switch
        WidgetManager.showTab(tabId);

        this.emit('tabChanged', { previousTab: this.activeTab, newTab: tabId });
    }

    setActiveTab(tabId) {
        this.activeTab = tabId;
        this.render();
    }
}

window.MainNavigationWidget = MainNavigationWidget;
