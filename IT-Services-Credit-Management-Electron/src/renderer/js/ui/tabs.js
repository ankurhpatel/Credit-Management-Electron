// Tab navigation management - IT Services Credit Management System
class Tabs {
    static currentTab = 'dashboard';
    static tabHistory = [];

    static initialize() {
        console.log('📋 Initializing tab system...');

        try {
            // Set up tab click handlers
            this.setupTabHandlers();

            // Restore last active tab or default to dashboard
            const savedTab = Store.getCurrentTab();
            this.showTab(savedTab || 'dashboard');

            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();

            console.log('✅ Tab system initialized');
        } catch (error) {
            console.error('❌ Error initializing tab system:', error);
            // Fallback to dashboard
            this.showTab('dashboard');
        }
    }

    static setupTabHandlers() {
        // Main tab navigation handlers
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = this.getTabNameFromButton(btn);
                if (tabName) {
                    this.showTab(tabName);
                }
            });
        });

        // P&L sub-tabs handlers
        document.querySelectorAll('#pnl .tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = this.getPLTabFromButton(btn);
                if (tabName) {
                    this.showPLTab(tabName);
                }
            });
        });

        // Transaction sub-tabs handlers
        document.querySelectorAll('#transactions .tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = this.getTransactionTabFromButton(btn);
                if (tabName) {
                    this.showTransactionTab(tabName);
                }
            });
        });

        // Customer sub-tabs handlers
        document.querySelectorAll('.customer-tabs .tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = this.getCustomerTabFromButton(btn);
                if (tabName) {
                    this.showCustomerTab(tabName);
                }
            });
        });

        // Vendor sub-tabs handlers
        document.querySelectorAll('.vendor-tabs .tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = this.getVendorTabFromButton(btn);
                if (tabName) {
                    this.showVendorTab(tabName);
                }
            });
        });

        // Handle back/forward browser navigation
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.tab) {
                this.showTab(e.state.tab, false); // false = don't push to history again
            }
        });

        console.log('📋 Tab event handlers setup complete');
    }

    static setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when not in input fields
            if (e.target.tagName.toLowerCase() === 'input' ||
                e.target.tagName.toLowerCase() === 'textarea' ||
                e.target.tagName.toLowerCase() === 'select') {
                return;
            }

            // Ctrl/Cmd + number keys for tab switching
            if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                const tabIndex = parseInt(e.key) - 1;
                const tabs = ['dashboard', 'pnl', 'credits', 'customers', 'vendors', 'business', 'transactions'];

                if (tabs[tabIndex]) {
                    this.showTab(tabs[tabIndex]);
                }
            }

            // ESC key to go to dashboard
            if (e.key === 'Escape') {
                this.showTab('dashboard');
            }
        });
    }

    static getTabNameFromButton(button) {
        // Try multiple methods to get tab name

        // Method 1: onclick attribute
        const onclickAttr = button.getAttribute('onclick');
        if (onclickAttr) {
            const match = onclickAttr.match(/showTab\(['"]([^'"]+)['"]\)/);
            if (match) return match[1];
        }

        // Method 2: data-tab attribute
        const dataTab = button.getAttribute('data-tab');
        if (dataTab) return dataTab;

        // Method 3: href attribute (if it's a link)
        const href = button.getAttribute('href');
        if (href && href.startsWith('#')) {
            return href.substring(1);
        }

        // Method 4: button text mapping
        const buttonText = button.textContent.trim();
        const textToTabMap = {
            '🛒 New Sale (POS)': 'pos',
            '📊 Dashboard': 'dashboard',
            '📈 P&L Statement': 'pnl',
            '💳 Credit Balances': 'credits',
            '👥 Customer Management': 'customers',
            '🏭 Vendor Management': 'vendors',
            '💼 Business Management': 'business',
            '📊 Transaction History': 'transactions'
        };

        return textToTabMap[buttonText] || null;
    }

    static getPLTabFromButton(button) {
        const onclickAttr = button.getAttribute('onclick');
        if (onclickAttr) {
            const match = onclickAttr.match(/showPLTab\(['"]([^'"]+)['"]\)/);
            if (match) return match[1];
        }

        const dataTab = button.getAttribute('data-tab');
        if (dataTab) return dataTab;

        // Text mapping for P&L tabs
        const buttonText = button.textContent.trim();
        const textToTabMap = {
            '📅 Monthly': 'monthly',
            '📆 Yearly': 'yearly'
        };

        return textToTabMap[buttonText] || null;
    }

    static getTransactionTabFromButton(button) {
        const onclickAttr = button.getAttribute('onclick');
        if (onclickAttr) {
            const match = onclickAttr.match(/showTransactionTab\(['"]([^'"]+)['"]\)/);
            if (match) return match[1];
        }

        const dataTab = button.getAttribute('data-tab');
        if (dataTab) return dataTab;

        // Text mapping for transaction tabs
        const buttonText = button.textContent.trim();
        const textToTabMap = {
            '🏭 Vendor Purchases': 'vendor-purchases',
            '👤 Customer Sales': 'customer-sales'
        };

        return textToTabMap[buttonText] || null;
    }

    static getCustomerTabFromButton(button) {
        const onclickAttr = button.getAttribute('onclick');
        if (onclickAttr) {
            const match = onclickAttr.match(/showCustomerTab\(['"]([^'"]+)['"]\)/);
            if (match) return match[1];
        }

        const dataTab = button.getAttribute('data-tab');
        if (dataTab) return dataTab;

        // Text mapping for customer tabs
        const buttonText = button.textContent.trim();
        const textToTabMap = {
            '📋 Customer List': 'customer-list',
            '➕ Add Customer': 'add-customer',
            '📝 Add Subscription': 'add-subscription',
            '✏️ Edit Customer': 'edit-customer'
        };

        return textToTabMap[buttonText] || null;
    }

    static getVendorTabFromButton(button) {
        const onclickAttr = button.getAttribute('onclick');
        if (onclickAttr) {
            const match = onclickAttr.match(/showVendorTab\(['"]([^'"]+)['"]\)/);
            if (match) return match[1];
        }

        const dataTab = button.getAttribute('data-tab');
        if (dataTab) return dataTab;

        // Text mapping for vendor tabs
        const buttonText = button.textContent.trim();
        const textToTabMap = {
            '📋 Vendor List': 'vendor-list',
            '➕ Add Vendor': 'add-vendor',
            '🔧 Service Catalog': 'vendor-services',
            '💸 Purchase Credits': 'purchase-credits'
        };

        return textToTabMap[buttonText] || null;
    }

    static async showTab(tabName, pushHistory = true) {
        try {
            console.log(`📂 Switching to tab: ${tabName}`);

            // Validate tab name
            const validTabs = [
                'pos', 'dashboard', 'pnl', 'credits', 'customers', 'vendors', 'business', 'transactions', 'settings'
            ];

            if (!validTabs.includes(tabName)) {
                console.warn(`⚠️ Invalid tab name: ${tabName}, defaulting to dashboard`);
                tabName = 'dashboard';
            }

            // Hide all tabs with fade out effect
            const allTabs = document.querySelectorAll('.tab-content');
            allTabs.forEach(tab => {
                tab.classList.remove('active');
                tab.style.opacity = '0';
            });

            // Remove active class from all buttons
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            // Short delay for smooth transition
            await new Promise(resolve => setTimeout(resolve, 150));

            // Show selected tab with fade in effect
            const tabElement = document.getElementById(tabName);
            if (tabElement) {
                tabElement.classList.add('active');
                tabElement.style.opacity = '1';
            } else {
                console.error(`❌ Tab element not found: ${tabName}`);
                return;
            }

            // Add active class to corresponding button
            const activeButton = this.findTabButton(tabName);
            if (activeButton) {
                activeButton.classList.add('active');
                // Scroll button into view if needed
                activeButton.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }

            // Load data for the tab
            await this.loadTabData(tabName);

            // Update state and history
            this.currentTab = tabName;
            Store.setCurrentTab(tabName);

            // Add to tab history
            if (!this.tabHistory.includes(tabName)) {
                this.tabHistory.push(tabName);
                // Keep only last 10 tabs in history
                if (this.tabHistory.length > 10) {
                    this.tabHistory.shift();
                }
            }

            // Update browser history
            if (pushHistory && window.history) {
                window.history.pushState({ tab: tabName }, `${tabName} - IT Services`, `#${tabName}`);
            }

            // Update page title
            this.updatePageTitle(tabName);

            // Trigger tab change event
            this.triggerTabChangeEvent(tabName);

            console.log(`✅ Successfully switched to tab: ${tabName}`);

        } catch (error) {
            console.error(`❌ Error switching to tab ${tabName}:`, error);
            Alerts.showError('Navigation Error', 'Failed to switch tabs');
        }
    }

    static findTabButton(tabName) {
        // Try multiple selectors to find the tab button
        const selectors = [
            `[onclick*="showTab('${tabName}')"]`,
            `[onclick*='showTab("${tabName}")']`,
            `[data-tab="${tabName}"]`,
            `[href="#${tabName}"]`
        ];

        for (const selector of selectors) {
            const button = document.querySelector(selector);
            if (button) return button;
        }

        // Fallback: find by text content
        const buttons = document.querySelectorAll('.tab-btn');
        const tabNameMap = {
            'dashboard': '📊 Dashboard',
            'pnl': '📈 P&L Statement',
            'credits': '💳 Credit Balances',
            'customers': '👥 Customer Management',
            'vendors': '🏭 Vendor Management',
            'business': '💼 Business Management',
            'transactions': '📊 Transaction History',
            'settings': '⚙️ Settings'
        };

        const expectedText = tabNameMap[tabName];
        if (expectedText) {
            for (const button of buttons) {
                if (button.textContent.trim() === expectedText) {
                    return button;
                }
            }
        }

        return null;
    }

    static async loadTabData(tabName) {
        try {
            console.log(`📊 Loading data for tab: ${tabName}`);

            // Show loading indicator
            const tabElement = document.getElementById(tabName);
            if (tabElement) {
                const existingLoader = tabElement.querySelector('.loading-spinner');
                if (!existingLoader) {
                    Helpers.createLoadingSpinner(tabElement);
                }
            }

            switch (tabName) {
                case 'dashboard':
                    await DashboardUI.loadStats();
                    break;

                case 'pnl':
                    // Load credit balances for P&L tab
                    await CreditsUI.loadAndDisplayBalances();
                    break;

                case 'credits':
                    await CreditsUI.loadAndDisplayBalances();
                    break;

                case 'customers':
                    // Load customer list by default
                    await this.showCustomerTab('customer-list');
                    break;

                case 'vendors':
                    // Load vendor list by default
                    await this.showVendorTab('vendor-list');
                    break;

                case 'business':
                    await BusinessUI.loadAndDisplayTransactions();
                    Forms.setDefaultDates();
                    break;

                case 'transactions':
                    if (window.TransactionUI) {
                        TransactionUI.initFilters();
                    }
                    // Load customer sales by default
                    this.showTransactionTab('customer-sales');
                    break;

                case 'pos':
                    if (window.POSUI) {
                        POSUI.init();
                    }
                    break;

                case 'settings':
                    if (window.SettingsUI) {
                        await SettingsUI.init();
                    }
                    break;

                default:
                    console.log(`No specific data loading for tab: ${tabName}`);
            }

            // Remove loading indicator
            if (tabElement) {
                Helpers.removeLoadingSpinner(tabElement);
            }

        } catch (error) {
            console.error(`❌ Error loading data for tab ${tabName}:`, error);

            // Remove loading indicator on error
            const tabElement = document.getElementById(tabName);
            if (tabElement) {
                Helpers.removeLoadingSpinner(tabElement);
            }

            // Show error message
            Alerts.showError('Data Loading Error', `Failed to load data for ${tabName} tab`);
        }
    }

    static showPLTab(tab) {
        try {
            console.log(`📊 Switching P&L tab to: ${tab}`);

            // Remove active class from P&L tab buttons and content
            document.querySelectorAll('#pnl .tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.pnl-tab-content').forEach(c => c.classList.remove('active'));

            // Add active class to selected elements
            const button = document.querySelector(`#pnl .tab-button[onclick*="${tab}"]`) ||
                document.querySelector(`#pnl .tab-button[data-tab="${tab}"]`);
            const content = document.getElementById(tab);

            if (button) {
                button.classList.add('active');
            } else {
                console.warn(`⚠️ P&L tab button not found for: ${tab}`);
            }

            if (content) {
                content.classList.add('active');
            } else {
                console.warn(`⚠️ P&L tab content not found for: ${tab}`);
            }

            // Initialize year dropdowns if not already done
            if (tab === 'monthly' || tab === 'yearly') {
                PLReportsAPI.populateYearDropdowns();
            }

            console.log(`✅ P&L tab switched to: ${tab}`);
        } catch (error) {
            console.error(`❌ Error switching P&L tabs to ${tab}:`, error);
        }
    }


    static showTransactionTab(tab) {
        try {
            console.log(`📊 Switching transaction tab to: ${tab}`);

            // Remove active classes
            document.querySelectorAll('.transaction-tab-content').forEach(c => c.classList.remove('active'));
            document.querySelectorAll('#transactions .tab-button').forEach(btn => btn.classList.remove('active'));

            // Add active classes
            const content = document.getElementById(tab);
            const button = document.querySelector(`#transactions .tab-button[onclick*="${tab}"]`) ||
                document.querySelector(`#transactions .tab-button[data-tab="${tab}"]`);

            if (content) {
                content.classList.add('active');
            } else {
                console.warn(`⚠️ Transaction tab content not found for: ${tab}`);
            }

            if (button) {
                button.classList.add('active');
            } else {
                console.warn(`⚠️ Transaction tab button not found for: ${tab}`);
            }

            // Load appropriate data
            if (tab === 'vendor-purchases') {
                TransactionUI.loadVendorTransactions();
            } else if (tab === 'customer-sales') {
                TransactionUI.loadCustomerSales();
            }

            console.log(`✅ Transaction tab switched to: ${tab}`);
        } catch (error) {
            console.error(`❌ Error switching transaction tabs to ${tab}:`, error);
        }
    }

    static showCustomerTab(tab) {
        try {
            console.log(`👥 Switching customer tab to: ${tab}`);

            // Remove active classes
            document.querySelectorAll('.customer-tab-content').forEach(c => c.classList.remove('active'));
            document.querySelectorAll('.customer-tabs .tab-button').forEach(btn => btn.classList.remove('active'));

            // Add active classes
            const content = document.getElementById(tab);
            const button = document.querySelector(`[onclick*="showCustomerTab('${tab}')"]`);

            if (content) {
                content.classList.add('active');
            } else {
                console.warn(`⚠️ Customer tab content not found for: ${tab}`);
            }

            if (button) {
                button.classList.add('active');
            } else {
                console.warn(`⚠️ Customer tab button not found for: ${tab}`);
            }

            // Load appropriate data
            this.loadCustomerTabData(tab);

            console.log(`✅ Customer tab switched to: ${tab}`);
        } catch (error) {
            console.error(`❌ Error switching customer tabs to ${tab}:`, error);
        }
    }

    static showVendorTab(tab) {
        try {
            console.log(`🏭 Switching vendor tab to: ${tab}`);

            // Remove active classes
            document.querySelectorAll('.vendor-tab-content').forEach(c => c.classList.remove('active'));
            document.querySelectorAll('.vendor-tabs .tab-button').forEach(btn => btn.classList.remove('active'));

            // Add active classes
            const content = document.getElementById(tab);
            const button = document.querySelector(`[onclick*="showVendorTab('${tab}')"]`);

            if (content) {
                content.classList.add('active');
            } else {
                console.warn(`⚠️ Vendor tab content not found for: ${tab}`);
            }

            if (button) {
                button.classList.add('active');
            } else {
                console.warn(`⚠️ Vendor tab button not found for: ${tab}`);
            }

            // Load appropriate data
            this.loadVendorTabData(tab);

            console.log(`✅ Vendor tab switched to: ${tab}`);
        } catch (error) {
            console.error(`❌ Error switching vendor tabs to ${tab}:`, error);
        }
    }

    static async loadCustomerTabData(tabName) {
        try {
            switch (tabName) {
                case 'customer-list':
                    if (window.CustomersUI) {
                        await CustomersUI.loadAndDisplayCustomers();
                    }
                    break;
                case 'add-customer':
                    Forms.setDefaultDates();
                    break;
                case 'add-subscription':
                    CustomersAPI.populateCustomerSelects();
                    VendorsAPI.populateVendorSelects();
                    Forms.setDefaultDates();
                    break;
                case 'edit-customer':
                    CustomersAPI.populateCustomerSelects();
                    break;
            }
        } catch (error) {
            console.error(`❌ Error loading customer tab data for ${tabName}:`, error);
        }
    }

    static async loadVendorTabData(tabName) {
        try {
            switch (tabName) {
                case 'vendor-list':
                    if (window.VendorsUI) {
                        await VendorsUI.loadAndDisplayVendors();
                    }
                    break;
                case 'add-vendor':
                    Forms.setDefaultDates();
                    break;
                case 'vendor-services':
                    if (window.VendorsUI) {
                        await VendorsUI.loadAndDisplayServices();
                    }
                    VendorsAPI.populateVendorSelects();
                    break;
                case 'purchase-credits':
                    VendorsAPI.populateVendorSelects();
                    Forms.setDefaultDates();
                    if (window.VendorsUI) {
                        VendorsUI.loadRecentPurchases();
                    }
                    break;
            }
        } catch (error) {
            console.error(`❌ Error loading vendor tab data for ${tabName}:`, error);
        }
    }

    static updatePageTitle(tabName) {
        const tabTitles = {
            'dashboard': '📊 Dashboard',
            'pnl': '📈 P&L Statement',
            'credits': '💳 Credit Balances',
            'customers': '👥 Customer Management',
            'vendors': '🏭 Vendor Management',
            'business': '💼 Business Management',
            'transactions': '📊 Transaction History',
            'settings': '⚙️ Settings'
        };

        const title = tabTitles[tabName] || tabName;
        document.title = `${title} - IT Services Credit Management`;
    }

    static triggerTabChangeEvent(tabName) {
        // Dispatch custom event for other components to listen to
        const event = new CustomEvent('tabChanged', {
            detail: {
                tabName: tabName,
                previousTab: this.tabHistory[this.tabHistory.length - 2]
            }
        });
        document.dispatchEvent(event);
    }

    static getCurrentTab() {
        return this.currentTab;
    }

    static getPreviousTab() {
        return this.tabHistory[this.tabHistory.length - 2] || 'dashboard';
    }

    static goToPreviousTab() {
        const previousTab = this.getPreviousTab();
        if (previousTab && previousTab !== this.currentTab) {
            this.showTab(previousTab);
        }
    }

    static refreshCurrentTab() {
        if (this.currentTab) {
            console.log(`🔄 Refreshing current tab: ${this.currentTab}`);
            this.loadTabData(this.currentTab);
        }
    }

    static getTabHistory() {
        return [...this.tabHistory]; // Return copy
    }

    static clearTabHistory() {
        this.tabHistory = [this.currentTab];
    }

    // Utility method to check if a tab exists
    static tabExists(tabName) {
        return document.getElementById(tabName) !== null;
    }
}

// Make available globally
window.Tabs = Tabs;

// Global functions for backward compatibility with HTML onclick handlers
function showTab(tabName) {
    Tabs.showTab(tabName);
}

function showPLTab(tab) {
    Tabs.showPLTab(tab);
}

function showTransactionTab(tab) {
    Tabs.showTransactionTab(tab);
}

function showCustomerTab(tab) {
    Tabs.showCustomerTab(tab);
}

function showVendorTab(tab) {
    Tabs.showVendorTab(tab);
}

// Listen for tab change events (example usage)
document.addEventListener('tabChanged', function (event) {
    console.log(`🔄 Tab changed to: ${event.detail.tabName}`);
});
