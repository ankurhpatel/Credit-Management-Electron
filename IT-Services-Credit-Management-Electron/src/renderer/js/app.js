// Main App Initialization - IT Services Credit Management System
// This file only handles initialization and orchestration

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async function () {
    console.log('🚀 IT Services Credit Management System Loading...');

    try {
        // Initialize global state
        await Store.initialize();

        // Setup UI components
        Tabs.initialize();
        Forms.initialize();

        // Initialize print functionality and add print buttons to tabs
        setTimeout(() => {
            // Add print buttons to main tabs
            PrintManager.addPrintButtonToContainer('dashboard', 'Dashboard Report');
            PrintManager.addPrintButtonToContainer('pnl', 'P&L Statement');
            PrintManager.addPrintButtonToContainer('credits', 'Credit Balances Report');
            PrintManager.addPrintButtonToContainer('customers', 'Customer Management Report');
            PrintManager.addPrintButtonToContainer('vendors', 'Vendor Management Report');
            PrintManager.addPrintButtonToContainer('business', 'Business Management Report');
            PrintManager.addPrintButtonToContainer('transactions', 'Transaction History Report');

            console.log('🖨️ Print buttons added to all tabs');
        }, 2000);

        // Load initial data
        await loadInitialData();

        // Setup event listeners
        setupEventListeners();

        console.log('✅ Application initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        Alerts.showError('Failed to initialize application', error.message);
    }
});

// Load all initial data needed for the app
async function loadInitialData() {
    try {
        console.log('📊 Loading initial data...');

        // Load settings and data (needed for branding and dropdowns)
        await Promise.all([
            SettingsAPI.load(),
            CustomersAPI.loadAll(),
            VendorsAPI.loadAll()
        ]);
        
        // Apply global branding
        if (window.SettingsUI) SettingsUI.applyGlobalSettings();

        // Load dashboard data (Initializes filters + loads stats)
        await DashboardUI.init();
        
        // Setup year dropdowns for P&L
        PLReportsAPI.populateYearDropdowns();

        console.log('✅ Initial data loaded');
    } catch (error) {
        console.error('❌ Error loading initial data:', error);
        Alerts.showError('Data Loading Error', 'Failed to load application data');
    }
}

// Setup global event listeners
function setupEventListeners() {
    // Form validation on input changes
    document.addEventListener('input', Forms.handleInputValidation);

    // Auto-calculate expiration dates
    document.addEventListener('change', function (e) {
        if (e.target.name === 'startDate' || e.target.name === 'creditsSelected') {
            Forms.calculateExpirationDate();
        }
    });

    // Vendor service loading when vendor changes
    document.addEventListener('change', function (e) {
        if (e.target.id === 'vendorSelect') {
            VendorsAPI.loadServicesForVendor(e.target.value);
        }
        if (e.target.id === 'purchaseVendorSelect') {
            VendorsAPI.loadServicesForPurchase(e.target.value);
        }
    });

    // Auto-save form data (draft functionality)
    document.addEventListener('input', Helpers.debounce(Forms.autoSave, 2000));

    console.log('📋 Event listeners setup complete');
}

// Global error handler
window.addEventListener('error', function (e) {
    console.error('🚨 Global error:', e.error);
    Alerts.showError('Application Error', 'An unexpected error occurred. Please try refreshing the application.');
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', function (e) {
    console.error('🚨 Unhandled promise rejection:', e.reason);
    Alerts.showError('System Error', 'A system error occurred. Please check the console for details.');
});
