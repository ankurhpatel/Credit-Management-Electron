const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let database;
let server;

// Import your existing database and server classes
const DatabaseManager = require('./database');
const EmbeddedServer = require('./server');

async function initializeApplication() {
    try {
        console.log('🚀 Initializing application...');

        // Initialize database
        database = new DatabaseManager();
        await database.initialize();
        console.log('✅ Database initialized');

        // Initialize embedded server
        server = new EmbeddedServer(database);
        await server.start();
        console.log('✅ Embedded server started on port 3001');

        return true;
    } catch (error) {
        console.error('❌ Application initialization failed:', error);
        return false;
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        show: false
    });

    // Load the HTML file - this will now connect to localhost:3001
    mainWindow.loadURL('http://localhost:3001');

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        console.log('🖥️ Main window shown');
    });

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
}

// Keep your existing IPC handlers for direct database access if needed
ipcMain.handle('db-get-dashboard-stats', async () => {
    if (!database || !database.getDb()) {
        throw new Error('Database not available');
    }

    try {
        const db = database.getDb();

        // Get basic counts with error handling
        let totalCustomers = 0;
        let activeSubscriptions = 0;

        try {
            totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get().count || 0;
        } catch (e) {
            console.warn('Customers table may not exist');
        }

        try {
            activeSubscriptions = db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE status = ?').get('active').count || 0;
        } catch (e) {
            console.warn('Subscriptions table may not exist');
        }

        // Default stats
        const stats = {
            totalCustomers,
            activeSubscriptions,
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

        return stats;
    } catch (error) {
        console.error('Database query error:', error);
        return {
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
    }
});

ipcMain.handle('db-get-health', async () => {
    try {
        if (!database || !database.getDb()) {
            return {
                database: 'Not Available',
                version: '2.0.0',
                uptime: process.uptime(),
                status: 'error'
            };
        }

        // Test database connection
        const db = database.getDb();
        const result = db.prepare('SELECT 1 as test').get();

        return {
            database: 'Connected',
            version: '2.0.0',
            uptime: process.uptime(),
            status: 'healthy'
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

// App event handlers
app.whenReady().then(async () => {
    console.log('📱 Electron app ready, initializing...');

    // Initialize database and server first
    const appInitialized = await initializeApplication();
    if (!appInitialized) {
        console.error('❌ Failed to initialize application components');
    }

    createWindow();
});

app.on('window-all-closed', () => {
    // Cleanup
    if (server) {
        server.close();
    }

    if (database) {
        database.close();
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
