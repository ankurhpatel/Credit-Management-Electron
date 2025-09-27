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

            // Initialize SQL.js
            this.SQL = await initSqlJs();

            // Ensure database directory exists
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // Load existing database or create new one
            let dbBuffer;
            if (fs.existsSync(this.dbPath)) {
                console.log('📖 Loading existing database...');
                dbBuffer = fs.readFileSync(this.dbPath);
            } else {
                console.log('🆕 Creating new database...');
                dbBuffer = null;
            }

            // Create database instance
            this.db = new this.SQL.Database(dbBuffer);
            console.log(`✅ Database connected: ${this.dbPath}`);

            // Set pragmas
            this.db.exec('PRAGMA foreign_keys = ON');

            // Ensure tables exist
            await this.ensureTablesExist();

            // Save database to file
            this.saveToFile();

            return this.db;
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
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
                console.log('✅ Database tables created successfully');
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
