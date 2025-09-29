const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Global variables
let mainWindow;
let database;
let server;
let isAppReady = false;
let isDevelopment = process.env.NODE_ENV === 'development';

// Import your existing classes (adjust paths as needed)
let DatabaseManager, EmbeddedServer, Database;

try {
    // Try to import your existing classes
    DatabaseManager = require('./database');
    EmbeddedServer = require('./server');
} catch (error) {
    console.warn('Custom database/server classes not found, using fallback');
}

try {
    // Try to import better-sqlite3
    Database = require('better-sqlite3');
} catch (error) {
    console.warn('better-sqlite3 not available, database features will be limited');
    Database = null;
}

// App configuration
const APP_CONFIG = {
    window: {
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700
    },
    server: {
        port: 3001,
        host: 'localhost'
    },
    database: {
        path: path.join(__dirname, '../../database/credit_management.db'),
        backupPath: path.join(__dirname, '../../database/backups')
    }
};

// Application initialization
async function initializeApplication() {
    try {
        console.log('🚀 Initializing Credit Management Application...');

        // Create backup directory if it doesn't exist
        if (!fs.existsSync(APP_CONFIG.database.backupPath)) {
            fs.mkdirSync(APP_CONFIG.database.backupPath, { recursive: true });
        }

        // Initialize database
        await initializeDatabase();

        // Initialize server if available
        if (EmbeddedServer && database) {
            await initializeServer();
        } else {
            console.warn('⚠️ Server initialization skipped - missing dependencies');
        }

        console.log('✅ Application components initialized successfully');
        return true;

    } catch (error) {
        console.error('❌ Application initialization failed:', error);
        await showErrorDialog('Initialization Error', `Failed to initialize application: ${error.message}`);
        return false;
    }
}

// Database initialization
async function initializeDatabase() {
    try {
        console.log('📂 Initializing database...');

        if (DatabaseManager) {
            // Use custom DatabaseManager if available
            database = new DatabaseManager();
            await database.initialize();
            console.log('✅ Custom DatabaseManager initialized');
        } else if (Database) {
            // Use direct better-sqlite3 if available
            database = initializeSQLiteDatabase();
            console.log('✅ SQLite database initialized directly');
        } else {
            throw new Error('No database implementation available');
        }

        // Test database connection
        await testDatabaseConnection();

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}

// Initialize SQLite database directly
function initializeSQLiteDatabase() {
    const dbPath = APP_CONFIG.database.path;

    // Check if database file exists
    if (!fs.existsSync(dbPath)) {
        console.warn('📂 Database file not found, creating new database');
        // Ensure directory exists
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
    }

    const db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');

    // Create basic tables if they don't exist
    initializeTables(db);

    return {
        getDb: () => db,
        close: () => db.close()
    };
}

// Create basic tables
function initializeTables(db) {
    try {
        // Customers table
        db.exec(`
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                phone TEXT,
                address TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Vendors table
        db.exec(`
            CREATE TABLE IF NOT EXISTS vendors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                address TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Subscriptions table
        db.exec(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER,
                service_name TEXT NOT NULL,
                classification TEXT DEFAULT 'General',
                credits_used INTEGER DEFAULT 0,
                amount_paid DECIMAL(10,2) DEFAULT 0,
                mac_address TEXT,
                expiration_date DATETIME,
                status TEXT DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers (id)
            )
        `);

        // Transactions table
        db.exec(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER,
                vendor_id INTEGER,
                type TEXT NOT NULL, -- 'sale' or 'purchase'
                amount DECIMAL(10,2) NOT NULL,
                credits_used INTEGER DEFAULT 0,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers (id),
                FOREIGN KEY (vendor_id) REFERENCES vendors (id)
            )
        `);

        // Vendor credits table
        db.exec(`
            CREATE TABLE IF NOT EXISTS vendor_credits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vendor_id INTEGER,
                credits_purchased INTEGER NOT NULL,
                credits_remaining INTEGER NOT NULL,
                cost_per_credit DECIMAL(10,4) NOT NULL,
                purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vendor_id) REFERENCES vendors (id)
            )
        `);

        console.log('📋 Database tables initialized');

        // Insert sample data if tables are empty
        insertSampleData(db);

    } catch (error) {
        console.error('Failed to initialize tables:', error);
    }
}

// Insert sample data for testing
function insertSampleData(db) {
    try {
        const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;

        if (customerCount === 0) {
            console.log('📝 Inserting sample data...');

            // Sample customers
            const insertCustomer = db.prepare(`
                INSERT INTO customers (name, email, phone, address) 
                VALUES (?, ?, ?, ?)
            `);

            insertCustomer.run('John Doe', 'john@example.com', '555-0001', '123 Main St');
            insertCustomer.run('Jane Smith', 'jane@example.com', '555-0002', '456 Oak Ave');
            insertCustomer.run('Bob Johnson', 'bob@example.com', '555-0003', '789 Pine Rd');

            // Sample vendors
            const insertVendor = db.prepare(`
                INSERT INTO vendors (name, email, phone, address) 
                VALUES (?, ?, ?, ?)
            `);

            insertVendor.run('IPTV Provider A', 'provider.a@example.com', '555-1001', '100 Tech Blvd');
            insertVendor.run('IPTV Provider B', 'provider.b@example.com', '555-1002', '200 Media Ave');

            // Sample subscriptions
            const insertSubscription = db.prepare(`
                INSERT INTO subscriptions (customer_id, service_name, classification, credits_used, amount_paid, expiration_date, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
            const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            const threeMonths = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

            insertSubscription.run(1, 'Premium IPTV', 'Premium', 12, 120.00, nextWeek, 'active');
            insertSubscription.run(2, 'Basic IPTV', 'Basic', 6, 60.00, nextMonth, 'active');
            insertSubscription.run(3, 'Sports Package', 'Premium', 18, 180.00, threeMonths, 'active');

            // Sample transactions
            const insertTransaction = db.prepare(`
                INSERT INTO transactions (customer_id, vendor_id, type, amount, credits_used, description) 
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            insertTransaction.run(1, 1, 'sale', 120.00, 12, 'Premium IPTV subscription');
            insertTransaction.run(2, 1, 'sale', 60.00, 6, 'Basic IPTV subscription');
            insertTransaction.run(3, 2, 'sale', 180.00, 18, 'Sports Package subscription');
            insertTransaction.run(null, 1, 'purchase', 500.00, 100, 'Credit purchase from Provider A');
            insertTransaction.run(null, 2, 'purchase', 750.00, 150, 'Credit purchase from Provider B');

            // Sample vendor credits
            const insertVendorCredit = db.prepare(`
                INSERT INTO vendor_credits (vendor_id, credits_purchased, credits_remaining, cost_per_credit) 
                VALUES (?, ?, ?, ?)
            `);

            insertVendorCredit.run(1, 100, 88, 5.00); // 100 purchased, 12 used
            insertVendorCredit.run(2, 150, 132, 5.00); // 150 purchased, 18 used

            console.log('✅ Sample data inserted successfully');
        }
    } catch (error) {
        console.error('Failed to insert sample data:', error);
    }
}

// Test database connection
async function testDatabaseConnection() {
    try {
        const db = database.getDb ? database.getDb() : database;
        const result = db.prepare('SELECT 1 as test').get();

        if (result.test === 1) {
            console.log('✅ Database connection test passed');

            // Log table counts
            const tables = ['customers', 'vendors', 'subscriptions', 'transactions', 'vendor_credits'];
            for (const table of tables) {
                try {
                    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get().count;
                    console.log(`📊 ${table}: ${count} records`);
                } catch (e) {
                    console.warn(`⚠️ Table ${table} not accessible: ${e.message}`);
                }
            }
        }
    } catch (error) {
        throw new Error(`Database connection test failed: ${error.message}`);
    }
}

// Initialize server
async function initializeServer() {
    try {
        console.log('🌐 Initializing embedded server...');

        server = new EmbeddedServer(database);
        await server.start(APP_CONFIG.server.port);

        console.log(`✅ Embedded server started on port ${APP_CONFIG.server.port}`);
    } catch (error) {
        console.error('❌ Server initialization failed:', error);
        throw error;
    }
}

// Create main window
function createWindow() {
    console.log('🖥️ Creating main window...');

    mainWindow = new BrowserWindow({
        width: APP_CONFIG.window.width,
        height: APP_CONFIG.window.height,
        minWidth: APP_CONFIG.window.minWidth,
        minHeight: APP_CONFIG.window.minHeight,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            webSecurity: false // Only for development
        },
        show: false,
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
    });

    // Set window icon if available
    const iconPath = path.join(__dirname, '../../assets/icon.png');
    if (fs.existsSync(iconPath)) {
        mainWindow.setIcon(iconPath);
    }

    // Load application
    if (server && EmbeddedServer) {
        // Load from embedded server
        mainWindow.loadURL(`http://localhost:${APP_CONFIG.server.port}`);
        console.log(`📱 Loading app from embedded server: http://localhost:${APP_CONFIG.server.port}`);
    } else {
        // Load HTML file directly
        const htmlPath = path.join(__dirname, '../renderer/index.html');
        mainWindow.loadFile(htmlPath);
        console.log(`📱 Loading app from file: ${htmlPath}`);
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        console.log('✅ Main window displayed');

        if (isDevelopment) {
            mainWindow.webContents.openDevTools();
        }
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle navigation errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Page failed to load:', errorCode, errorDescription);
    });
}

// Create application menu
function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Backup Database',
                    click: async () => {
                        await backupDatabase();
                    }
                },
                {
                    label: 'Export Data',
                    click: async () => {
                        await exportData();
                    }
                },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'close' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: async () => {
                        await showAboutDialog();
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// IPC Handlers
function setupIpcHandlers() {
    console.log('🔌 Setting up IPC handlers...');

    // Dashboard stats handler
    ipcMain.handle('db-get-dashboard-stats', async () => {
        if (!database) {
            throw new Error('Database not available');
        }

        try {
            const db = database.getDb ? database.getDb() : database;

            // Default stats
            const stats = {
                totalCustomers: 0,
                activeSubscriptions: 0,
                totalCreditsUsed: 0,
                totalRevenue: 0,
                totalVendorCosts: 0,
                avgCostPerCredit: 0,
                avgRevenuePerCredit: 0,
                netProfitFromCreditSales: 0,
                avgProfitPerCredit: 0,
                finalNetProfit: 0,
                totalCreditsRemaining: 0,
                lowCreditAlerts: 0
            };

            try {
                // Get basic counts
                stats.totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get().count || 0;
                stats.activeSubscriptions = db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE status = ?').get('active').count || 0;

                // Get transaction statistics
                const salesData = db.prepare(`
                    SELECT 
                        COALESCE(SUM(credits_used), 0) as totalCreditsUsed,
                        COALESCE(SUM(amount), 0) as totalRevenue
                    FROM transactions 
                    WHERE type = 'sale'
                `).get();

                const purchaseData = db.prepare(`
                    SELECT COALESCE(SUM(amount), 0) as totalVendorCosts
                    FROM transactions 
                    WHERE type = 'purchase'
                `).get();

                stats.totalCreditsUsed = salesData.totalCreditsUsed;
                stats.totalRevenue = salesData.totalRevenue;
                stats.totalVendorCosts = purchaseData.totalVendorCosts;

                // Get vendor credits
                const creditsData = db.prepare(`
                    SELECT 
                        COALESCE(SUM(credits_remaining), 0) as totalCreditsRemaining,
                        COUNT(*) as vendorCount
                    FROM vendor_credits
                `).get();

                stats.totalCreditsRemaining = creditsData.totalCreditsRemaining;

                // Get low credit alerts (less than 20 credits remaining)
                stats.lowCreditAlerts = db.prepare(`
                    SELECT COUNT(*) as count 
                    FROM vendor_credits 
                    WHERE credits_remaining < 20
                `).get().count || 0;

                // Calculate derived metrics
                if (stats.totalCreditsUsed > 0) {
                    stats.avgRevenuePerCredit = parseFloat((stats.totalRevenue / stats.totalCreditsUsed).toFixed(2));
                    stats.avgCostPerCredit = parseFloat((stats.totalVendorCosts / stats.totalCreditsUsed).toFixed(2));
                }

                stats.netProfitFromCreditSales = parseFloat((stats.totalRevenue - stats.totalVendorCosts).toFixed(2));

                if (stats.totalCreditsUsed > 0) {
                    stats.avgProfitPerCredit = parseFloat((stats.netProfitFromCreditSales / stats.totalCreditsUsed).toFixed(2));
                }

                stats.finalNetProfit = stats.netProfitFromCreditSales;

            } catch (queryError) {
                console.warn('Some database queries failed:', queryError.message);
            }

            return stats;

        } catch (error) {
            console.error('Dashboard stats query error:', error);
            throw error;
        }
    });

    // Health check handler
    ipcMain.handle('db-get-health', async () => {
        try {
            if (!database) {
                return {
                    database: 'Not Available',
                    version: '2.0.0',
                    uptime: process.uptime(),
                    status: 'error',
                    error: 'Database not initialized'
                };
            }

            const db = database.getDb ? database.getDb() : database;
            const result = db.prepare('SELECT 1 as test').get();

            return {
                database: 'Connected',
                version: '2.0.0',
                uptime: process.uptime(),
                status: 'healthy',
                tablesCount: db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get().count
            };
        } catch (error) {
            return {
                database: 'Error',
                version: '2.0.0',
                uptime: process.uptime(),
                status: 'error',
                error: error.message
            };
        }
    });

    // Expiring subscriptions handler
    ipcMain.handle('db-get-expiring-subscriptions', async () => {
        if (!database) {
            console.warn('Database not available for expiring subscriptions query');
            return {
                weeklyExpiring: [],
                monthlyExpiring: []
            };
        }

        try {
            const db = database.getDb ? database.getDb() : database;

            let weeklyExpiring = [];
            let monthlyExpiring = [];

            try {
                // Check if subscriptions table exists
                const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='subscriptions'").all();

                if (tables.length > 0) {
                    // Get subscriptions expiring in the next week
                    weeklyExpiring = db.prepare(`
                        SELECT 
                            s.id,
                            s.expiration_date,
                            s.service_name,
                            s.classification,
                            s.credits_used,
                            s.amount_paid,
                            s.mac_address,
                            COALESCE(c.name, 'Unknown Customer') as customer_name,
                            c.email as customer_email
                        FROM subscriptions s
                        LEFT JOIN customers c ON s.customer_id = c.id
                        WHERE s.status = 'active' 
                        AND DATE(s.expiration_date) BETWEEN DATE('now') AND DATE('now', '+7 days')
                        ORDER BY s.expiration_date ASC
                    `).all() || [];

                    // Get subscriptions expiring in the next month (but not in the next week)
                    monthlyExpiring = db.prepare(`
                        SELECT 
                            s.id,
                            s.expiration_date,
                            s.service_name,
                            s.classification,
                            s.credits_used,
                            s.amount_paid,
                            s.mac_address,
                            COALESCE(c.name, 'Unknown Customer') as customer_name,
                            c.email as customer_email
                        FROM subscriptions s
                        LEFT JOIN customers c ON s.customer_id = c.id
                        WHERE s.status = 'active' 
                        AND DATE(s.expiration_date) BETWEEN DATE('now', '+8 days') AND DATE('now', '+30 days')
                        ORDER BY s.expiration_date ASC
                    `).all() || [];

                    console.log(`📅 Found ${weeklyExpiring.length} weekly and ${monthlyExpiring.length} monthly expiring subscriptions`);
                } else {
                    console.warn('⚠️ Subscriptions table does not exist');
                }
            } catch (queryError) {
                console.warn('Error querying expiring subscriptions:', queryError.message);
            }

            return {
                weeklyExpiring,
                monthlyExpiring
            };

        } catch (error) {
            console.error('Failed to get expiring subscriptions:', error);
            return {
                weeklyExpiring: [],
                monthlyExpiring: []
            };
        }
    });

    // Debug info handler
    ipcMain.handle('db-debug-info', async () => {
        if (!database) {
            return { error: 'Database not available' };
        }

        try {
            const db = database.getDb ? database.getDb() : database;

            // Get table list
            const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
            const tableInfo = {};

            for (const table of tables) {
                try {
                    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
                    tableInfo[table.name] = {
                        count: count.count,
                        exists: true
                    };

                    // Get sample data for main tables
                    if (['customers', 'subscriptions', 'vendors', 'transactions', 'vendor_credits'].includes(table.name) && count.count > 0) {
                        const sample = db.prepare(`SELECT * FROM ${table.name} LIMIT 3`).all();
                        tableInfo[table.name].sample = sample;
                    }
                } catch (e) {
                    tableInfo[table.name] = { error: e.message };
                }
            }

            return {
                tables: tables.map(t => t.name),
                tableInfo,
                totalTables: tables.length
            };
        } catch (error) {
            return { error: error.message };
        }
    });

    // Backup database handler
    ipcMain.handle('db-backup', async () => {
        return await backupDatabase();
    });

    console.log('✅ IPC handlers setup complete');
}

// Utility functions
async function backupDatabase() {
    if (!database) {
        throw new Error('Database not available for backup');
    }

    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `credit_management_backup_${timestamp}.db`;
        const backupPath = path.join(APP_CONFIG.database.backupPath, backupFileName);

        // Copy database file
        const sourcePath = APP_CONFIG.database.path;
        if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, backupPath);
            console.log(`✅ Database backed up to: ${backupPath}`);
            return { success: true, path: backupPath };
        } else {
            throw new Error('Source database file not found');
        }
    } catch (error) {
        console.error('❌ Database backup failed:', error);
        throw error;
    }
}

async function exportData() {
    // Implementation for data export
    console.log('📤 Data export requested');
    // You can implement CSV/JSON export here
}

async function showAboutDialog() {
    await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'About Credit Management System',
        message: 'IT Services Credit Management',
        detail: 'Version 2.0.0\nBuilt with Electron and SQLite\n\nManage subscriptions, vendors, and monitor profit margins.',
        buttons: ['OK']
    });
}

async function showErrorDialog(title, message) {
    await dialog.showErrorBox(title, message);
}

// App event handlers
app.whenReady().then(async () => {
    console.log('📱 Electron app ready');

    // Setup IPC handlers first
    setupIpcHandlers();

    // Initialize application components
    const initialized = await initializeApplication();

    if (!initialized) {
        console.error('❌ Failed to initialize application, exiting...');
        app.quit();
        return;
    }

    // Create application menu
    createMenu();

    // Create main window
    createWindow();

    isAppReady = true;
    console.log('🎉 Application startup complete');
});

app.on('window-all-closed', () => {
    console.log('🔄 All windows closed');

    // Cleanup resources
    if (server && typeof server.close === 'function') {
        try {
            server.close();
            console.log('✅ Server closed');
        } catch (error) {
            console.error('❌ Error closing server:', error);
        }
    }

    if (database && typeof database.close === 'function') {
        try {
            database.close();
            console.log('✅ Database connection closed');
        } catch (error) {
            console.error('❌ Error closing database:', error);
        }
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', () => {
    console.log('🔄 Application shutting down...');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export for testing
module.exports = {
    APP_CONFIG,
    initializeApplication,
    createWindow
};

console.log('🚀 Main process initialized');
