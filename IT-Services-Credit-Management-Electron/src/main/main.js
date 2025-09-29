const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

let mainWindow;
let db;

// Initialize SQLite database
function initializeDatabase() {
    try {
        const dbPath = path.join(__dirname, '../../database/credit_management.db');
        db = new Database(dbPath);

        // Enable foreign keys
        db.pragma('foreign_keys = ON');

        console.log('Database connected successfully');
        return true;
    } catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
}

// Create the main window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    });

    // Load the HTML file
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
}

// Database API handlers
ipcMain.handle('db-get-dashboard-stats', async () => {
    try {
        // Get total customers
        const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;

        // Get active subscriptions
        const activeSubscriptions = db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE status = ?').get('active').count;

        // Get credit statistics
        const creditStats = db.prepare(`
            SELECT 
                COALESCE(SUM(credits_used), 0) as totalCreditsUsed,
                COALESCE(SUM(amount), 0) as totalRevenue,
                COALESCE(COUNT(*), 0) as totalTransactions
            FROM transactions 
            WHERE type = 'sale'
        `).get();

        // Get vendor costs
        const vendorCosts = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as totalVendorCosts
            FROM transactions 
            WHERE type = 'purchase'
        `).get();

        // Get remaining credits
        const remainingCredits = db.prepare(`
            SELECT COALESCE(SUM(credits_remaining), 0) as totalCreditsRemaining
            FROM vendor_credits
        `).get();

        // Calculate derived metrics
        const totalRevenue = creditStats.totalRevenue || 0;
        const totalVendorCosts = vendorCosts.totalVendorCosts || 0;
        const totalCreditsUsed = creditStats.totalCreditsUsed || 0;

        const avgRevenuePerCredit = totalCreditsUsed > 0 ? totalRevenue / totalCreditsUsed : 0;
        const avgCostPerCredit = totalCreditsUsed > 0 ? totalVendorCosts / totalCreditsUsed : 0;
        const netProfitFromCreditSales = totalRevenue - totalVendorCosts;
        const avgProfitPerCredit = totalCreditsUsed > 0 ? netProfitFromCreditSales / totalCreditsUsed : 0;

        // Get low credit alerts
        const lowCreditAlerts = db.prepare(`
            SELECT COUNT(*) as count 
            FROM vendor_credits 
            WHERE credits_remaining < 100
        `).get().count;

        return {
            totalCustomers,
            activeSubscriptions,
            totalCreditsUsed,
            totalRevenue,
            totalVendorCosts,
            avgCostPerCredit: parseFloat(avgCostPerCredit.toFixed(2)),
            avgRevenuePerCredit: parseFloat(avgRevenuePerCredit.toFixed(2)),
            netProfitFromCreditSales: parseFloat(netProfitFromCreditSales.toFixed(2)),
            avgProfitPerCredit: parseFloat(avgProfitPerCredit.toFixed(2)),
            finalNetProfit: parseFloat(netProfitFromCreditSales.toFixed(2)),
            totalCreditsRemaining: remainingCredits.totalCreditsRemaining || 0,
            lowCreditAlerts
        };
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
});

ipcMain.handle('db-get-health', async () => {
    try {
        // Test database connection
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
            uptime: 0,
            status: 'error',
            error: error.message
        };
    }
});

// App event handlers
app.whenReady().then(() => {
    // Initialize database first
    const dbInitialized = initializeDatabase();
    if (!dbInitialized) {
        console.error('Failed to initialize database');
    }

    createWindow();
});

app.on('window-all-closed', () => {
    if (db) {
        db.close();
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
