// Main Application Entry Point
class CreditManagementApp {
    constructor() {
        this.initialized = false;
        this.currentUser = null;
        this.settings = {};
        this.lastActivity = Date.now();
        this.activityTimeout = 30 * 60 * 1000; // 30 minutes
        this.initTime = Date.now();
    }

    async initialize() {
        if (this.initialized) {
            console.warn('App already initialized');
            return;
        }

        try {
            console.log('🚀 Initializing Credit Management App...');

            // Show loading screen
            this.showLoadingScreen();

            // Initialize core services
            await this.initializeServices();

            // Load user settings
            await this.loadUserSettings();

            // Initialize Widget Manager
            await WidgetManager.initialize();

            // Setup global event handlers
            this.setupGlobalEventHandlers();

            // Setup activity monitoring
            this.setupActivityMonitoring();

            // Initialize keyboard shortcuts
            this.setupKeyboardShortcuts();

            // Perform initial data validation
            await this.validateInitialData();

            // Hide loading screen
            this.hideLoadingScreen();

            this.initialized = true;
            console.log('✅ Credit Management App initialized successfully');

            // Show welcome message for new users
            this.showWelcomeMessage();

        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.showErrorScreen(error);
        }
    }

    showLoadingScreen() {
        document.body.innerHTML = `
            <div id="app-loading-screen">
                <div class="loading-content">
                    <div class="loading-logo">💳</div>
                    <h1>IT Services Credit Management</h1>
                    <div class="loading-spinner"></div>
                    <p class="loading-message">Initializing application...</p>
                    <div class="loading-progress">
                        <div class="progress-bar"></div>
                    </div>
                </div>
            </div>
        `;
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('app-loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.remove();
            }, 500);
        }
    }

    showErrorScreen(error) {
        document.body.innerHTML = `
            <div id="app-error-screen">
                <div class="error-content">
                    <div class="error-icon">❌</div>
                    <h1>Application Error</h1>
                    <p class="error-message">Failed to initialize the application</p>
                    <div class="error-details">
                        <details>
                            <summary>Technical Details</summary>
                            <pre>${error.stack || error.message}</pre>
                        </details>
                    </div>
                    <div class="error-actions">
                        <button onclick="window.location.reload()" class="btn-primary">
                            🔄 Reload Application
                        </button>
                        <button onclick="window.CreditApp.clearAppData()" class="btn-secondary">
                            🗑️ Clear Data & Reload
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async initializeServices() {
        console.log('🔧 Initializing core services...');

        // Initialize database connection
        await this.initializeDatabase();

        // Initialize API client
        await this.initializeAPI();

        // Initialize local storage
        this.initializeLocalStorage();

        // Initialize notification system
        this.initializeNotifications();
    }

    async initializeDatabase() {
        // In a real Electron app, this would initialize SQLite
        console.log('💾 Database connection established');
    }

    async initializeAPI() {
        // Initialize API client with base configuration - FIXED FOR BROWSER
        try {
            // Detect environment safely
            const isElectron = !!(window && window.process && window.process.type);
            const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

            window.API_BASE_URL = isDevelopment ?
                'http://localhost:3000/api' : '/api';

            console.log('🌐 API client initialized for', isElectron ? 'Electron' : 'Browser', 'environment');
        } catch (error) {
            // Fallback for any environment detection issues
            window.API_BASE_URL = '/api';
            console.log('🌐 API client initialized with fallback configuration');
        }
    }

    initializeLocalStorage() {
        // Initialize local storage with default values
        const defaults = {
            theme: 'light',
            autoRefresh: true,
            refreshInterval: 30000,
            notifications: true,
            compactMode: false,
            debugMode: false
        };

        Object.entries(defaults).forEach(([key, value]) => {
            if (localStorage.getItem(key) === null) {
                localStorage.setItem(key, JSON.stringify(value));
            }
        });

        console.log('💿 Local storage initialized');
    }

    initializeNotifications() {
        // Request notification permission if supported
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        console.log('🔔 Notification system initialized');
    }

    async loadUserSettings() {
        try {
            const storedSettings = localStorage.getItem('userSettings');
            this.settings = storedSettings ? JSON.parse(storedSettings) : {};

            // Apply theme
            this.applyTheme(this.settings.theme || 'light');

            console.log('⚙️ User settings loaded');
        } catch (error) {
            console.error('Failed to load user settings:', error);
        }
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.settings.theme = theme;
        this.saveUserSettings();
    }

    saveUserSettings() {
        try {
            localStorage.setItem('userSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save user settings:', error);
        }
    }

    setupGlobalEventHandlers() {
        // Handle widget events
        document.addEventListener('widget:error', (e) => {
            console.error('Widget error:', e.detail);
            this.showNotification('Widget Error', e.detail.error?.message || 'An error occurred', 'error');
        });

        document.addEventListener('widget:dataChanged', (e) => {
            console.log('Widget data changed:', e.detail);
            // Could trigger auto-save or synchronization
        });

        // Handle navigation events
        document.addEventListener('widget:addCustomerRequested', () => {
            WidgetManager.showTab('customers');
        });

        document.addEventListener('widget:addVendorRequested', () => {
            WidgetManager.showTab('vendors');
        });

        document.addEventListener('widget:purchaseCreditsRequested', (e) => {
            WidgetManager.showTab('vendors');
            // Could pre-select vendor/service if provided in e.detail
        });

        document.addEventListener('widget:viewReceiptsRequested', (e) => {
            this.showCustomerReceipts(e.detail.customerId);
        });

        // Handle business logic events
        document.addEventListener('widget:customerAdded', (e) => {
            this.showNotification('Success', 'Customer added successfully!', 'success');
            this.refreshRelatedWidgets(['customer-list', 'dashboard-stats']);
        });

        document.addEventListener('widget:moneyAdded', (e) => {
            this.showNotification('Success', `Added ${this.formatCurrency(e.detail.amount)} to business!`, 'success');
            this.refreshRelatedWidgets(['business-balance', 'dashboard-stats']);
        });

        document.addEventListener('widget:creditsPurchased', (e) => {
            this.showNotification('Success', 'Credits purchased successfully!', 'success');
            this.refreshRelatedWidgets(['credit-balances', 'dashboard-stats']);
        });

        // Handle window events
        window.addEventListener('beforeunload', (e) => {
            // Save any pending data
            this.saveApplicationState();
        });

        window.addEventListener('online', () => {
            this.showNotification('Connection', 'Back online', 'info');
            this.refreshAllWidgets();
        });

        window.addEventListener('offline', () => {
            this.showNotification('Connection', 'Working offline', 'warning');
        });

        console.log('🎯 Global event handlers setup complete');
    }

    setupActivityMonitoring() {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        events.forEach(event => {
            document.addEventListener(event, () => {
                this.lastActivity = Date.now();
            }, { passive: true });
        });

        // Check for inactivity every minute
        setInterval(() => {
            const now = Date.now();
            if (now - this.lastActivity > this.activityTimeout) {
                this.handleInactivity();
            }
        }, 60000);

        console.log('⏰ Activity monitoring setup complete');
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts if not typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Ctrl/Cmd + shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        WidgetManager.showTab('dashboard');
                        break;
                    case '2':
                        e.preventDefault();
                        WidgetManager.showTab('customers');
                        break;
                    case '3':
                        e.preventDefault();
                        WidgetManager.showTab('vendors');
                        break;
                    case '4':
                        e.preventDefault();
                        WidgetManager.showTab('credits');
                        break;
                    case '5':
                        e.preventDefault();
                        WidgetManager.showTab('pnl');
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshCurrentTab();
                        break;
                    case 'f':
                        e.preventDefault();
                        this.focusSearch();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.showQuickAddDialog();
                        break;
                }
            }

            // Function keys
            switch (e.key) {
                case 'F1':
                    e.preventDefault();
                    this.showHelpDialog();
                    break;
                case 'F5':
                    e.preventDefault();
                    this.refreshCurrentTab();
                    break;
                case 'Escape':
                    this.closeActiveModals();
                    break;
            }
        });

        console.log('⌨️ Keyboard shortcuts setup complete');
    }

    async validateInitialData() {
        console.log('🔍 Validating initial data...');

        try {
            // Check if API endpoints are accessible
            const healthCheck = await fetch(`${window.API_BASE_URL || '/api'}/health`).catch(() => null);

            if (!healthCheck || !healthCheck.ok) {
                console.warn('API health check failed - application may have limited functionality');
            } else {
                console.log('✅ API health check passed');
            }

            console.log('✅ Initial data validation complete');
        } catch (error) {
            console.warn('Data validation encountered issues:', error);
        }
    }

    showWelcomeMessage() {
        const isFirstRun = !localStorage.getItem('hasRunBefore');

        if (isFirstRun) {
            localStorage.setItem('hasRunBefore', 'true');

            setTimeout(() => {
                this.showNotification(
                    'Welcome!',
                    'Welcome to IT Services Credit Management. Start by adding your first vendor or customer.',
                    'info',
                    10000
                );
            }, 2000);
        }
    }

    // Utility methods
    showNotification(title, message, type = 'info', duration = 5000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `app-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-icon">${this.getNotificationIcon(type)}</div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">×</button>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Bind close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);

        // Browser notification for important messages
        if (type === 'error' || type === 'warning') {
            this.showBrowserNotification(title, message);
        }
    }

    showBrowserNotification(title, message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: '/icon.png'
            });
        }
    }

    getNotificationIcon(type) {
        const icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }

    async refreshRelatedWidgets(widgetNames) {
        for (const widgetName of widgetNames) {
            const widget = WidgetManager.getWidget(widgetName);
            if (widget && typeof widget.refresh === 'function') {
                try {
                    await widget.refresh();
                } catch (error) {
                    console.error(`Failed to refresh widget ${widgetName}:`, error);
                }
            }
        }
    }

    async refreshCurrentTab() {
        try {
            await WidgetManager.refreshCurrentTab();
            this.showNotification('Refreshed', 'Current tab data has been refreshed', 'success', 2000);
        } catch (error) {
            this.showNotification('Error', 'Failed to refresh current tab', 'error');
        }
    }

    async refreshAllWidgets() {
        try {
            const activeWidgets = Array.from(WidgetManager.activeWidgets?.values() || []);
            await Promise.all(
                activeWidgets.map(widget =>
                    widget.refresh ? widget.refresh() : Promise.resolve()
                )
            );
            this.showNotification('Refreshed', 'All data has been refreshed', 'success', 2000);
        } catch (error) {
            this.showNotification('Error', 'Failed to refresh all widgets', 'error');
        }
    }

    focusSearch() {
        // Try to focus the search input in the current tab
        const searchInputs = document.querySelectorAll('input[type="text"]:not([hidden]), input[type="search"]:not([hidden])');
        const visibleSearchInputs = Array.from(searchInputs).filter(input => {
            return input.offsetParent !== null &&
                input.placeholder &&
                input.placeholder.toLowerCase().includes('search');
        });

        if (visibleSearchInputs.length > 0) {
            visibleSearchInputs[0].focus();
        }
    }

    showQuickAddDialog() {
        // Show a quick dialog to add common items
        const modal = WidgetManager.getWidget('confirmation-modal');
        if (modal) {
            modal.show({
                title: 'Quick Add',
                message: `
                    <div class="quick-add-options">
                        <button class="btn-primary quick-add-btn" data-action="customer">👥 Add Customer</button>
                        <button class="btn-primary quick-add-btn" data-action="subscription">📝 Add Subscription</button>
                        <button class="btn-primary quick-add-btn" data-action="vendor">🏭 Add Vendor</button>
                        <button class="btn-primary quick-add-btn" data-action="credits">💸 Buy Credits</button>
                    </div>
                `,
                confirmText: 'Cancel',
                cancelText: null,
                onConfirm: () => { }
            });

            // Bind quick add buttons
            setTimeout(() => {
                document.querySelectorAll('.quick-add-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const action = e.target.getAttribute('data-action');
                        modal.hide();

                        switch (action) {
                            case 'customer':
                                WidgetManager.showTab('customers');
                                break;
                            case 'subscription':
                                WidgetManager.showTab('customers');
                                break;
                            case 'vendor':
                                WidgetManager.showTab('vendors');
                                break;
                            case 'credits':
                                WidgetManager.showTab('vendors');
                                break;
                        }
                    });
                });
            }, 100);
        }
    }

    showHelpDialog() {
        const modal = WidgetManager.getWidget('confirmation-modal');
        if (modal) {
            modal.show({
                title: 'Keyboard Shortcuts',
                message: `
                    <div class="help-content">
                        <h4>Navigation:</h4>
                        <ul>
                            <li><kbd>Ctrl+1</kbd> - Dashboard</li>
                            <li><kbd>Ctrl+2</kbd> - Customers</li>
                            <li><kbd>Ctrl+3</kbd> - Vendors</li>
                            <li><kbd>Ctrl+4</kbd> - Credits</li>
                            <li><kbd>Ctrl+5</kbd> - P&L Reports</li>
                        </ul>
                        
                        <h4>Actions:</h4>
                        <ul>
                            <li><kbd>Ctrl+R</kbd> or <kbd>F5</kbd> - Refresh</li>
                            <li><kbd>Ctrl+F</kbd> - Focus Search</li>
                            <li><kbd>Ctrl+N</kbd> - Quick Add</li>
                            <li><kbd>F1</kbd> - Show this help</li>
                            <li><kbd>Escape</kbd> - Close dialogs</li>
                        </ul>
                    </div>
                `,
                confirmText: 'Got it',
                cancelText: null,
                onConfirm: () => { }
            });
        }
    }

    closeActiveModals() {
        // Close any open modal dialogs
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            if (modal.style.display !== 'none') {
                modal.style.display = 'none';
            }
        });

        // Hide dropdowns
        document.querySelectorAll('.actions-dropdown').forEach(dropdown => {
            dropdown.style.display = 'none';
        });
    }

    handleInactivity() {
        console.log('User inactive for extended period');
        // Could implement auto-save, session timeout, etc.
    }

    saveApplicationState() {
        try {
            const state = {
                currentTab: WidgetManager.currentTab,
                timestamp: Date.now(),
                settings: this.settings
            };

            localStorage.setItem('appState', JSON.stringify(state));
        } catch (error) {
            console.error('Failed to save application state:', error);
        }
    }

    async showCustomerReceipts(customerId) {
        // Create and show receipt widget
        try {
            const receiptWidget = new CustomerReceiptWidget('modal-container', {
                customerId: customerId
            });

            await receiptWidget.initialize();
        } catch (error) {
            console.error('Failed to show customer receipts:', error);
            this.showNotification('Error', 'Failed to load customer receipts', 'error');
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    }

    clearAppData() {
        if (confirm('This will clear all application data and reload. Are you sure?')) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
        }
    }

    // Public API
    getSetting(key, defaultValue = null) {
        return this.settings[key] !== undefined ? this.settings[key] : defaultValue;
    }

    setSetting(key, value) {
        this.settings[key] = value;
        this.saveUserSettings();
    }

    getStats() {
        return {
            initialized: this.initialized,
            uptime: Date.now() - this.initTime,
            activeWidgets: WidgetManager.getStats ? WidgetManager.getStats() : {},
            lastActivity: this.lastActivity
        };
    }

    async restart() {
        console.log('🔄 Restarting application...');
        this.initialized = false;
        if (WidgetManager.destroyAll) {
            WidgetManager.destroyAll();
        }
        await this.initialize();
    }
}

// Create global app instance
window.CreditApp = new CreditManagementApp();

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await CreditApp.initialize();
    } catch (error) {
        console.error('Failed to start application:', error);
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (window.CreditApp && window.CreditApp.showNotification) {
        CreditApp.showNotification(
            'Unexpected Error',
            'An unexpected error occurred. Please check the console for details.',
            'error'
        );
    }
});

// Handle JavaScript errors
window.addEventListener('error', (event) => {
    console.error('JavaScript error:', event.error);
    if (window.CreditApp && window.CreditApp.showNotification) {
        CreditApp.showNotification(
            'Application Error',
            'A JavaScript error occurred. Some features may not work properly.',
            'error'
        );
    }
});

// Export for use in other modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CreditManagementApp;
}
