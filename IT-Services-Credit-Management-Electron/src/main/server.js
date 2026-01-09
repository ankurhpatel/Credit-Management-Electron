const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

class EmbeddedServer {
    constructor(database) {
        this.app = express();
        this.server = null;
        this.port = 3001;
        this.db = database.getDb();

        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(bodyParser.json({ limit: '10mb' }));
        this.app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
        this.app.use(express.static(path.join(__dirname, '../renderer')));

        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });

        this.app.use((error, req, res, next) => {
            console.error('Server Error:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        });
    }

    setupRoutes() {
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../renderer/index.html'));
        });

        this.app.get('/api/health', (req, res) => {
            res.json({ status: 'OK', version: '2.0.0' });
        });

        this.setupCustomerRoutes();
        this.setupVendorRoutes();
        this.setupSubscriptionRoutes();
        this.setupPLRoutes();
        this.setupDashboardRoutes();
        this.setupBusinessRoutes();
        this.setupCreditRoutes();
        this.setupSettingsRoutes();
        this.setupDatabaseRoutes();
        this.setupUtilityRoutes();
    }

    setupDatabaseRoutes() {
        this.app.get('/api/database/tables', (req, res) => {
            try {
                const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
                res.json(tables.map(t => t.name));
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/database/table/:name', (req, res) => {
            try {
                const tableName = req.params.name;
                // Basic SQL injection protection: validate table name against existing tables
                const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
                if (!tables.includes(tableName)) {
                    return res.status(404).json({ error: 'Table not found' });
                }

                const data = this.db.prepare(`SELECT * FROM ${tableName}`).all();
                res.json(data);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/database/execute', (req, res) => {
            try {
                const { sql } = req.body;
                if (!sql) return res.status(400).json({ error: 'SQL query required' });

                // Simple check to prevent completely dropping the database logic, 
                // though user asked for "edit it also" so we allow updates/deletes.
                // We should probably allow SELECTs to return data and others to return change counts.

                if (sql.trim().toLowerCase().startsWith('select')) {
                    const data = this.db.prepare(sql).all();
                    res.json({ type: 'SELECT', data });
                } else {
                    const info = this.db.prepare(sql).run();
                    res.json({ type: 'EXECUTE', changes: info.changes });
                }
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupSettingsRoutes() {
        this.app.get('/api/settings', (req, res) => {
            try {
                const settings = this.db.prepare('SELECT * FROM settings').all();
                const config = {};
                settings.forEach(s => config[s.key] = s.value);
                
                // Safe Defaults for all business fields
                const defaults = {
                    company_name: 'IT Services Management',
                    company_email: 'support@itservices.com',
                    company_phone: '',
                    company_address: '',
                    receipt_instructions: 'No refunds on activated digital services. Hardware warranty valid for 6 months.',
                    company_logo: '',
                    currency_symbol: '$'
                };
                
                res.json({ ...defaults, ...config });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/settings', (req, res) => {
            try {
                console.log('💾 Received settings update request:', Object.keys(req.body));
                const transaction = this.db.transaction(() => {
                    const stmt = this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
                    Object.entries(req.body).forEach(([key, value]) => {
                        if (key && value !== undefined) {
                            stmt.run([key, value.toString()]);
                        }
                    });
                });
                transaction();
                console.log('✅ Settings saved to database');
                res.json({ success: true });
            } catch (error) {
                console.error('❌ Error saving settings:', error);
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupCustomerRoutes() {
        this.app.get('/api/customers', (req, res) => {
            try {
                const customers = this.db.prepare('SELECT * FROM customers ORDER BY created_date DESC').all();
                res.json(customers);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/customers/:customerId', (req, res) => {
            try {
                const customer = this.db.prepare('SELECT * FROM customers WHERE id = ?').get([req.params.customerId]);
                if (!customer) return res.status(404).json({ error: 'Customer not found' });
                res.json(customer);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/customers', (req, res) => {
            try {
                const { name, email, phone, address, internal_notes } = req.body;
                const existing = this.db.prepare('SELECT id FROM customers WHERE email = ?').get([email]);
                if (existing) return res.status(400).json({ error: 'Email already exists' });

                const customerId = this.generateId();
                this.db.prepare(`
                    INSERT INTO customers (id, name, email, phone, address, internal_notes, created_date)
                    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                `).run([customerId, name, email, phone || '', address || '', internal_notes || '']);

                res.status(201).json({ success: true, id: customerId, message: 'Customer created successfully' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.put('/api/customers/:customerId', (req, res) => {
            try {
                const { name, email, phone, address, status, internal_notes } = req.body;
                this.db.prepare(`
                    UPDATE customers
                    SET name = ?, email = ?, phone = ?, address = ?, status = ?, internal_notes = ?
                    WHERE id = ?
                `).run([name, email, phone, address, status, internal_notes, req.params.customerId]);
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.put('/api/customers/:customerId/status', (req, res) => {
            try {
                const { status } = req.body;
                this.db.prepare(`
                    UPDATE customers
                    SET status = ?
                    WHERE id = ?
                `).run([status, req.params.customerId]);
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Customer Profile Endpoint - Full Analytics
        this.app.get('/api/customers/:customerId/profile', (req, res) => {
            try {
                const customerId = req.params.customerId;
                console.log('📊 Loading profile for customer:', customerId);

                // 1. Basic customer info
                const customer = this.db.prepare('SELECT * FROM customers WHERE id = ?').get([customerId]);
                if (!customer) {
                    console.log('Customer not found:', customerId);
                    return res.status(404).json({ error: 'Customer not found' });
                }
                console.log('Customer found:', customer.name);

                // 2. All receipts/transactions (grouped by bundle)
                const receipts = this.db.prepare(`
                    SELECT
                        s.id, s.bundle_id, s.service_name, s.vendor_service_name,
                        s.amount_paid, s.credits_used, s.start_date,
                        s.payment_status, s.payment_type, s.order_status,
                        s.classification, s.mac_address, s.notes, s.created_date,
                        v.name as vendor_name
                    FROM subscriptions s
                    LEFT JOIN vendors v ON s.vendor_id = v.vendor_id
                    WHERE s.customer_id = ?
                    ORDER BY s.created_date DESC
                `).all([customerId]);

                // Group by bundle
                const bundleMap = {};
                receipts.forEach(r => {
                    const bundleId = r.bundle_id || r.id;
                    if (!bundleMap[bundleId]) {
                        bundleMap[bundleId] = {
                            bundleId,
                            date: r.created_date || r.start_date,
                            items: [],
                            total: 0,
                            paymentStatus: r.payment_status,
                            paymentType: r.payment_type,
                            orderStatus: r.order_status
                        };
                    }
                    bundleMap[bundleId].items.push(r);
                    bundleMap[bundleId].total += parseFloat(r.amount_paid || 0);
                });
                const allReceipts = Object.values(bundleMap);

                // 3. Lifetime analytics
                const stats = this.db.prepare(`
                    SELECT
                        COUNT(DISTINCT bundle_id) as total_orders,
                        SUM(amount_paid) as lifetime_value,
                        AVG(amount_paid) as avg_order_value,
                        MIN(start_date) as first_purchase,
                        MAX(start_date) as last_purchase
                    FROM subscriptions
                    WHERE customer_id = ?
                `).get([customerId]);

                // 4. Active subscriptions
                const activeSubscriptions = this.db.prepare(`
                    SELECT
                        s.id, s.service_name, s.vendor_service_name, s.start_date,
                        s.credits_used, s.amount_paid, s.classification,
                        v.name as vendor_name,
                        COUNT(s2.id) as renewal_count
                    FROM subscriptions s
                    LEFT JOIN vendors v ON s.vendor_id = v.vendor_id
                    LEFT JOIN subscriptions s2 ON s2.customer_id = s.customer_id
                        AND s2.vendor_service_name = s.vendor_service_name
                        AND s2.start_date <= s.start_date
                    WHERE s.customer_id = ? AND s.status = 'active'
                    GROUP BY s.id
                    ORDER BY s.start_date DESC
                `).all([customerId]);

                // 5. Purchase history by year
                const yearlyStats = this.db.prepare(`
                    SELECT
                        strftime('%Y', start_date) as year,
                        COUNT(DISTINCT bundle_id) as orders,
                        SUM(amount_paid) as revenue
                    FROM subscriptions
                    WHERE customer_id = ?
                    GROUP BY year
                    ORDER BY year DESC
                `).all([customerId]);

                // 6. Calculate renewal frequency (days between purchases)
                let renewalFrequency = null;
                if (receipts.length > 1) {
                    const uniqueDates = [...new Set(receipts.map(r => r.start_date || r.created_date).filter(d => d))];
                    const dates = uniqueDates.sort();
                    if (dates.length > 1) {
                        const intervals = [];
                        for (let i = 1; i < dates.length; i++) {
                            const diff = (new Date(dates[i]) - new Date(dates[i-1])) / (1000 * 60 * 60 * 24);
                            if (diff > 0) intervals.push(diff);
                        }
                        if (intervals.length > 0) {
                            renewalFrequency = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
                        }
                    }
                }

                // 7. Days since last purchase
                const daysSinceLastPurchase = stats.last_purchase
                    ? Math.floor((new Date() - new Date(stats.last_purchase)) / (1000 * 60 * 60 * 24))
                    : null;

                // 8. Customer segment
                const lifetimeValue = parseFloat(stats.lifetime_value || 0);
                let segment = 'new';
                if (stats.total_orders >= 10 && lifetimeValue >= 1000) segment = 'vip';
                else if (daysSinceLastPurchase && daysSinceLastPurchase > 90) segment = 'at-risk';
                else if (stats.total_orders >= 3) segment = 'regular';

                res.json({
                    customer,
                    receipts: allReceipts,
                    stats: {
                        totalOrders: stats.total_orders || 0,
                        lifetimeValue: lifetimeValue,
                        avgOrderValue: parseFloat(stats.avg_order_value || 0),
                        firstPurchase: stats.first_purchase,
                        lastPurchase: stats.last_purchase,
                        daysSinceLastPurchase,
                        renewalFrequency,
                        segment
                    },
                    activeSubscriptions,
                    yearlyStats
                });
            } catch (error) {
                console.error('Profile Error:', error);
                res.status(500).json({ error: error.message });
            }
        });

        this.app.delete('/api/customers/:customerId', (req, res) => {
            try {
                this.db.prepare('DELETE FROM customers WHERE id = ?').run([req.params.customerId]);
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/customers/:customerId/transactions', (req, res) => {
            try {
                const subs = this.db.prepare('SELECT * FROM subscriptions WHERE customer_id = ? ORDER BY start_date DESC').all([req.params.customerId]);
                res.json({ subscriptions: subs });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/customer-sales', (req, res) => {
            try {
                const subscriptions = this.db.prepare(`
                    SELECT s.*, c.name as customer_name
                    FROM subscriptions s
                    JOIN customers c ON s.customer_id = c.id
                    WHERE s.status = 'active'
                    ORDER BY c.name, s.start_date DESC
                `).all();

                const customerSales = {};
                subscriptions.forEach(sub => {
                    const customerName = sub.customer_name || 'Unknown Customer';
                    const classification = sub.classification || 'General';
                    if (!customerSales[customerName]) {
                        customerSales[customerName] = { classifications: {} };
                    }
                    if (!customerSales[customerName].classifications[classification]) {
                        customerSales[customerName].classifications[classification] = [];
                    }
                    customerSales[customerName].classifications[classification].push({
                        ...sub,
                        CustomerID: sub.customer_id,
                        AmountPaid: sub.amount_paid,
                        CreditsUsed: sub.credits_used,
                        StartDate: sub.start_date,
                        BundleID: sub.bundle_id
                    });
                });
                res.json(customerSales);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupVendorRoutes() {
        this.app.get('/api/vendors', (req, res) => {
            try {
                const vendors = this.db.prepare('SELECT * FROM vendors WHERE is_active = 1 ORDER BY name').all();
                res.json(vendors);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/vendors', (req, res) => {
            try {
                const { name, contactEmail, contactPhone, description } = req.body;
                const id = this.generateId();
                this.db.prepare(`
                    INSERT INTO vendors (vendor_id, name, contact_email, contact_phone, description, created_date)
                    VALUES (?, ?, ?, ?, ?, datetime('now'))
                `).run([id, name, contactEmail || '', contactPhone || '', description || '']);
                res.status(201).json({ success: true, id });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/vendor-services', (req, res) => {
            try {
                const services = this.db.prepare(`
                    SELECT vs.*, v.name as vendor_name 
                    FROM vendor_services vs
                    JOIN vendors v ON vs.vendor_id = v.vendor_id
                    WHERE vs.is_available = 1
                `).all();
                res.json(services);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/vendor-services/:vendorId', (req, res) => {
            try {
                const services = this.db.prepare(`
                    SELECT vs.*, v.name as vendor_name 
                    FROM vendor_services vs
                    JOIN vendors v ON vs.vendor_id = v.vendor_id
                    WHERE vs.vendor_id = ? AND vs.is_available = 1
                `).all([req.params.vendorId]);
                res.json(services);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/vendor-services', (req, res) => {
            try {
                const { vendorID, serviceName, description, itemType, defaultPrice, costPrice } = req.body;
                const serviceId = this.generateId();
                this.db.prepare(`
                    INSERT INTO vendor_services (service_id, vendor_id, service_name, description, item_type, default_price, cost_price, created_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
                `).run([serviceId, vendorID, serviceName, description, itemType, defaultPrice, costPrice]);
                res.status(201).json({ success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.put('/api/vendor-services/:serviceId/threshold', (req, res) => {
            try {
                const { threshold } = req.body;
                this.db.prepare(`
                    UPDATE vendor_services
                    SET low_stock_threshold = ?
                    WHERE service_id = ?
                `).run([threshold, req.params.serviceId]);
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupSubscriptionRoutes() {
        this.app.get('/api/subscriptions', (req, res) => {
            try {
                const subs = this.db.prepare('SELECT s.*, c.name as customer_name FROM subscriptions s JOIN customers c ON s.customer_id = c.id ORDER BY s.created_date DESC').all();
                res.json(subs);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/subscriptions', (req, res) => {
            const transaction = this.db.transaction((data) => {
                const id = this.generateId();
                this.db.prepare(`
                    INSERT INTO subscriptions (id, customer_id, service_name, start_date, expiration_date, amount_paid, credits_used, vendor_id, vendor_service_name, item_type, bundle_id, order_status, payment_type, payment_status, notes, classification, mac_address, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run([id, data.customerID, data.serviceName, data.startDate, data.expirationDate || '9999-12-31', data.amountPaid, data.creditsSelected, data.vendorID, data.vendorServiceName, data.itemType, data.bundleID, data.orderStatus, data.paymentType, data.paymentStatus, data.notes || '', data.classification || '', data.macAddress || '', data.status || 'active']);
                
                if (data.vendorID && data.creditsSelected > 0) {
                    this.db.prepare('UPDATE credit_balances SET remaining_credits = remaining_credits - ?, total_used = total_used + ? WHERE vendor_id = ? AND service_name = ?')
                        .run([data.creditsSelected, data.creditsSelected, data.vendorID, data.vendorServiceName]);
                }
                return id;
            });
            try {
                const id = transaction(req.body);
                res.json({ success: true, id });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/subscriptions/:id', (req, res) => {
            try {
                const sub = this.db.prepare('SELECT * FROM subscriptions WHERE id = ?').get([req.params.id]);
                res.json(sub);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.put('/api/subscriptions/:id', (req, res) => {
            try {
                const transaction = this.db.transaction((data) => {
                    const sub = this.db.prepare('SELECT * FROM subscriptions WHERE id = ?').get([req.params.id]);
                    if (!sub) throw new Error('Subscription not found');

                    // Calculate credit difference for inventory adjustment
                    const oldCredits = sub.credits_used || 0;
                    const newCredits = data.creditsUsed !== undefined ? data.creditsUsed : oldCredits;
                    const creditDiff = newCredits - oldCredits;

                    // Update subscription
                    this.db.prepare(`
                        UPDATE subscriptions
                        SET credits_used = ?, amount_paid = ?, classification = ?, mac_address = ?,
                            order_status = ?, payment_type = ?, payment_status = ?,
                            transaction_id_ref = ?, notes = ?
                        WHERE id = ?
                    `).run([
                        newCredits,
                        data.amountPaid !== undefined ? data.amountPaid : sub.amount_paid,
                        data.classification !== undefined ? data.classification : sub.classification,
                        data.macAddress !== undefined ? data.macAddress : sub.mac_address,
                        data.orderStatus !== undefined ? data.orderStatus : sub.order_status,
                        data.paymentType !== undefined ? data.paymentType : sub.payment_type,
                        data.paymentStatus !== undefined ? data.paymentStatus : sub.payment_status,
                        data.transactionIdRef !== undefined ? data.transactionIdRef : sub.transaction_id_ref,
                        data.notes !== undefined ? data.notes : sub.notes,
                        req.params.id
                    ]);

                    // Adjust credit balance if credits changed
                    if (creditDiff !== 0 && sub.vendor_id && sub.vendor_service_name) {
                        this.db.prepare(`
                            UPDATE credit_balances
                            SET remaining_credits = remaining_credits - ?, total_used = total_used + ?
                            WHERE vendor_id = ? AND service_name = ?
                        `).run([creditDiff, creditDiff, sub.vendor_id, sub.vendor_service_name]);
                    }
                });

                transaction(req.body);
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.put('/api/subscriptions/:id/metadata', (req, res) => {
            try {
                const { orderStatus, paymentType, paymentStatus, transactionIdRef, notes } = req.body;
                this.db.prepare(`
                    UPDATE subscriptions
                    SET order_status = ?, payment_type = ?, payment_status = ?,
                        transaction_id_ref = ?, notes = ?
                    WHERE id = ?
                `).run([orderStatus, paymentType, paymentStatus, transactionIdRef, notes, req.params.id]);
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.delete('/api/subscriptions/:id', (req, res) => {
            try {
                const transaction = this.db.transaction(() => {
                    const sub = this.db.prepare('SELECT * FROM subscriptions WHERE id = ?').get([req.params.id]);
                    if (sub && sub.vendor_id && sub.credits_used > 0) {
                        this.db.prepare('UPDATE credit_balances SET remaining_credits = remaining_credits + ?, total_used = total_used - ? WHERE vendor_id = ? AND service_name = ?')
                            .run([sub.credits_used, sub.credits_used, sub.vendor_id, sub.vendor_service_name]);
                    }
                    this.db.prepare('DELETE FROM subscriptions WHERE id = ?').run([req.params.id]);
                });
                transaction();
                res.json({ success: true, message: 'Deleted' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/bundles/:id', (req, res) => {
            try {
                const items = this.db.prepare('SELECT * FROM subscriptions WHERE bundle_id = ?').all([req.params.id]);
                res.json(items);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.put('/api/bundles/:id', (req, res) => {
            try {
                const { orderStatus, paymentType, paymentStatus, transactionIdRef, notes } = req.body;
                this.db.prepare(`
                    UPDATE subscriptions 
                    SET order_status = ?, payment_type = ?, payment_status = ?, 
                        transaction_id_ref = ?, notes = ?
                    WHERE bundle_id = ?
                `).run([orderStatus, paymentType, paymentStatus, transactionIdRef, notes, req.params.id]);
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.delete('/api/subscriptions/bundle/:bundleId', (req, res) => {
            try {
                const transaction = this.db.transaction(() => {
                    const items = this.db.prepare('SELECT * FROM subscriptions WHERE bundle_id = ?').all([req.params.bundleId]);
                    for (const item of items) {
                        if (item.vendor_id && item.credits_used > 0) {
                            this.db.prepare('UPDATE credit_balances SET remaining_credits = remaining_credits + ?, total_used = total_used - ? WHERE vendor_id = ? AND service_name = ?')
                                .run([item.credits_used, item.credits_used, item.vendor_id, item.vendor_service_name]);
                        }
                    }
                    this.db.prepare('DELETE FROM subscriptions WHERE bundle_id = ?').run([req.params.bundleId]);
                });
                transaction();
                res.json({ success: true, message: 'Bundle deleted' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupPLRoutes() {
        // Unified P&L Summary Route
        this.app.get('/api/pl/summary', (req, res) => {
            try {
                const { month, year, type } = req.query; // type can be 'monthly', 'yearly', or 'lifetime'
                
                let subWhere = "WHERE status = 'active'";
                let subParams = [];

                if (type === 'monthly' && month && year) {
                    subWhere += " AND strftime('%m', start_date) = ? AND strftime('%Y', start_date) = ?";
                    subParams.push(month.toString().padStart(2, '0'), year);
                } else if (type === 'yearly' && year) {
                    subWhere += " AND strftime('%Y', start_date) = ?";
                    subParams.push(year);
                }
                // 'lifetime' has no extra filters

                const data = this.db.prepare(`
                    SELECT 
                        COALESCE(SUM(s.amount_paid), 0) as revenue,
                        COALESCE(SUM(s.credits_used * COALESCE(vs.cost_price, 0)), 0) as cost,
                        COUNT(*) as count,
                        SUM(CASE WHEN s.item_type = 'subscription' THEN s.credits_used ELSE 0 END) as service_months,
                        SUM(CASE WHEN s.item_type = 'hardware' THEN s.credits_used ELSE 0 END) as hardware_units,
                        SUM(CASE WHEN s.item_type = 'subscription' THEN s.amount_paid ELSE 0 END) as revenue_services,
                        SUM(CASE WHEN s.item_type = 'hardware' THEN s.amount_paid ELSE 0 END) as revenue_hardware,
                        SUM(CASE WHEN s.item_type = 'fee' THEN s.amount_paid ELSE 0 END) as revenue_fees
                    FROM subscriptions s
                    LEFT JOIN vendor_services vs ON s.vendor_id = vs.vendor_id AND s.vendor_service_name = vs.service_name
                    ${subWhere}
                `).get(subParams);

                const totalRevenue = data.revenue || 0;
                const estimatedCosts = data.cost || 0;
                const estimatedProfit = totalRevenue - estimatedCosts;
                const totalCreditsUsed = (data.service_months || 0) + (data.hardware_units || 0);

                res.json({
                    totalRevenue,
                    estimatedCosts,
                    estimatedProfit,
                    subscriptionCount: data.count || 0,
                    totalCreditsUsed,
                    serviceMonths: data.service_months || 0,
                    hardwareUnits: data.hardware_units || 0,
                    revenueServices: data.revenue_services || 0,
                    revenueHardware: data.revenue_hardware || 0,
                    avgCostPerCredit: totalCreditsUsed > 0 ? estimatedCosts / totalCreditsUsed : 0,
                    margin: totalRevenue > 0 ? (estimatedProfit / totalRevenue) * 100 : 0
                });
            } catch (error) {
                console.error('P&L Error:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Legacy compatibility routes
        this.app.get('/api/pl/monthly', (req, res) => {
            res.redirect(`/api/pl/summary?type=monthly&month=${req.query.month}&year=${req.query.year}`);
        });

        this.app.get('/api/pl/yearly', (req, res) => {
            res.redirect(`/api/pl/summary?type=yearly&year=${req.query.year}`);
        });
    }

    setupDashboardRoutes() {
        this.app.get('/api/dashboard/stats', (req, res) => {
            try {
                const { month, year } = req.query;
                let subWhere = "WHERE status = 'active'";
                let subParams = [];

                if (year && year !== 'all') {
                    subWhere += " AND strftime('%Y', start_date) = ?";
                    subParams.push(year);
                    if (month && month !== 'all') {
                        subWhere += " AND strftime('%m', start_date) = ?";
                        subParams.push(month.toString().padStart(2, '0'));
                    }
                }

                const kpis = this.db.prepare(`
                    SELECT 
                        COALESCE(SUM(amount_paid), 0) as revenue,
                        COUNT(DISTINCT COALESCE(bundle_id, id)) as orders
                    FROM subscriptions ${subWhere}
                `).get(subParams);

                const cogs = this.db.prepare(`
                    SELECT SUM(s.credits_used * COALESCE(vs.cost_price, 0)) as total_cost
                    FROM subscriptions s
                    LEFT JOIN vendor_services vs ON s.vendor_id = vs.vendor_id AND s.vendor_service_name = vs.service_name
                    ${subWhere}
                `).get(subParams);

                const rev = kpis.revenue || 0;
                const cost = cogs.total_cost || 0;
                const profit = rev - cost;

                const mix = this.db.prepare(`
                    SELECT COALESCE(item_type, 'subscription') as type, SUM(amount_paid) as total
                    FROM subscriptions ${subWhere} GROUP BY type
                `).all(subParams);

                const top = this.db.prepare(`
                    SELECT s.service_name, SUM(s.amount_paid) - SUM(s.credits_used * COALESCE(vs.cost_price, 0)) as profit, COUNT(*) as units_sold, COALESCE(s.item_type, 'subscription') as type
                    FROM subscriptions s
                    LEFT JOIN vendor_services vs ON s.vendor_id = vs.vendor_id AND s.vendor_service_name = vs.service_name
                    ${subWhere} GROUP BY s.service_name ORDER BY profit DESC LIMIT 5
                `).all(subParams);

                const lowStock = this.db.prepare(`
                    SELECT cb.service_name, cb.remaining_credits, v.name as vendor_name,
                           COALESCE(vs.low_stock_threshold, 5) as threshold
                    FROM credit_balances cb
                    JOIN vendors v ON cb.vendor_id = v.vendor_id
                    LEFT JOIN vendor_services vs ON cb.vendor_id = vs.vendor_id
                        AND cb.service_name = vs.service_name
                    WHERE cb.remaining_credits <= COALESCE(vs.low_stock_threshold, 5)
                    ORDER BY cb.remaining_credits ASC LIMIT 10
                `).all();

                res.json({
                    kpis: { revenue: rev, grossProfit: profit, orders: kpis.orders || 0, margin: rev > 0 ? (profit / rev) * 100 : 0 },
                    revenueMix: mix,
                    topItems: top,
                    actionItems: { lowStockList: lowStock }
                });
            } catch (error) {
                console.error('Dash Error:', error);
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/dashboard/profit-data', (req, res) => {
            try {
                const { month, year } = req.query;
                let labels = [], revenue = [], profit = [];

                if (month && month !== 'all' && year && year !== 'all') {
                    const days = new Date(year, month, 0).getDate();
                    for (let d = 1; d <= days; d++) {
                        const date = `${year}-${month.padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                        const data = this.db.prepare(`
                            SELECT SUM(s.amount_paid) as rev, SUM(s.credits_used * COALESCE(vs.cost_price, 0)) as cost
                            FROM subscriptions s
                            LEFT JOIN vendor_services vs ON s.vendor_id = vs.vendor_id AND s.vendor_service_name = vs.service_name
                            WHERE date(s.start_date) = ? AND s.status != 'cancelled'
                        `).get([date]);
                        labels.push(d.toString());
                        revenue.push(data.rev || 0);
                        profit.push((data.rev || 0) - (data.cost || 0));
                    }
                } else {
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    for (let i = 11; i >= 0; i--) {
                        let m, y, label;
                        if (year && year !== 'all') {
                            m = (12 - i).toString().padStart(2, '0'); y = year; label = monthNames[11-i];
                        } else {
                            const d = new Date(); d.setMonth(d.getMonth() - i);
                            m = (d.getMonth() + 1).toString().padStart(2, '0'); y = d.getFullYear().toString();
                            label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                        }
                        const data = this.db.prepare(`
                            SELECT SUM(s.amount_paid) as rev, SUM(s.credits_used * COALESCE(vs.cost_price, 0)) as cost
                            FROM subscriptions s
                            LEFT JOIN vendor_services vs ON s.vendor_id = vs.vendor_id AND s.vendor_service_name = vs.service_name
                            WHERE strftime('%m', s.start_date) = ? AND strftime('%Y', s.start_date) = ? AND s.status != 'cancelled'
                        `).get([m, y]);
                        labels.push(label);
                        revenue.push(data.rev || 0);
                        profit.push((data.rev || 0) - (data.cost || 0));
                    }
                }
                res.json({ labels, revenue, profit });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupBusinessRoutes() {
        this.app.get('/api/business/transactions', (req, res) => {
            try {
                const txs = this.db.prepare('SELECT * FROM business_transactions ORDER BY transaction_date DESC').all();
                res.json({ transactions: txs });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/business/add-money', (req, res) => {
            try {
                const id = this.generateId();
                this.db.prepare('INSERT INTO business_transactions (business_transaction_id, type, amount, description, transaction_date, created_date) VALUES (?, ?, ?, ?, ?, datetime("now"))')
                    .run([id, 'add', req.body.amount, req.body.description, req.body.date]);
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/business/withdraw-money', (req, res) => {
            try {
                const id = this.generateId();
                this.db.prepare('INSERT INTO business_transactions (business_transaction_id, type, amount, description, transaction_date, created_date) VALUES (?, ?, ?, ?, ?, datetime("now"))')
                    .run([id, 'withdraw', req.body.amount, req.body.description, req.body.date]);
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupCreditRoutes() {
        this.app.get('/api/credit-balances', (req, res) => {
            try {
                const balances = this.db.prepare('SELECT cb.*, v.name as vendor_name FROM credit_balances cb JOIN vendors v ON cb.vendor_id = v.vendor_id').all();
                res.json(balances);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/vendor-transactions', (req, res) => {
            try {
                const txs = this.db.prepare('SELECT vt.*, v.name as vendor_name FROM vendor_transactions vt JOIN vendors v ON vt.vendor_id = v.vendor_id ORDER BY vt.purchase_date DESC').all();
                res.json(txs);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/vendor-transactions', (req, res) => {
            const transaction = this.db.transaction((data) => {
                const id = this.generateId();
                this.db.prepare('INSERT INTO vendor_transactions (transaction_id, vendor_id, service_name, credits, price_usd, purchase_date) VALUES (?, ?, ?, ?, ?, ?)')
                    .run([id, data.vendorID, data.serviceName, data.credits, data.priceUSD, data.purchaseDate]);
                
                const existing = this.db.prepare('SELECT * FROM credit_balances WHERE vendor_id = ? AND service_name = ?').get([data.vendorID, data.serviceName]);
                if (existing) {
                    this.db.prepare('UPDATE credit_balances SET remaining_credits = remaining_credits + ?, total_purchased = total_purchased + ? WHERE vendor_id = ? AND service_name = ?')
                        .run([data.credits, data.credits, data.vendorID, data.serviceName]);
                } else {
                    this.db.prepare('INSERT INTO credit_balances (balance_id, vendor_id, service_name, remaining_credits, total_purchased) VALUES (?, ?, ?, ?, ?)')
                        .run([this.generateId(), data.vendorID, data.serviceName, data.credits, data.credits]);
                }
                return id;
            });
            try {
                transaction(req.body);
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.delete('/api/vendor-transactions/:id', (req, res) => {
            try {
                const transaction = this.db.transaction(() => {
                    const vt = this.db.prepare('SELECT * FROM vendor_transactions WHERE transaction_id = ?').get([req.params.id]);
                    if (vt) {
                        this.db.prepare('UPDATE credit_balances SET remaining_credits = remaining_credits - ?, total_purchased = total_purchased - ? WHERE vendor_id = ? AND service_name = ?')
                            .run([vt.credits, vt.credits, vt.vendor_id, vt.service_name]);
                    }
                    this.db.prepare('DELETE FROM vendor_transactions WHERE transaction_id = ?').run([req.params.id]);
                });
                transaction();
                res.json({ success: true, message: 'Deleted' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupUtilityRoutes() {
        this.app.get('/api/subscriptions/weekly-expiring', (req, res) => {
            try {
                const subs = this.db.prepare(`
                    SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
                    FROM subscriptions s 
                    JOIN customers c ON s.customer_id = c.id 
                    WHERE s.status = 'active' AND date(s.expiration_date) <= date('now', '+7 days')
                    ORDER BY s.expiration_date ASC
                `).all();
                res.json(subs);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/subscriptions/monthly-expiring', (req, res) => {
            try {
                const subs = this.db.prepare(`
                    SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
                    FROM subscriptions s 
                    JOIN customers c ON s.customer_id = c.id 
                    WHERE s.status = 'active' AND date(s.expiration_date) <= date('now', '+30 days')
                    ORDER BY s.expiration_date ASC
                `).all();
                res.json(subs);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/search/subscriptions', (req, res) => {
            try {
                const { q } = req.query;
                const subs = this.db.prepare(`
                    SELECT s.*, c.name as customer_name FROM subscriptions s 
                    JOIN customers c ON s.customer_id = c.id
                    WHERE c.name LIKE ? OR s.service_name LIKE ? OR s.mac_address LIKE ?
                `).all([`%${q}%`, `%${q}%`, `%${q}%`]);
                res.json(subs);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    generateId() { return Date.now().toString() + Math.random().toString(36).substr(2, 5); }

    async start() {
        return new Promise((resolve) => {
            this.server = this.app.listen(this.port, () => {
                console.log(`✅ Server running on http://localhost:${this.port}`);
                resolve();
            });
        });
    }

    close() { if (this.server) this.server.close(); }
}

module.exports = EmbeddedServer;