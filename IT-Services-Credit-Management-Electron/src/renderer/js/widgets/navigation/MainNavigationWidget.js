class MainNavigationWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.tabs = options.tabs || [];
        this.activeTabId = 'dashboard';
        this.onTabChange = options.onTabChange || null;
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            orientation: 'horizontal',
            showIcons: true,
            tabs: []
        };
    }

    async loadData() {
        // No data loading needed for navigation
        this.log('Navigation widget loaded');
    }

    async getTemplate() {
        // Handle both old array format and new object format
        const navItems = this.tabs.map(tab => {
            let tabId, tabTitle, tabIcon;

            // Support both formats: string arrays and object arrays
            if (typeof tab === 'string') {
                tabId = tab;
                tabTitle = this.getDefaultTabTitle(tab);
                tabIcon = this.getDefaultTabIcon(tab);
            } else if (typeof tab === 'object') {
                tabId = tab.id;
                tabTitle = tab.title || this.getDefaultTabTitle(tab.id);
                tabIcon = tab.icon || this.getDefaultTabIcon(tab.id);
            } else {
                console.error('Invalid tab format:', tab);
                return '';
            }

            const isActive = tabId === this.activeTabId;

            return `
                <button class="nav-item ${isActive ? 'active' : ''}" 
                        data-tab-id="${tabId}"
                        onclick="window.mainNav.handleTabClick('${tabId}')"
                        title="${tabTitle}">
                    ${this.options.showIcons ? `<span class="nav-icon">${tabIcon}</span>` : ''}
                    <span class="nav-title">${tabTitle}</span>
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

    getDefaultTabTitle(tabId) {
        const defaultTitles = {
            dashboard: 'Dashboard',
            customers: 'Customers',
            vendors: 'Vendors',
            credits: 'Credits',
            business: 'Business',
            pnl: 'P&L Reports',
            transactions: 'Transactions'
        };
        return defaultTitles[tabId] || tabId.charAt(0).toUpperCase() + tabId.slice(1);
    }

    getDefaultTabIcon(tabId) {
        const defaultIcons = {
            dashboard: '📊',
            customers: '👥',
            vendors: '🏪',
            credits: '💳',
            business: '💼',
            pnl: '📈',
            transactions: '💰'
        };
        return defaultIcons[tabId] || '📄';
    }

    async onAfterRender() {
        // Set up global reference for onclick handlers
        window.mainNav = this;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Additional setup if needed
        console.log('Navigation event listeners setup complete');
    }

    handleTabClick(tabId) {
        try {
            console.log(`Navigation: Tab clicked - ${tabId}`);

            // Update active state
            this.setActiveTab(tabId);

            // Call the callback if provided
            if (this.onTabChange && typeof this.onTabChange === 'function') {
                this.onTabChange(tabId);
            } else {
                console.warn('No onTabChange callback provided');
            }
        } catch (error) {
            console.error('Navigation tab click error:', error);
        }
    }

    setActiveTab(tabId) {
        this.activeTabId = tabId;
        this.updateActiveState();
    }

    updateActiveState() {
        // Update navigation buttons
        const navItems = this.$$('.nav-item');
        navItems.forEach(item => {
            const itemTabId = item.dataset.tabId;
            const isActive = itemTabId === this.activeTabId;

            item.classList.toggle('active', isActive);

            if (isActive) {
                item.setAttribute('aria-current', 'page');
            } else {
                item.removeAttribute('aria-current');
            }
        });
    }
}

window.MainNavigationWidget = MainNavigationWidget;
