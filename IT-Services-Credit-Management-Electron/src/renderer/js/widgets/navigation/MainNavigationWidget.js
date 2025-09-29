class MainNavigationWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.tabs = options.tabs || [];
        this.activeTabId = null;
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            orientation: 'horizontal', // or 'vertical'
            showIcons: true,
            tabs: []
        };
    }

    async getTemplate() {
        const tabsConfig = {
            dashboard: { title: 'Dashboard', icon: '📊' },
            customers: { title: 'Customers', icon: '👥' },
            vendors: { title: 'Vendors', icon: '🏭' },
            credits: { title: 'Credits', icon: '💳' },
            business: { title: 'Business', icon: '💰' },
            pnl: { title: 'P&L Reports', icon: '📈' },
            transactions: { title: 'Transactions', icon: '💼' }
        };

        const navItems = this.tabs.map(tabId => {
            const config = tabsConfig[tabId] || { title: tabId, icon: '📄' };
            return `
                <button class="nav-item" data-tab-id="${tabId}">
                    ${this.options.showIcons ? `<span class="nav-icon">${config.icon}</span>` : ''}
                    <span class="nav-title">${config.title}</span>
                </button>
            `;
        }).join('');

        return `
            <div class="main-navigation ${this.options.orientation}">
                <div class="nav-items">
                    ${navItems}
                </div>
            </div>
        `;
    }

    async onAfterRender() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.$$('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tabId = e.currentTarget.dataset.tabId;
                this.requestTabChange(tabId);
            });
        });
    }

    requestTabChange(tabId) {
        this.activeTabId = tabId;
        this.updateActiveState();

        // Emit tab change request
        this.emit('tabRequested', { tabId });
        this.log(`Tab requested: ${tabId}`);
    }

    updateActiveState() {
        this.$$('.nav-item').forEach(item => {
            const tabId = item.dataset.tabId;
            item.classList.toggle('active', tabId === this.activeTabId);
        });
    }

    setActiveTab(tabId) {
        this.activeTabId = tabId;
        this.updateActiveState();
    }
}

window.MainNavigationWidget = MainNavigationWidget;
