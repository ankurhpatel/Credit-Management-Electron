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

            // Create the main app container (preserve loading screen)
            const loadingScreen = document.getElementById('loading-screen');

            // Add the main app structure
            document.body.insertAdjacentHTML('beforeend', `
                <div id="app-container" style="display: none;">
                    <div id="app-header"></div>
                    <div id="main-navigation"></div>
                    <div id="main-content">
                        <div id="dashboard-container">
                            <div id="dashboard-stats-widget"></div>
                            <div id="dashboard-alerts-widget"></div>
                            <div id="system-health-widget"></div>
                        </div>
                    </div>
                </div>
            `);

            // Initialize app header
            const headerWidget = new AppHeaderWidget('app-header', {
                showClock: true,
                showVersion: true
            });
            await headerWidget.initialize();
            window.widgetManager.registerWidget('app-header', headerWidget);

            // Initialize main navigation
            const navWidget = new MainNavigationWidget('main-navigation', {
                tabs: ['dashboard', 'customers', 'vendors', 'credits', 'business', 'pnl', 'transactions'],
                showIcons: true
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
                showAnimations: true
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
            const alertsWidget = new ExpiringAlertsWidget('dashboard-alerts-widget');
            await alertsWidget.initialize();
            window.widgetManager.registerWidget('dashboard-alerts', alertsWidget);

            // Show the app container
            const appContainer = document.getElementById('app-container');
            if (appContainer) {
                appContainer.style.display = 'block';
            }

            console.log('✅ Dashboard initialized successfully');
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
            // Still show the basic structure
            const appContainer = document.getElementById('app-container');
            if (appContainer) {
                appContainer.style.display = 'block';
                document.getElementById('dashboard-container').innerHTML = `
                    <div class="dashboard-error">
                        <h2>⚠️ Dashboard Error</h2>
                        <p>Failed to load dashboard widgets: ${error.message}</p>
                        <button onclick="window.location.reload()" class="btn-primary">🔄 Reload</button>
                    </div>
                `;
            }
        }
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
                        <button onclick="window.location.reload()" class="btn-primary">
                            🔄 Reload Application
                        </button>
                        <button onclick="window.CreditApp.clearAppData()" class="btn-secondary">
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
                .error-actions { display: flex; gap: 1rem; justify-content: center; }
                .btn-primary, .btn-secondary { 
                    padding: 0.75rem 2rem; 
                    border: none; 
                    border-radius: 6px; 
                    font-weight: 600; 
                    cursor: pointer; 
                    transition: all 0.2s; 
                }
                .btn-primary { background: white; color: #333; }
                .btn-secondary { background: #6c757d; color: white; }
                .btn-primary:hover, .btn-secondary:hover { transform: translateY(-2px); }
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
                console.log('✅ API server connection verified');
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

        // Handle window events
        window.addEventListener('beforeunload', (e) => {
            this.saveApplicationState();
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
                        this.showTab('pnl');
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshCurrentTab();
                        break;
                }
            }
        });

        console.log('⌨️ Keyboard shortcuts setup complete');
    }

    async validateInitialData() {
        console.log('🔍 Validating initial data...');

        try {
            const healthCheck = await fetch(`${window.API_BASE_URL}/health`);

            if (healthCheck.ok) {
                console.log('✅ API health check passed');
            } else {
                console.warn('⚠️ API health check failed');
            }

        } catch (error) {
            console.warn('⚠️ Data validation encountered issues:', error);
        }

        console.log('✅ Initial data validation complete');
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
                    <div id="dashboard-container">
                        <div id="dashboard-stats-widget"></div>
                        <div id="dashboard-alerts-widget"></div>
                        <div id="system-health-widget"></div>
                    </div>
                </div>
            `;

            document.body.appendChild(appContainer);

            // Initialize app header
            const headerWidget = new AppHeaderWidget('app-header', {
                showClock: true,
                showVersion: true
            });
            await headerWidget.initialize();
            window.widgetManager.registerWidget('app-header', headerWidget);

            // Initialize main navigation
            const navWidget = new MainNavigationWidget('main-navigation', {
                tabs: ['dashboard', 'customers', 'vendors', 'credits', 'business', 'pnl', 'transactions'],
                showIcons: true
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
                showAnimations: true
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
            const alertsWidget = new ExpiringAlertsWidget('dashboard-alerts-widget');
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
                        <button onclick="window.location.reload()" class="btn-primary">🔄 Reload</button>
                    </div>
                `;
            }
        }
    }

    showWelcomeMessage() {
        const isFirstRun = !localStorage.getItem('hasRunBefore');

        if (isFirstRun) {
            localStorage.setItem('hasRunBefore', 'true');

            setTimeout(() => {
                this.showNotification(
                    'Welcome!',
                    'Welcome to IT Services Credit Management. Your dashboard is now ready.',
                    'info',
                    8000
                );
            }, 3000);
        }
    }

    showTab(tabId) {
        console.log(`Requesting tab change to: ${tabId}`);

        // Basic tab switching - you can enhance this later
        const tabContents = document.querySelectorAll('[id$="-container"]');
        tabContents.forEach(content => {
            content.style.display = 'none';
        });

        const targetContainer = document.getElementById(`${tabId}-container`);
        if (targetContainer) {
            targetContainer.style.display = 'block';
        } else {
            // Show dashboard as fallback
            const dashboardContainer = document.getElementById('dashboard-container');
            if (dashboardContainer) {
                dashboardContainer.style.display = 'block';
            }
        }

        // Update navigation active state
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.tabId === tabId);
        });
    }

    showNotification(title, message, type = 'info', duration = 5000) {
        console.log(`📢 ${type.toUpperCase()}: ${title} - ${message}`);

        // Simple notification (you can enhance this later)
        if (type === 'error') {
            console.error(`❌ ${title}: ${message}`);
        } else if (type === 'warning') {
            console.warn(`⚠️ ${title}: ${message}`);
        } else {
            console.log(`ℹ️ ${title}: ${message}`);
        }
    }

    async refreshCurrentTab() {
        console.log('🔄 Refreshing current tab...');
        // Implement refresh logic
        const dashboardStats = window.widgetManager?.getWidget('dashboard-stats');
        if (dashboardStats) {
            await dashboardStats.refresh();
        }
    }

    handleInactivity() {
        console.log('⏰ User inactive for extended period');
    }

    saveApplicationState() {
        try {
            const state = {
                timestamp: Date.now(),
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
            lastActivity: this.lastActivity
        };
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

// Handle unhandled errors
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

window.addEventListener('error', (event) => {
    console.error('JavaScript error:', event.error);
});

// Export for use in other modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CreditManagementApp;
}

console.log('📱 Credit Management App script loaded');
