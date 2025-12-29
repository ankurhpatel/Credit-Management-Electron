const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

class DatabaseManager {
    constructor() {
        this.db = null;
        this.SQL = null;
        this.dbPath = path.join(__dirname, '../../database/subscription-data.db');
        this.inTransaction = false;
    }

    async initialize() {
        try {
            console.log('🔄 Initializing SQL.js database...');

            // ... (keep existing init code)
            this.SQL = await initSqlJs();
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            let dbBuffer;
            if (fs.existsSync(this.dbPath)) {
                console.log('📖 Loading existing database...');
                dbBuffer = fs.readFileSync(this.dbPath);
            } else {
                console.log('🆕 Creating new database...');
                dbBuffer = null;
            }

            this.db = new this.SQL.Database(dbBuffer);
            this.db.exec('PRAGMA foreign_keys = ON');

            await this.ensureTablesExist();
            await this.ensureSchemaUpdates();
            
            // await this.clearAllData(); 

            this.saveToFile();
            return this.db;
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }

    async clearAllData() {
        try {
            console.log('🧹 Clearing all database records...');
            const tables = [
                'credit_usage',
                'credit_balances',
                'vendor_transactions',
                'subscriptions',
                'vendor_services',
                'vendors',
                'customers',
                'business_transactions'
            ];

            this.db.exec('PRAGMA foreign_keys = OFF'); // Temporarily disable to allow clearing
            tables.forEach(table => {
                this.db.exec(`DELETE FROM ${table}`);
            });
            this.db.exec('PRAGMA foreign_keys = ON');
            
            console.log('✅ All records cleared. Schema preserved.');
        } catch (error) {
            console.error('❌ Error clearing data:', error);
        }
    }

    async ensureSchemaUpdates() {
        try {
            console.log('🔄 Checking for schema updates...');
            
            // Check vendor_services columns
            const vsColumns = this.prepare('PRAGMA table_info(vendor_services)').all();
            const hasItemType = vsColumns.some(c => c.name === 'item_type');
            const hasDefaultPrice = vsColumns.some(c => c.name === 'default_price');

            if (!hasItemType) {
                console.log('📦 Adding item_type to vendor_services...');
                this.db.exec("ALTER TABLE vendor_services ADD COLUMN item_type TEXT DEFAULT 'subscription'");
            }

            if (!hasDefaultPrice) {
                console.log('💰 Adding default_price to vendor_services...');
                this.db.exec("ALTER TABLE vendor_services ADD COLUMN default_price REAL DEFAULT 0");
            }

            const hasCostPrice = vsColumns.some(c => c.name === 'cost_price');
            if (!hasCostPrice) {
                console.log('💸 Adding cost_price to vendor_services...');
                this.db.exec("ALTER TABLE vendor_services ADD COLUMN cost_price REAL DEFAULT 0");
            }

            // Check subscriptions columns
            const subColumns = this.prepare('PRAGMA table_info(subscriptions)').all();
            const hasSubItemType = subColumns.some(c => c.name === 'item_type');
            const hasBundleId = subColumns.some(c => c.name === 'bundle_id');
            const hasMacAddress = subColumns.some(c => c.name === 'mac_address');

            if (!hasSubItemType) {
                console.log('📦 Adding item_type to subscriptions...');
                this.db.exec("ALTER TABLE subscriptions ADD COLUMN item_type TEXT DEFAULT 'subscription'");
            }

            if (!hasBundleId) {
                console.log('🔗 Adding bundle_id to subscriptions...');
                this.db.exec("ALTER TABLE subscriptions ADD COLUMN bundle_id TEXT");
            }

            if (!hasMacAddress) {
                console.log('🖥️ Adding mac_address to subscriptions...');
                this.db.exec("ALTER TABLE subscriptions ADD COLUMN mac_address TEXT");
            }

            // Check for payment and order status columns
            const subCols = this.prepare('PRAGMA table_info(subscriptions)').all();
            if (!subCols.some(c => c.name === 'payment_type')) {
                this.db.exec("ALTER TABLE subscriptions ADD COLUMN payment_type TEXT");
            }
            if (!subCols.some(c => c.name === 'payment_status')) {
                this.db.exec("ALTER TABLE subscriptions ADD COLUMN payment_status TEXT DEFAULT 'Paid'");
            }
            if (!subCols.some(c => c.name === 'transaction_id_ref')) {
                this.db.exec("ALTER TABLE subscriptions ADD COLUMN transaction_id_ref TEXT");
            }
            if (!subCols.some(c => c.name === 'order_status')) {
                this.db.exec("ALTER TABLE subscriptions ADD COLUMN order_status TEXT DEFAULT 'Closed'");
            }

            // Check for internal_notes in customers
            const custColumns = this.prepare('PRAGMA table_info(customers)').all();
            const hasInternalNotes = custColumns.some(c => c.name === 'internal_notes');
            if (!hasInternalNotes) {
                console.log('📝 Adding internal_notes to customers...');
                this.db.exec("ALTER TABLE customers ADD COLUMN internal_notes TEXT");
            }

            // FORCE CHECK: Ensure settings table exists for existing databases
            const settingsTableCheck = this.db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'");
            if (settingsTableCheck.length === 0) {
                console.log('⚙️ Creating missing settings table...');
                this.db.exec(`
                    CREATE TABLE IF NOT EXISTS settings (
                        key TEXT PRIMARY KEY,
                        value TEXT
                    );
                    INSERT OR IGNORE INTO settings (key, value) VALUES 
                    ('company_name', 'IT Services Management'),
                    ('receipt_instructions', 'No refunds on activated digital services. Hardware warranty valid for 6 months.'),
                    ('company_logo', ''),
                    ('currency_symbol', '$');
                `);
            }
            
            console.log('✅ Schema updates completed');
        } catch (error) {
            console.error('❌ Error updating schema:', error);
            // Don't throw, as the app might still work
        }
    }

    async ensureTablesExist() {
        try {
            const tableExists = this.db.exec(`
                SELECT COUNT(*) as count FROM sqlite_master 
                WHERE type='table' AND name='customers'
            `);

            const count = tableExists.length > 0 ? tableExists[0].values[0][0] : 0;

            if (count === 0) {
                console.log('📋 Creating database tables...');
                await this.createTables();
                this.db.exec(`
                    INSERT OR IGNORE INTO settings (key, value) VALUES 
                    ('company_name', 'IT Services Management'),
                    ('receipt_instructions', 'No refunds on activated digital services. Hardware warranty valid for 6 months.'),
                    ('company_logo', ''),
                    ('currency_symbol', '$')
                `);
                console.log('✅ Database tables created and defaults set');
            } else {
                console.log('✅ Database tables already exist');
            }
        } catch (error) {
            console.error('❌ Error checking/creating tables:', error);
            throw error;
        }
    }

    async createTables() {
        const schema = `
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS customers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                phone TEXT,
                address TEXT,
                internal_notes TEXT,
                created_date TEXT DEFAULT (datetime('now')),
                status TEXT DEFAULT 'active'
            );

            CREATE TABLE IF NOT EXISTS vendors (
                vendor_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                contact_email TEXT,
                contact_phone TEXT,
                description TEXT,
                is_active INTEGER DEFAULT 1,
                created_date TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS vendor_services (
                service_id TEXT PRIMARY KEY,
                vendor_id TEXT NOT NULL,
                service_name TEXT NOT NULL,
                description TEXT,
                item_type TEXT DEFAULT 'subscription',
                default_price REAL DEFAULT 0,
                cost_price REAL DEFAULT 0,
                is_available INTEGER DEFAULT 1,
                created_date TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS subscriptions (
                id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                service_name TEXT NOT NULL,
                amount_paid REAL NOT NULL,
                credits_used INTEGER DEFAULT 0,
                start_date TEXT NOT NULL,
                expiration_date TEXT NOT NULL,
                classification TEXT,
                vendor_id TEXT,
                vendor_service_name TEXT,
                notes TEXT,
                status TEXT DEFAULT 'active',
                item_type TEXT DEFAULT 'subscription',
                bundle_id TEXT,
                mac_address TEXT,
                payment_type TEXT DEFAULT 'Cash',
                payment_status TEXT DEFAULT 'Paid',
                transaction_id_ref TEXT,
                order_status TEXT DEFAULT 'Closed',
                created_date TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id)
            );

            CREATE TABLE IF NOT EXISTS vendor_transactions (
                transaction_id TEXT PRIMARY KEY,
                vendor_id TEXT NOT NULL,
                service_name TEXT NOT NULL,
                credits INTEGER NOT NULL,
                price_usd REAL NOT NULL,
                purchase_date TEXT DEFAULT (date('now')),
                notes TEXT,
                created_date TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id)
            );

            CREATE TABLE IF NOT EXISTS credit_balances (
                balance_id TEXT PRIMARY KEY,
                vendor_id TEXT NOT NULL,
                service_name TEXT NOT NULL,
                remaining_credits INTEGER DEFAULT 0,
                total_purchased INTEGER DEFAULT 0,
                total_used INTEGER DEFAULT 0,
                last_updated TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id)
            );

            CREATE TABLE IF NOT EXISTS credit_usage (
                usage_id TEXT PRIMARY KEY,
                vendor_id TEXT NOT NULL,
                service_name TEXT NOT NULL,
                subscription_id TEXT NOT NULL,
                credits_used INTEGER NOT NULL,
                usage_date TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),
                FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
            );

            CREATE TABLE IF NOT EXISTS business_transactions (
                business_transaction_id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                description TEXT,
                transaction_date TEXT DEFAULT (date('now')),
                created_date TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
            CREATE INDEX IF NOT EXISTS idx_subscriptions_expiration_date ON subscriptions(expiration_date);
            CREATE INDEX IF NOT EXISTS idx_credit_balances_vendor_service ON credit_balances(vendor_id, service_name);
        `;

        this.db.exec(schema);
        this.saveToFile();
    }

    // Fixed SQL.js specific methods with proper transaction handling
    prepare(sql) {
        const stmt = this.db.prepare(sql);
        return {
            get: (params = []) => {
                try {
                    stmt.bind(params);
                    if (stmt.step()) {
                        const columns = stmt.getColumnNames();
                        const values = stmt.get();
                        const result = {};
                        columns.forEach((col, i) => {
                            result[col] = values[i];
                        });
                        stmt.reset();
                        return result;
                    }
                    stmt.reset();
                    return null;
                } catch (error) {
                    stmt.reset();
                    throw error;
                }
            },
            all: (params = []) => {
                try {
                    stmt.bind(params);
                    const results = [];
                    const columns = stmt.getColumnNames();
                    while (stmt.step()) {
                        const values = stmt.get();
                        const result = {};
                        columns.forEach((col, i) => {
                            result[col] = values[i];
                        });
                        results.push(result);
                    }
                    stmt.reset();
                    return results;
                } catch (error) {
                    stmt.reset();
                    throw error;
                }
            },
            run: (params = []) => {
                try {
                    stmt.bind(params);
                    const result = stmt.step();
                    const changes = this.db.getRowsModified();
                    stmt.reset();

                    // Save to file if not in transaction
                    if (!this.inTransaction) {
                        this.saveToFile();
                    }

                    return { changes: changes };
                } catch (error) {
                    stmt.reset();
                    throw error;
                }
            }
        };
    }

    exec(sql) {
        try {
            const result = this.db.exec(sql);

            // Save to file if not in transaction
            if (!this.inTransaction) {
                this.saveToFile();
            }

            return result;
        } catch (error) {
            throw error;
        }
    }

    // Fixed transaction method for SQL.js
    transaction(callback) {
        return (params) => {
            try {
                console.log('🔄 Starting database transaction...');
                this.inTransaction = true;
                this.db.exec('BEGIN IMMEDIATE');

                const result = callback(params);

                this.db.exec('COMMIT');
                this.inTransaction = false;
                console.log('✅ Transaction committed successfully');

                // Save to file after successful transaction
                this.saveToFile();

                return result;
            } catch (error) {
                console.error('❌ Transaction error, rolling back:', error);
                try {
                    if (this.inTransaction) {
                        this.db.exec('ROLLBACK');
                        console.log('🔄 Transaction rolled back');
                    }
                } catch (rollbackError) {
                    console.error('❌ Rollback failed:', rollbackError);
                }
                this.inTransaction = false;
                throw error;
            }
        };
    }

    saveToFile() {
        try {
            const data = this.db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(this.dbPath, buffer);
        } catch (error) {
            console.error('❌ Error saving database:', error);
            // Don't throw here as it would break the application
        }
    }

    getDb() {
        return this;
    }

    getDbPath() {
        return this.dbPath;
    }

    close() {
        if (this.db) {
            this.saveToFile();
            this.db.close();
            this.db = null;
            console.log('🗄️  Database connection closed');
        }
    }
}

module.exports = DatabaseManager;
