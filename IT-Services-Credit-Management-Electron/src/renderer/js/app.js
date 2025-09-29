// Main Application Entry Point
class CreditManagementApp {
    constructor() {
        this.initialized = false;
        this.currentUser = null;
        this.settings = {};
        this.lastActivity = Date.now();
        this.activityTimeout = 30 * 60 * 1000; // 30 minutes
        this.initTime = Date.now();
        this.currentTab = 'dashboard';
        this.tabWidgets = new Map(); // Store tab-specific widgets
    }

    async initialize() {
        if (this.initialized) {
            console.warn('App already initialized');
            return;
        }

        try {
            console.log('🚀 Initializing Credit Management App...');

            // Initialize core services
            await this.initializeServices();

            // Load user settings
            await this.loadUserSettings();

            // Initialize Widget Manager
            const widgetManager = new WidgetManager();
            window.widgetManager = widgetManager;

            // Setup global event handlers
            this.setupGlobalEventHandlers();

            // Setup activity monitoring
            this.setupActivityMonitoring();

            // Initialize keyboard shortcuts
            this.setupKeyboardShortcuts();

            // Perform initial data validation
            await this.validateInitialData();

            // ** CRITICAL: Create the UI structure **
            await this.createUIStructure();

            // ** CRITICAL: Initialize and show the dashboard **
            await this.initializeDashboard();

            // Hide loading screen after UI is ready
            setTimeout(() => {
                this.hideLoadingScreen();
            }, 1500);

            this.initialized = true;
            console.log('✅ Credit Management App initialized successfully');

            // Show welcome message for new users
            this.showWelcomeMessage();

        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.showErrorScreen(error);
        }
    }

    async createUIStructure() {
        try {
            console.log('🏗️ Creating UI structure...');

            // Keep loading screen but add app container
            const appContainer = document.createElement('div');
            appContainer.id = 'app-container';
            appContainer.style.display = 'none'; // Hide initially

            appContainer.innerHTML = `
                <div id="app-header"></div>
                <div id="main-navigation"></div>
                <div id="main-content">
                    <div id="dashboard-container" class="tab-content active">
                        <div id="dashboard-stats-widget"></div>
                        <div id="dashboard-alerts-widget"></div>
                        <div id="system-health-widget"></div>
                    </div>
                    <div id="customers-container" class="tab-content" style="display: none;">
                        <div id="customers-widget"></div>
                    </div>
                    <div id="vendors-container" class="tab-content" style="display: none;">
                        <div class="coming-soon">
                            <div class="coming-soon-icon">🏪</div>
                            <h3>Vendors Management</h3>
                            <p>Vendors functionality coming soon!</p>
                            <p><small>Manage your vendor relationships and services</small></p>
                        </div>
                    </div>
                    <div id="credits-container" class="tab-content" style="display: none;">
                        <div class="coming-soon">
                            <div class="coming-soon-icon">💳</div>
                            <h3>Credits Management</h3>
                            <p>Credits functionality coming soon!</p>
                            <p><small>Track and manage your credit balances</small></p>
                        </div>
                    </div>
                    <div id="business-container" class="tab-content" style="display: none;">
                        <div class="coming-soon">
                            <div class="coming-soon-icon">💼</div>
                            <h3>Business Management</h3>
                            <p>Business functionality coming soon!</p>
                            <p><small>Manage business transactions and finances</small></p>
                        </div>
                    </div>
                    <div id="pnl-container" class="tab-content" style="display: none;">
                        <div class="coming-soon">
                            <div class="coming-soon-icon">📈</div>
                            <h3>P&L Reports</h3>
                            <p>P&L functionality coming soon!</p>
                            <p><small>View detailed profit and loss reports</small></p>
                        </div>
                    </div>
                    <div id="transactions-container" class="tab-content" style="display: none;">
                        <div class="coming-soon">
                            <div class="coming-soon-icon">💰</div>
                            <h3>Transaction History</h3>
                            <p>Transactions functionality coming soon!</p>
                            <p><small>View and manage all transactions</small></p>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(appContainer);

            // Initialize app header
            const headerWidget = new AppHeaderWidget('app-header', {
                showClock: true,
                showVersion: true,
                showUser: true
            });
            await headerWidget.initialize();
            window.widgetManager.registerWidget('app-header', headerWidget);

            // **FIXED: Initialize main navigation with simple string array**
            const navWidget = new MainNavigationWidget('main-navigation', {
                tabs: [
                    'dashboard',
                    'customers',
                    'vendors',
                    'credits',
                    'business',
                    'pnl',
                    'transactions'
                ],
                showIcons: true,
                onTabChange: (tabId) => this.showTab(tabId)
            });
            await navWidget.initialize();
            window.widgetManager.registerWidget('main-navigation', navWidget);

            console.log('✅ UI structure created');
        } catch (error) {
            console.error('❌ Failed to create UI structure:', error);
            throw error;
        }
    }

    async initializeDashboard() {
        try {
            console.log('📊 Initializing dashboard...');

            // Initialize dashboard stats widget
            const statsWidget = new DashboardStatsWidget('dashboard-stats-widget', {
                autoRefresh: true,
                refreshInterval: 30000,
                showAnimations: true,
                useApi: true // Use Express API
            });
            await statsWidget.initialize();
            window.widgetManager.registerWidget('dashboard-stats', statsWidget);

            // Initialize system health widget
            const healthWidget = new SystemHealthWidget('system-health-widget', {
                autoRefresh: true,
                refreshInterval: 15000
            });
            await healthWidget.initialize();
            window.widgetManager.registerWidget('system-health', healthWidget);

            // Initialize alerts widget
            const alertsWidget = new ExpiringAlertsWidget('dashboard-alerts-widget', {
                autoRefresh: true,
                refreshInterval: 60000 // 1 minute
            });
            await alertsWidget.initialize();
            window.widgetManager.registerWidget('dashboard-alerts', alertsWidget);

            // Show the app container now that everything is loaded
            const appContainer = document.getElementById('app-container');
            if (appContainer) {
                appContainer.style.display = 'block';
            }

            console.log('✅ Dashboard initialized successfully');
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);

            // Still show the basic structure with error message
            const appContainer = document.getElementById('app-container');
            if (appContainer) {
                appContainer.style.display = 'block';
                document.getElementById('dashboard-container').innerHTML = `
                    <div class="dashboard-error">
                        <div class="error-icon">⚠️</div>
                        <h2>Dashboard Error</h2>
                        <p>Failed to load dashboard: ${error.message}</p>
                        <div class="error-actions">
                            <button onclick="window.location.reload()" class="btn btn-primary">🔄 Reload</button>
                            <button onclick="window.CreditApp.showTab('customers')" class="btn btn-secondary">👥 Try Customers</button>
                        </div>
                    </div>
                `;
            }
        }
    }

    async initializeCustomersTab() {
        try {
            console.log('👥 Initializing customers tab...');

            // Check if already initialized
            if (this.tabWidgets.has('customers')) {
                console.log('👥 Customers tab already initialized');
                return;
            }

            // Initialize customer list widget
            const customersWidget = new CustomerListWidget('customers-widget', {
                showAddButton: true,
                showSearch: true,
                showFilters: true,
                showPagination: true,
                showStats: true,
                itemsPerPage: 15
            });

            await customersWidget.initialize();
            window.widgetManager.registerWidget('customers-list', customersWidget);
            this.tabWidgets.set('customers', customersWidget);

            console.log('✅ Customers tab initialized successfully');
        } catch (error) {
            console.error('❌ Customers tab initialization failed:', error);

            // Show error message in customers container
            const customersContainer = document.getElementById('customers-widget');
            if (customersContainer) {
                customersContainer.innerHTML = `
                    <div class="tab-error">
                        <div class="error-icon">❌</div>
                        <h3>Customers Loading Error</h3>
                        <p>Failed to load customers: ${error.message}</p>
                        <button onclick="window.CreditApp.retryTabLoad('customers')" class="btn btn-primary">
                            🔄 Retry
                        </button>
                        <button onclick="window.CreditApp.showTab('dashboard')" class="btn btn-secondary">
                            📊 Back to Dashboard
                        </button>
                    </div>
                `;
            }
        }
    }

    async showTab(tabId) {
        try {
            console.log(`🔄 Switching to tab: ${tabId}`);

            // Update current tab
            this.currentTab = tabId;

            // Hide all tab contents
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => {
                content.style.display = 'none';
                content.classList.remove('active');
            });

            // Show target container
            const targetContainer = document.getElementById(`${tabId}-container`);
            if (targetContainer) {
                targetContainer.style.display = 'block';
                targetContainer.classList.add('active');

                // Initialize tab-specific widgets if needed
                await this.initializeTabWidget(tabId);

                // Update navigation active state
                this.updateNavigationState(tabId);

                console.log(`✅ Successfully switched to ${tabId} tab`);
            } else {
                console.warn(`⚠️ Container not found for tab: ${tabId}`);
                // Fallback to dashboard
                this.showTab('dashboard');
            }
        } catch (error) {
            console.error(`❌ Failed to switch to tab ${tabId}:`, error);
            this.showNotification('Tab Error', `Failed to load ${tabId} tab`, 'error');
        }
    }

    async initializeTabWidget(tabId) {
        switch (tabId) {
            case 'customers':
                await this.initializeCustomersTab();
                break;
            case 'vendors':
                await this.initializeVendorsTab();
                break;
            case 'credits':
                await this.initializeCreditsTab();
                break;
            case 'business':
                await this.initializeBusinessTab();
                break;
            case 'pnl':
                await this.initializePnLTab();
                break;
            case 'transactions':
                await this.initializeTransactionsTab();
                break;
            case 'dashboard':
                // Dashboard is already initialized
                break;
            default:
                console.log(`No specific initialization needed for ${tabId} tab`);
        }
    }

    async initializeVendorsTab() {
        if (this.tabWidgets.has('vendors')) return;

        console.log('🏪 Vendors tab - showing placeholder');
        // TODO: Implement VendorsListWidget similar to CustomerListWidget
    }

    async initializeCreditsTab() {
        if (this.tabWidgets.has('credits')) return;

        console.log('💳 Credits tab - showing placeholder');
        // TODO: Implement CreditsWidget
    }

    async initializeBusinessTab() {
        if (this.tabWidgets.has('business')) return;

        console.log('💼 Business tab - showing placeholder');
        // TODO: Implement BusinessWidget
    }

    async initializePnLTab() {
        if (this.tabWidgets.has('pnl')) return;

        console.log('📈 P&L tab - showing placeholder');
        // TODO: Implement PnLWidget
    }

    async initializeTransactionsTab() {
        if (this.tabWidgets.has('transactions')) return;

        console.log('💰 Transactions tab - showing placeholder');
        // TODO: Implement TransactionsWidget
    }

    updateNavigationState(activeTabId) {
        // Update navigation active state
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const isActive = item.dataset.tabId === activeTabId;
            item.classList.toggle('active', isActive);

            if (isActive) {
                item.setAttribute('aria-current', 'page');
            } else {
                item.removeAttribute('aria-current');
            }
        });

        // Update page title
        const tabTitles = {
            dashboard: 'Dashboard',
            customers: 'Customer Management',
            vendors: 'Vendor Management',
            credits: 'Credit Management',
            business: 'Business Management',
            pnl: 'Profit & Loss Reports',
            transactions: 'Transaction History'
        };

        document.title = `${tabTitles[activeTabId] || 'Unknown'} - IT Services Credit Management`;
    }

    async retryTabLoad(tabId) {
        // Clear the cached widget and retry loading
        this.tabWidgets.delete(tabId);
        await this.showTab(tabId);
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.transition = 'opacity 0.5s ease-out';
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    showErrorScreen(error) {
        // Hide loading screen first
        this.hideLoadingScreen();

        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.remove();
        }

        document.body.insertAdjacentHTML('beforeend', `
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
                        <button onclick="window.location.reload()" class="btn btn-primary">
                            🔄 Reload Application
                        </button>
                        <button onclick="window.CreditApp.clearAppData()" class="btn btn-secondary">
                            🗑️ Clear Data & Reload
                        </button>
                    </div>
                </div>
            </div>
            <style>
                #app-error-screen {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                }
                .error-content {
                    text-align: center;
                    padding: 3rem;
                    background: rgba(255,255,255,0.1);
                    border-radius: 12px;
                    backdrop-filter: blur(10px);
                    max-width: 600px;
                    margin: 0 2rem;
                }
                .error-icon { font-size: 4rem; margin-bottom: 1rem; }
                .error-content h1 { margin-bottom: 1rem; font-size: 2rem; }
                .error-content p { margin-bottom: 2rem; opacity: 0.9; }
                .error-details { 
                    background: rgba(0,0,0,0.2); 
                    padding: 1rem; 
                    border-radius: 8px; 
                    margin-bottom: 2rem; 
                    text-align: left; 
                    font-family: monospace; 
                    font-size: 0.875rem; 
                }
                .error-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
                .btn { 
                    padding: 0.75rem 2rem; 
                    border: none; 
                    border-radius: 6px; 
                    font-weight: 600; 
                    cursor: pointer; 
                    transition: all 0.2s; 
                    text-decoration: none;
                    display: inline-block;
                }
                .btn-primary { background: white; color: #333; }
                .btn-secondary { background: #6c757d; color: white; }
                .btn:hover { transform: translateY(-2px); }
            </style>
        `);
    }

    async initializeServices() {
        console.log('🔧 Initializing core services...');

        // Initialize API client
        await this.initializeAPI();

        // Initialize local storage
        this.initializeLocalStorage();

        // Initialize notification system
        this.initializeNotifications();
    }

    async initializeAPI() {
        // Set API base URL for your Electron server
        window.API_BASE_URL = 'http://localhost:3001/api';

        try {
            // Test API connection
            const healthResponse = await fetch(`${window.API_BASE_URL}/health`);
            if (healthResponse.ok) {
                const healthData = await healthResponse.json();
                console.log('✅ API server connection verified:', healthData);
            } else {
                console.warn('⚠️ API server responded but may have issues');
            }
        } catch (error) {
            console.warn('⚠️ API server connection failed - using fallback mode:', error.message);
            // Don't throw error - let app continue in degraded mode
        }

        console.log('🌐 API client initialized');
    }

    initializeLocalStorage() {
        const defaults = {
            theme: 'light',
            autoRefresh: true,
            refreshInterval: 30000,
            notifications: true,
            compactMode: false,
            debugMode: false,
            lastTab: 'dashboard'
        };

        Object.entries(defaults).forEach(([key, value]) => {
            if (localStorage.getItem(key) === null) {
                localStorage.setItem(key, JSON.stringify(value));
            }
        });

        console.log('💿 Local storage initialized');
    }

    initializeNotifications() {
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
        });

        // Handle stat card clicks from dashboard
        window.app = {
            handleStatClick: (statType) => {
                console.log(`Stat card clicked: ${statType}`);

                // Navigate to relevant tab based on stat type
                switch (statType) {
                    case 'totalCustomers':
                        this.showTab('customers');
                        break;
                    case 'activeSubscriptions':
                        this.showTab('transactions');
                        break;
                    case 'totalCreditsRemaining':
                    case 'lowCreditAlerts':
                        this.showTab('credits');
                        break;
                    case 'totalVendorCosts':
                        this.showTab('vendors');
                        break;
                    case 'finalNetProfit':
                    case 'netProfitFromCreditSales':
                        this.showTab('pnl');
                        break;
                    default:
                        console.log(`No navigation defined for stat: ${statType}`);
                }
            }
        };

        // Handle window events
        window.addEventListener('beforeunload', (e) => {
            this.saveApplicationState();
            localStorage.setItem('lastTab', JSON.stringify(this.currentTab));
        });

        // Handle online/offline status
        window.addEventListener('online', () => {
            this.showNotification('Connection Restored', 'You are back online', 'success');
        });

        window.addEventListener('offline', () => {
            this.showNotification('Connection Lost', 'You are now offline', 'warning');
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
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.showTab('dashboard');
                        break;
                    case '2':
                        e.preventDefault();
                        this.showTab('customers');
                        break;
                    case '3':
                        e.preventDefault();
                        this.showTab('vendors');
                        break;
                    case '4':
                        e.preventDefault();
                        this.showTab('credits');
                        break;
                    case '5':
                        e.preventDefault();
                        this.showTab('business');
                        break;
                    case '6':
                        e.preventDefault();
                        this.showTab('pnl');
                        break;
                    case '7':
                        e.preventDefault();
                        this.showTab('transactions');
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshCurrentTab();
                        break;
                    case 'n':
                        e.preventDefault();
                        if (this.currentTab === 'customers') {
                            // Trigger add customer if on customers tab
                            window.customerWidget?.showAddModal?.();
                        }
                        break;
                }
            }

            // ESC key - close modals
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal[style*="flex"]');
                modals.forEach(modal => {
                    modal.style.display = 'none';
                });
            }
        });

        console.log('⌨️ Keyboard shortcuts setup complete');
    }

    async validateInitialData() {
        console.log('🔍 Validating initial data...');

        try {
            const healthCheck = await fetch(`${window.API_BASE_URL}/health`);

            if (healthCheck.ok) {
                const healthData = await healthCheck.json();
                console.log('✅ API health check passed:', healthData);
            } else {
                console.warn('⚠️ API health check failed');
            }

        } catch (error) {
            console.warn('⚠️ Data validation encountered issues:', error);
        }

        console.log('✅ Initial data validation complete');
    }

    showWelcomeMessage() {
        const isFirstRun = !localStorage.getItem('hasRunBefore');

        if (isFirstRun) {
            localStorage.setItem('hasRunBefore', 'true');

            setTimeout(() => {
                this.showNotification(
                    'Welcome!',
                    'Welcome to IT Services Credit Management. Your dashboard is ready. Use Ctrl+1-7 for quick navigation.',
                    'info',
                    8000
                );
            }, 3000);
        } else {
            // Show returning user message with shortcuts
            setTimeout(() => {
                this.showNotification(
                    'Welcome Back!',
                    'Quick tip: Use Ctrl+2 for Customers, Ctrl+3 for Vendors, etc.',
                    'info',
                    5000
                );
            }, 2000);
        }
    }

    showNotification(title, message, type = 'info', duration = 5000) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const icon = icons[type] || 'ℹ️';
        console.log(`${icon} ${title}: ${message}`);

        // Create toast notification (you can enhance this with actual UI later)
        const toast = document.createElement('div');
        toast.className = `notification toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        // Add toast styles if not already present
        if (!document.getElementById('toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                .toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    padding: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    max-width: 400px;
                    z-index: 10000;
                    animation: slideInRight 0.3s ease;
                    border-left: 4px solid #0d6efd;
                }
                .toast.error { border-left-color: #dc3545; }
                .toast.warning { border-left-color: #ffc107; }
                .toast.success { border-left-color: #198754; }
                .toast-icon { font-size: 1.25rem; }
                .toast-title { font-weight: 600; color: #333; }
                .toast-message { color: #666; font-size: 0.875rem; }
                .toast-close { 
                    background: none; 
                    border: none; 
                    font-size: 1.25rem; 
                    cursor: pointer; 
                    padding: 0; 
                    margin-left: auto;
                    color: #999;
                }
                .toast-close:hover { color: #333; }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                /* Coming Soon Styles */
                .coming-soon {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                    text-align: center;
                    padding: 3rem;
                    color: #6c757d;
                }
                .coming-soon-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }
                .coming-soon h3 {
                    margin-bottom: 1rem;
                    color: #495057;
                }
                .coming-soon p {
                    margin-bottom: 0.5rem;
                }
                .coming-soon small {
                    opacity: 0.7;
                }
                .tab-error {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                    text-align: center;
                    padding: 3rem;
                    color: #dc3545;
                }
                .tab-error .error-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }
                .dashboard-error {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                    text-align: center;
                    padding: 3rem;
                    color: #dc3545;
                }
                .dashboard-error .error-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }
                .error-actions {
                    margin-top: 2rem;
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);
    }

    async refreshCurrentTab() {
        console.log(`🔄 Refreshing ${this.currentTab} tab...`);

        try {
            switch (this.currentTab) {
                case 'dashboard':
                    const dashboardStats = window.widgetManager?.getWidget('dashboard-stats');
                    const dashboardAlerts = window.widgetManager?.getWidget('dashboard-alerts');
                    const systemHealth = window.widgetManager?.getWidget('system-health');

                    await Promise.all([
                        dashboardStats?.refresh(),
                        dashboardAlerts?.refresh(),
                        systemHealth?.refresh()
                    ]);
                    break;

                case 'customers':
                    const customersWidget = window.widgetManager?.getWidget('customers-list');
                    await customersWidget?.refresh();
                    break;

                default:
                    console.log(`No refresh handler defined for ${this.currentTab} tab`);
            }

            this.showNotification('Refreshed', `${this.currentTab.charAt(0).toUpperCase() + this.currentTab.slice(1)} data refreshed`, 'success', 2000);
        } catch (error) {
            console.error(`Failed to refresh ${this.currentTab} tab:`, error);
            this.showNotification('Refresh Error', `Failed to refresh ${this.currentTab} data`, 'error');
        }
    }

    handleInactivity() {
        console.log('⏰ User inactive for extended period');
        this.showNotification('Inactive', 'You have been inactive for a while. Data will auto-refresh when you return.', 'info');
    }

    saveApplicationState() {
        try {
            const state = {
                timestamp: Date.now(),
                currentTab: this.currentTab,
                settings: this.settings
            };
            localStorage.setItem('appState', JSON.stringify(state));
        } catch (error) {
            console.error('Failed to save application state:', error);
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

            // Clear any cached widgets
            this.tabWidgets.clear();

            window.location.reload();
        }
    }

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
            lastActivity: this.lastActivity,
            currentTab: this.currentTab,
            loadedTabs: Array.from(this.tabWidgets.keys())
        };
    }

    // Public API for external use
    getCurrentTab() {
        return this.currentTab;
    }

    getActiveWidget() {
        return this.tabWidgets.get(this.currentTab);
    }
}

// Create global app instance
window.CreditApp = new CreditManagementApp();

// Add server connection test function
async function testServerConnection() {
    try {
        console.log('🔍 Testing server connection...');
        const response = await fetch('http://localhost:3001/api/health');

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Server is running:', data);
            return true;
        } else {
            console.error('❌ Server responded with error:', response.status, response.statusText);
            return false;
        }
    } catch (error) {
        console.error('❌ Server connection failed:', error);
        console.log('💡 Make sure your Electron app is running (which starts the server)');
        return false;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Test server connection first
        const serverReady = await testServerConnection();

        if (!serverReady) {
            // Show server connection error with retry option
            document.body.innerHTML = `
                <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                           display: flex; align-items: center; justify-content: center;
                           background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                           color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                    <div style="text-align: center; padding: 3rem; background: rgba(255,255,255,0.1); 
                               border-radius: 12px; backdrop-filter: blur(10px); max-width: 500px;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
                        <h2 style="margin-bottom: 1rem;">Server Connection Error</h2>
                        <p style="margin-bottom: 2rem; opacity: 0.9;">
                            Cannot connect to Express server on localhost:3001<br>
                            <strong>Solution:</strong> Make sure to run the app with Electron (npm start) to start the embedded server.
                        </p>
                        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                            <button onclick="location.reload()" 
                                    style="padding: 0.75rem 2rem; background: white; color: #333; 
                                           border: none; border-radius: 6px; font-weight: 600; 
                                           cursor: pointer; transition: transform 0.2s;">
                                🔄 Retry Connection
                            </button>
                            <button onclick="window.CreditApp.initialize()" 
                                    style="padding: 0.75rem 2rem; background: #6c757d; color: white; 
                                           border: none; border-radius: 6px; font-weight: 600; 
                                           cursor: pointer; transition: transform 0.2s;">
                                🚀 Start Anyway (Limited Mode)
                            </button>
                        </div>
                        <small style="display: block; margin-top: 2rem; opacity: 0.7;">
                            In limited mode, some features may not work properly.
                        </small>
                    </div>
                </div>
            `;
            return;
        }

        // Server is ready, initialize the app
        await CreditApp.initialize();
    } catch (error) {
        console.error('Failed to start application:', error);
    }
});

// Handle unhandled errors gracefully
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Don't prevent default - let errors be handled by error screen
});

window.addEventListener('error', (event) => {
    console.error('JavaScript error:', event.error);
    // Show error notification for critical errors
    if (window.CreditApp?.initialized) {
        window.CreditApp.showNotification('Application Error', 'A JavaScript error occurred. Check console for details.', 'error');
    }
});

// Export for use in other modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CreditManagementApp;
}

console.log('📱 Credit Management App script loaded');
