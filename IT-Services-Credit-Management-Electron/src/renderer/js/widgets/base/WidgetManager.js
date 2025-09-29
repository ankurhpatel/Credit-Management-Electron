class WidgetManagerClass {
    constructor() {
        this.widgets = new Map();
        this.activeWidgets = new Map();
        this.currentTab = null;
        this.tabContainer = null;
        this.initialized = false;
        this.defaultTabs = {
            dashboard: {
                title: 'Dashboard',
                icon: '📊',
                widgetClass: 'DashboardStatsWidget'
            },
            customers: {
                title: 'Customers',
                icon: '👥',
                widgetClass: 'CustomerListWidget'
            },
            vendors: {
                title: 'Vendors',
                icon: '🏭',
                widgetClass: 'VendorListWidget'
            },
            credits: {
                title: 'Credits',
                icon: '💳',
                widgetClass: 'CreditBalancesWidget'
            },
            business: {
                title: 'Business',
                icon: '💰',
                widgetClass: 'BusinessBalanceWidget'
            },
            pnl: {
                title: 'P&L Reports',
                icon: '📈',
                widgetClass: 'MonthlyPLWidget'
            },
            transactions: {
                title: 'Transactions',
                icon: '💳',
                widgetClass: 'TransactionListWidget'
            }
        };
    }

    async initialize() {
        if (this.initialized) {
            console.warn('WidgetManager already initialized');
            return;
        }

        try {
            console.log('🎯 Initializing Widget Manager...');

            // Initialize the main application container
            await this.initializeAppContainer();

            // Initialize tab container
            await this.initializeTabContainer();

            // Create shared/modal widgets
            await this.initializeSharedWidgets();

            // Setup default tabs
            await this.setupDefaultTabs();

            // Setup global widget event handlers
            this.setupGlobalWidgetHandlers();

            // Show default tab
            this.showTab('dashboard');

            this.initialized = true;
            console.log('✅ Widget Manager initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize Widget Manager:', error);
            throw error;
        }
    }

    async initializeAppContainer() {
        // Create main app structure if it doesn't exist
        if (document.getElementById('app-container')) {
            console.log('App container already exists');
            return;
        }

        document.body.innerHTML = `
            <div id="app-container">
                <header id="app-header">
                    <!-- Header will be managed by AppHeaderWidget -->
                </header>
                
                <nav id="main-navigation">
                    <!-- Navigation will be managed by MainNavigationWidget -->
                </nav>
                
                <main id="main-content">
                    <div id="tab-container">
                        <!-- Tab content will be managed by TabContainerWidget -->
                    </div>
                </main>
                
                <div id="modal-container">
                    <!-- Modal dialogs will be rendered here -->
                </div>
                
                <div id="notification-container">
                    <!-- Notifications will be rendered here -->
                </div>
            </div>
        `;

        console.log('📱 App container structure created');
    }

    async initializeTabContainer() {
        const tabContainerElement = document.getElementById('tab-container');
        if (!tabContainerElement) {
            throw new Error('Tab container element not found');
        }

        // Initialize tab container widget
        this.tabContainer = new TabContainerWidget('tab-container', {
            showTabIcons: true,
            allowTabClose: false,
            animated: true
        });

        await this.tabContainer.initialize();

        // Listen for tab activation events
        this.tabContainer.on('tabActivated', (event) => {
            this.currentTab = event.tabId;
            console.log(`📋 Tab activated: ${event.tabId}`);
        });

        console.log('📋 Tab container initialized');
    }

    async initializeSharedWidgets() {
        console.log('🔧 Initializing shared widgets...');

        // Initialize confirmation modal
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) {
            const confirmationModal = new ConfirmationModalWidget('modal-container');
            await confirmationModal.initialize();
            this.registerWidget('confirmation-modal', confirmationModal);
        }

        // Initialize app header
        const appHeader = document.getElementById('app-header');
        if (appHeader) {
            const headerWidget = new AppHeaderWidget('app-header');
            await headerWidget.initialize();
            this.registerWidget('app-header', headerWidget);
        }

        // Initialize main navigation
        const mainNav = document.getElementById('main-navigation');
        if (mainNav) {
            const navWidget = new MainNavigationWidget('main-navigation', {
                tabs: Object.keys(this.defaultTabs)
            });
            await navWidget.initialize();
            this.registerWidget('main-navigation', navWidget);

            // Listen for navigation events
            navWidget.on('tabRequested', (event) => {
                this.showTab(event.tabId);
            });
        }

        console.log('✅ Shared widgets initialized');
    }

    async setupDefaultTabs() {
        console.log('📋 Setting up default tabs...');

        // Add all default tabs to the tab container
        Object.entries(this.defaultTabs).forEach(([tabId, config]) => {
            this.tabContainer.addTab(tabId, {
                title: config.title,
                icon: config.icon,
                widgetClass: config.widgetClass,
                closable: false
            });
        });

        console.log('✅ Default tabs setup complete');
    }

    setupGlobalWidgetHandlers() {
        // Global error handler for widgets
        document.addEventListener('widget:error', (event) => {
            console.error('Widget error:', event.detail);
            this.handleWidgetError(event.detail.widgetId, event.detail.error);
        });

        // Global data change handler
        document.addEventListener('widget:dataChanged', (event) => {
            console.log('Widget data changed:', event.detail);
            this.handleDataChange(event.detail.widgetId, event.detail.data);
        });

        // Handle widget lifecycle events
        document.addEventListener('widget:destroyed', (event) => {
            this.handleWidgetDestroyed(event.detail.widgetId);
        });

        console.log('🎧 Global widget event handlers setup');
    }

    // Tab management methods
    showTab(tabId) {
        if (!this.tabContainer) {
            console.error('Tab container not initialized');
            return false;
        }

        if (!this.tabContainer.hasTab(tabId)) {
            console.error(`Tab ${tabId} does not exist`);
            return false;
        }

        return this.tabContainer.activateTab(tabId);
    }

    addTab(tabId, config) {
        if (!this.tabContainer) {
            console.error('Tab container not initialized');
            return false;
        }

        return this.tabContainer.addTab(tabId, config);
    }

    removeTab(tabId) {
        if (!this.tabContainer) {
            console.error('Tab container not initialized');
            return false;
        }

        return this.tabContainer.removeTab(tabId);
    }

    getCurrentTab() {
        return this.currentTab;
    }

    // Widget management methods
    registerWidget(widgetId, widget) {
        if (this.widgets.has(widgetId)) {
            console.warn(`Widget ${widgetId} is already registered`);
            return false;
        }

        this.widgets.set(widgetId, widget);
        this.activeWidgets.set(widgetId, widget);

        console.log(`📝 Widget registered: ${widgetId}`);
        return true;
    }

    unregisterWidget(widgetId) {
        const widget = this.widgets.get(widgetId);
        if (widget) {
            if (typeof widget.destroy === 'function') {
                widget.destroy();
            }
            this.widgets.delete(widgetId);
            this.activeWidgets.delete(widgetId);
            console.log(`🗑️ Widget unregistered: ${widgetId}`);
            return true;
        }
        return false;
    }

    getWidget(widgetId) {
        return this.widgets.get(widgetId);
    }

    getAllWidgets() {
        return Array.from(this.widgets.values());
    }

    // Widget lifecycle methods
    async createWidget(widgetClass, containerId, options = {}) {
        try {
            // Get widget class from global scope
            const WidgetClass = window[widgetClass];
            if (!WidgetClass) {
                throw new Error(`Widget class ${widgetClass} not found`);
            }

            // Create and initialize widget
            const widget = new WidgetClass(containerId, options);
            await widget.initialize();

            return widget;
        } catch (error) {
            console.error(`Failed to create widget ${widgetClass}:`, error);
            throw error;
        }
    }

    async refreshCurrentTab() {
        if (!this.currentTab) {
            console.warn('No active tab to refresh');
            return;
        }

        const tab = this.tabContainer.getTab(this.currentTab);
        if (tab && tab.widget && typeof tab.widget.refresh === 'function') {
            try {
                await tab.widget.refresh();
                console.log(`🔄 Tab ${this.currentTab} refreshed`);
            } catch (error) {
                console.error(`Failed to refresh tab ${this.currentTab}:`, error);
                throw error;
            }
        }
    }

    async refreshAllWidgets() {
        const refreshPromises = [];

        this.activeWidgets.forEach((widget, widgetId) => {
            if (typeof widget.refresh === 'function') {
                refreshPromises.push(
                    widget.refresh().catch(error => {
                        console.error(`Failed to refresh widget ${widgetId}:`, error);
                    })
                );
            }
        });

        await Promise.all(refreshPromises);
        console.log('🔄 All widgets refreshed');
    }

    // Event handlers
    handleWidgetError(widgetId, error) {
        console.error(`Widget ${widgetId} error:`, error);

        // Show error notification
        const errorWidget = this.getWidget('error-display');
        if (errorWidget) {
            errorWidget.showError(`Widget Error: ${widgetId}`, error.message);
        }

        // Emit global error event
        document.dispatchEvent(new CustomEvent('app:widgetError', {
            detail: { widgetId, error }
        }));
    }

    handleDataChange(widgetId, data) {
        console.log(`Widget ${widgetId} data changed:`, data);

        // Emit global data change event
        document.dispatchEvent(new CustomEvent('app:dataChanged', {
            detail: { widgetId, data }
        }));
    }

    handleWidgetDestroyed(widgetId) {
        this.activeWidgets.delete(widgetId);
        console.log(`Widget ${widgetId} destroyed and removed from active widgets`);
    }

    // Utility methods
    showModal(modalConfig) {
        const modal = this.getWidget('confirmation-modal');
        if (modal) {
            modal.show(modalConfig);
        } else {
            console.error('Confirmation modal not available');
        }
    }

    hideAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    showNotification(title, message, type = 'info') {
        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">×</button>
        `;

        const container = document.getElementById('notification-container');
        if (container) {
            container.appendChild(notification);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 5000);

            // Bind close button
            notification.querySelector('.notification-close').addEventListener('click', () => {
                notification.remove();
            });
        }
    }

    // State management
    getStats() {
        return {
            totalWidgets: this.widgets.size,
            activeWidgets: this.activeWidgets.size,
            currentTab: this.currentTab,
            initialized: this.initialized,
            tabs: this.tabContainer ? this.tabContainer.getTabCount() : 0
        };
    }

    getState() {
        return {
            currentTab: this.currentTab,
            widgets: Array.from(this.widgets.keys()),
            tabState: this.tabContainer ? this.tabContainer.getState() : null
        };
    }

    async restoreState(state) {
        if (state.currentTab) {
            this.showTab(state.currentTab);
        }

        if (state.tabState && this.tabContainer) {
            this.tabContainer.restoreState(state.tabState);
        }
    }

    // Cleanup methods
    destroyWidget(widgetId) {
        return this.unregisterWidget(widgetId);
    }

    destroyAll() {
        console.log('🧹 Destroying all widgets...');

        // Destroy all registered widgets
        this.widgets.forEach((widget, widgetId) => {
            try {
                if (typeof widget.destroy === 'function') {
                    widget.destroy();
                }
            } catch (error) {
                console.error(`Error destroying widget ${widgetId}:`, error);
            }
        });

        // Destroy tab container
        if (this.tabContainer && typeof this.tabContainer.destroy === 'function') {
            this.tabContainer.destroy();
        }

        // Clear all collections
        this.widgets.clear();
        this.activeWidgets.clear();
        this.currentTab = null;
        this.tabContainer = null;
        this.initialized = false;

        console.log('✅ All widgets destroyed');
    }

    // Development helpers
    debugInfo() {
        return {
            widgets: Array.from(this.widgets.keys()),
            activeWidgets: Array.from(this.activeWidgets.keys()),
            currentTab: this.currentTab,
            stats: this.getStats()
        };
    }

    listWidgets() {
        console.table(this.debugInfo());
    }
}

// Create singleton instance
const WidgetManager = new WidgetManagerClass();

// Make it globally available
window.WidgetManager = WidgetManager;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WidgetManager;
}
