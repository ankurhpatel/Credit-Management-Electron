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

        // Serve static files from renderer directory
        this.app.use(express.static(path.join(__dirname, '../renderer')));

        // Request logging middleware
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });

        // Error handling middleware
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
        // Root route
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../renderer/index.html'));
        });

        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                database: 'Connected',
                version: '2.0.0',
                uptime: process.uptime()
            });
        });

        // Setup all API routes
        this.setupCustomerRoutes();
        this.setupVendorRoutes();
        this.setupSubscriptionRoutes();
        this.setupPLRoutes();
        this.setupDashboardRoutes();
        this.setupBusinessRoutes();
        this.setupCreditRoutes();
        this.setupUtilityRoutes();
    }

    setupCustomerRoutes() {
        // GET /api/customers
        this.app.get('/api/customers', (req, res) => {
            try {
                console.log('📋 Fetching all customers...');
                const customers = this.db.prepare('SELECT * FROM customers ORDER BY created_date DESC').all();
                console.log(`✅ Found ${customers.length} customers`);
                res.json(customers);
            } catch (error) {
                console.error('❌ Error fetching customers:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/customers/:customerId
        this.app.get('/api/customers/:customerId', (req, res) => {
            try {
                const { customerId } = req.params;
                console.log(`📋 Fetching customer: ${customerId}`);

                const customer = this.db.prepare('SELECT * FROM customers WHERE id = ?').get([customerId]);
                if (!customer) {
                    return res.status(404).json({ error: 'Customer not found' });
                }

                console.log(`✅ Customer found: ${customer.name}`);
                res.json(customer);
            } catch (error) {
                console.error('❌ Error fetching customer:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // POST /api/customers
        this.app.post('/api/customers', (req, res) => {
            try {
                console.log('➕ Creating new customer...');
                const { name, email, phone, address, internal_notes } = req.body;

                // Validation
                if (!name || !email) {
                    return res.status(400).json({ error: 'Name and email are required' });
                }

                if (name.trim().length < 2) {
                    return res.status(400).json({ error: 'Name must be at least 2 characters long' });
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return res.status(400).json({ error: 'Valid email address is required' });
                }

                // Check for existing customer
                const existing = this.db.prepare('SELECT id FROM customers WHERE email = ?').get([email]);
                if (existing) {
                    return res.status(400).json({ error: 'Customer with this email already exists' });
                }

                const customerId = this.generateId();

                const stmt = this.db.prepare(`
                    INSERT INTO customers (id, name, email, phone, address, internal_notes, created_date)
                    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                `);

                const result = stmt.run([customerId, name.trim(), email.trim().toLowerCase(), phone || '', address || '', internal_notes || '']);

                if (result.changes === 0) {
                    throw new Error('Failed to create customer');
                }

                const newCustomer = this.db.prepare('SELECT * FROM customers WHERE id = ?').get([customerId]);
                console.log(`✅ Customer created: ${newCustomer.name} (${newCustomer.id})`);

                res.status(201).json({
                    success: true,
                    message: 'Customer added successfully',
                    customer: newCustomer
                });
            } catch (error) {
                console.error('❌ Error creating customer:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // PUT /api/customers/:customerId/status
        this.app.put('/api/customers/:customerId/status', (req, res) => {
            try {
                const { customerId } = req.params;
                const { status } = req.body;

                console.log(`🔄 Updating customer status: ${customerId} to ${status}`);

                if (!status || !['active', 'inactive'].includes(status)) {
                    return res.status(400).json({ error: 'Valid status (active/inactive) is required' });
                }

                const stmt = this.db.prepare('UPDATE customers SET status = ? WHERE id = ?');
                const result = stmt.run([status, customerId]);

                if (result.changes === 0) {
                    return res.status(404).json({ error: 'Customer not found' });
                }

                console.log(`✅ Customer status updated: ${customerId} -> ${status}`);
                res.json({
                    success: true,
                    message: `Customer status updated to ${status}`
                });
            } catch (error) {
                console.error('❌ Error updating customer status:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // PUT /api/customers/:customerId
        this.app.put('/api/customers/:customerId', (req, res) => {
            try {
                const { customerId } = req.params;
                const { name, email, phone, address, status, internal_notes } = req.body;

                console.log(`✏️ Updating customer: ${customerId}`);

                // Validation
                if (!name || !email) {
                    return res.status(400).json({ error: 'Name and email are required' });
                }

                if (name.trim().length < 2) {
                    return res.status(400).json({ error: 'Name must be at least 2 characters long' });
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return res.status(400).json({ error: 'Valid email address is required' });
                }

                // Check if email is already used by another customer
                const existing = this.db.prepare('SELECT id FROM customers WHERE email = ? AND id != ?').get([email, customerId]);
                if (existing) {
                    return res.status(400).json({ error: 'Email is already used by another customer' });
                }

                const stmt = this.db.prepare(`
                    UPDATE customers 
                    SET name = ?, email = ?, phone = ?, address = ?, status = ?, internal_notes = ?
                    WHERE id = ?
                `);

                const result = stmt.run([name.trim(), email.trim().toLowerCase(), phone || '', address || '', status || 'active', internal_notes || '', customerId]);

                if (result.changes === 0) {
                    return res.status(404).json({ error: 'Customer not found' });
                }

                const updatedCustomer = this.db.prepare('SELECT * FROM customers WHERE id = ?').get([customerId]);
                console.log(`✅ Customer updated: ${updatedCustomer.name} (${customerId})`);

                res.json({
                    success: true,
                    message: 'Customer updated successfully',
                    customer: updatedCustomer
                });
            } catch (error) {
                console.error('❌ Error updating customer:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // DELETE /api/customers/:customerId
        this.app.delete('/api/customers/:customerId', (req, res) => {
            try {
                const { customerId } = req.params;
                console.log(`🗑️ Deleting customer: ${customerId}`);

                // Check if customer has active subscriptions
                const activeSubscriptions = this.db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE customer_id = ? AND status = "active"').get([customerId]);
                if (activeSubscriptions.count > 0) {
                    return res.status(400).json({
                        error: 'Cannot delete customer with active subscriptions. Please cancel subscriptions first.'
                    });
                }

                const stmt = this.db.prepare('DELETE FROM customers WHERE id = ?');
                const result = stmt.run([customerId]);

                if (result.changes === 0) {
                    return res.status(404).json({ error: 'Customer not found' });
                }

                console.log(`✅ Customer deleted: ${customerId}`);
                res.json({
                    success: true,
                    message: 'Customer deleted successfully'
                });
            } catch (error) {
                console.error('❌ Error deleting customer:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/customers/:customerId/transactions
        this.app.get('/api/customers/:customerId/transactions', (req, res) => {
            try {
                const { customerId } = req.params;
                console.log(`📊 Fetching transactions for customer: ${customerId}`);

                const customer = this.db.prepare('SELECT * FROM customers WHERE id = ?').get([customerId]);
                if (!customer) {
                    return res.status(404).json({ error: 'Customer not found' });
                }

                const subscriptions = this.db.prepare(`
                    SELECT * FROM subscriptions 
                    WHERE customer_id = ? 
                    ORDER BY created_date DESC
                `).all([customerId]);

                // Group by classification
                const groupedSubscriptions = {};
                subscriptions.forEach(sub => {
                    const classification = sub.classification || 'General';
                    if (!groupedSubscriptions[classification]) {
                        groupedSubscriptions[classification] = [];
                    }
                    groupedSubscriptions[classification].push(sub);
                });

                const totalPaid = subscriptions.reduce((sum, sub) => sum + (sub.amount_paid || 0), 0);
                const totalMonths = subscriptions.reduce((sum, sub) => sum + (sub.credits_used || 0), 0);

                console.log(`✅ Found ${subscriptions.length} transactions for customer ${customer.name}`);
                res.json({
                    customer,
                    subscriptions,
                    groupedSubscriptions,
                    summary: {
                        totalPaid,
                        totalMonths,
                        totalTransactions: subscriptions.length
                    }
                });
            } catch (error) {
                console.error('❌ Error fetching customer transactions:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/customer-sales
        this.app.get('/api/customer-sales', (req, res) => {
            try {
                console.log('📊 Loading customer sales data...');

                const subscriptions = this.db.prepare(`
                    SELECT s.*, c.name as customer_name
                    FROM subscriptions s
                    JOIN customers c ON s.customer_id = c.id
                    WHERE s.status = 'active'
                    ORDER BY c.name, s.start_date DESC
                `).all();

                console.log(`Found ${subscriptions.length} customer subscriptions`);

                // Group by customer name
                const customerSales = {};
                subscriptions.forEach(sub => {
                    const customerName = sub.customer_name || 'Unknown Customer';
                    const classification = sub.classification || 'General';

                    if (!customerSales[customerName]) {
                        customerSales[customerName] = {
                            classifications: {}
                        };
                    }

                    if (!customerSales[customerName].classifications[classification]) {
                        customerSales[customerName].classifications[classification] = [];
                    }

                    customerSales[customerName].classifications[classification].push({
                        id: sub.id,
                        customer_id: sub.customer_id,
                        service_name: sub.service_name,
                        start_date: sub.start_date,
                        expiration_date: sub.expiration_date,
                        amount_paid: sub.amount_paid || 0,
                        credits_used: sub.credits_used || 0,
                        mac_address: sub.mac_address || '', // Include MAC address
                        status: sub.status,
                        notes: sub.notes,
                        item_type: sub.item_type || 'subscription',
                        bundle_id: sub.bundle_id || null,
                        payment_type: sub.payment_type || 'Cash',
                        payment_status: sub.payment_status || 'Paid',
                        transaction_id_ref: sub.transaction_id_ref || null,
                        order_status: sub.order_status || 'Closed',
                        created_date: sub.created_date,
                        // Also include alternative property names for compatibility
                        CustomerID: sub.customer_id,
                        AmountPaid: sub.amount_paid || 0,
                        CreditsUsed: sub.credits_used || 0,
                        StartDate: sub.start_date,
                        MacAddress: sub.mac_address || '',
                        BundleID: sub.bundle_id || null,
                        PaymentType: sub.payment_type || 'Cash',
                        PaymentStatus: sub.payment_status || 'Paid',
                        OrderStatus: sub.order_status || 'Closed'
                    });
                });

                console.log(`✅ Grouped into ${Object.keys(customerSales).length} customers`);
                res.json(customerSales);
            } catch (error) {
                console.error('❌ Error fetching customer sales:', error);
                res.status(500).json({
                    error: 'Failed to load customer sales',
                    message: error.message
                });
            }
        });
    }

    setupVendorRoutes() {
        // GET /api/vendors
        this.app.get('/api/vendors', (req, res) => {
            try {
                console.log('📋 Fetching all vendors...');
                const vendors = this.db.prepare('SELECT * FROM vendors WHERE is_active = 1 ORDER BY name').all();
                console.log(`✅ Found ${vendors.length} vendors`);
                res.json(vendors);
            } catch (error) {
                console.error('❌ Error fetching vendors:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/vendors/:vendorId
        this.app.get('/api/vendors/:vendorId', (req, res) => {
            try {
                const { vendorId } = req.params;
                console.log(`📋 Fetching vendor: ${vendorId}`);

                const vendor = this.db.prepare('SELECT * FROM vendors WHERE vendor_id = ? AND is_active = 1').get([vendorId]);
                if (!vendor) {
                    return res.status(404).json({ error: 'Vendor not found' });
                }

                console.log(`✅ Vendor found: ${vendor.name}`);
                res.json(vendor);
            } catch (error) {
                console.error('❌ Error fetching vendor:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // POST /api/vendors  
        this.app.post('/api/vendors', (req, res) => {
            try {
                console.log('➕ Creating new vendor...');
                const { name, contactEmail, contactPhone, description } = req.body;

                // Validation
                if (!name || name.trim().length < 2) {
                    return res.status(400).json({ error: 'Vendor name must be at least 2 characters long' });
                }

                // Deduplication Check (Case-insensitive)
                const existing = this.db.prepare('SELECT vendor_id FROM vendors WHERE LOWER(name) = LOWER(?)').get([name.trim()]);
                if (existing) {
                    return res.status(400).json({ error: `A vendor named "${name.trim()}" already exists.` });
                }

                if (contactEmail) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(contactEmail)) {
                        return res.status(400).json({ error: 'Contact email format is invalid' });
                    }
                }

                const vendorId = this.generateId();

                const stmt = this.db.prepare(`
                    INSERT INTO vendors (vendor_id, name, contact_email, contact_phone, description, created_date)
                    VALUES (?, ?, ?, ?, ?, datetime('now'))
                `);

                const result = stmt.run([vendorId, name.trim(), contactEmail || '', contactPhone || '', description || '']);

                if (result.changes === 0) {
                    throw new Error('Failed to create vendor');
                }

                const newVendor = this.db.prepare('SELECT * FROM vendors WHERE vendor_id = ?').get([vendorId]);
                console.log(`✅ Vendor created: ${newVendor.name} (${newVendor.vendor_id})`);

                res.status(201).json({
                    success: true,
                    message: 'Vendor added successfully',
                    vendor: newVendor
                });
            } catch (error) {
                console.error('❌ Error creating vendor:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // DELETE /api/vendors/:vendorId
        this.app.delete('/api/vendors/:vendorId', (req, res) => {
            try {
                const { vendorId } = req.params;
                const { password } = req.headers; // Checking password in headers for simplicity

                console.log(`🗑️ Deleting vendor: ${vendorId}`);

                // Safety Password Check
                if (password !== '1234') {
                    return res.status(403).json({ error: 'Unauthorized: Invalid safety password.' });
                }

                // 1. Check for active subscriptions linked to this vendor
                const activeSubs = this.db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE vendor_id = ? AND status = "active"').get([vendorId]);
                if (activeSubs.count > 0) {
                    return res.status(400).json({ 
                        error: 'Cannot delete vendor with active subscriptions. Cancel them first.' 
                    });
                }

                // 2. We allow deletion if no active subs. 
                // Using a transaction to ensure clean cleanup
                const deleteTransaction = this.db.transaction(() => {
                    // Delete services (foreign key cascade handles this if set, but let's be explicit or safe)
                    this.db.prepare('DELETE FROM vendor_services WHERE vendor_id = ?').run([vendorId]);
                    // Delete credit balances
                    this.db.prepare('DELETE FROM credit_balances WHERE vendor_id = ?').run([vendorId]);
                    // Finally delete vendor
                    return this.db.prepare('DELETE FROM vendors WHERE vendor_id = ?').run([vendorId]);
                });

                const result = deleteTransaction();

                if (result.changes === 0) {
                    return res.status(404).json({ error: 'Vendor not found' });
                }

                console.log(`✅ Vendor deleted: ${vendorId}`);
                res.json({
                    success: true,
                    message: 'Vendor and associated services deleted successfully'
                });
            } catch (error) {
                console.error('❌ Error deleting vendor:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/vendor-services
        this.app.get('/api/vendor-services', (req, res) => {
            try {
                console.log('📋 Fetching all vendor services...');
                const services = this.db.prepare(`
                    SELECT vs.*, v.name as vendor_name 
                    FROM vendor_services vs
                    JOIN vendors v ON vs.vendor_id = v.vendor_id
                    WHERE vs.is_available = 1 AND v.is_active = 1
                    ORDER BY v.name, vs.service_name
                `).all();
                console.log(`✅ Found ${services.length} vendor services`);
                res.json(services);
            } catch (error) {
                console.error('❌ Error fetching vendor services:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/vendor-services/:vendorId
        this.app.get('/api/vendor-services/:vendorId', (req, res) => {
            try {
                const { vendorId } = req.params;
                console.log(`📋 Fetching services for vendor: ${vendorId}`);
                const services = this.db.prepare(`
                    SELECT * FROM vendor_services 
                    WHERE vendor_id = ? AND is_available = 1
                    ORDER BY service_name
                `).all([vendorId]);
                console.log(`✅ Found ${services.length} services for vendor ${vendorId}`);
                res.json(services);
            } catch (error) {
                console.error('❌ Error fetching vendor services:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // POST /api/vendor-services
        this.app.post('/api/vendor-services', (req, res) => {
            try {
                console.log('➕ Creating new vendor service...');
                const { vendorID, serviceName, description, itemType, defaultPrice, costPrice } = req.body;

                // Validation
                if (!vendorID || !serviceName) {
                    return res.status(400).json({ error: 'Vendor ID and service name are required' });
                }

                if (serviceName.trim().length < 2) {
                    return res.status(400).json({ error: 'Service name must be at least 2 characters long' });
                }

                // Check if vendor exists
                const vendor = this.db.prepare('SELECT name FROM vendors WHERE vendor_id = ? AND is_active = 1').get([vendorID]);
                if (!vendor) {
                    return res.status(400).json({ error: 'Vendor not found or inactive' });
                }

                // Check for duplicate service name for this vendor
                const existing = this.db.prepare('SELECT service_id FROM vendor_services WHERE vendor_id = ? AND service_name = ? AND is_available = 1').get([vendorID, serviceName.trim()]);
                if (existing) {
                    return res.status(400).json({ error: 'Service with this name already exists for this vendor' });
                }

                const serviceId = this.generateId();

                const stmt = this.db.prepare(`
                    INSERT INTO vendor_services (service_id, vendor_id, service_name, description, item_type, default_price, cost_price, created_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
                `);

                const result = stmt.run([
                    serviceId, 
                    vendorID, 
                    serviceName.trim(), 
                    description || '',
                    itemType || 'subscription',
                    parseFloat(defaultPrice) || 0,
                    parseFloat(costPrice) || 0
                ]);

                if (result.changes === 0) {
                    throw new Error('Failed to create vendor service');
                }

                const newService = this.db.prepare('SELECT * FROM vendor_services WHERE service_id = ?').get([serviceId]);
                console.log(`✅ Vendor service created: ${vendor.name} - ${newService.service_name}`);

                res.status(201).json({
                    success: true,
                    message: 'Vendor service added successfully',
                    service: newService
                });
            } catch (error) {
                console.error('❌ Error creating vendor service:', error);
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupSubscriptionRoutes() {
        // GET /api/subscriptions
        this.app.get('/api/subscriptions', (req, res) => {
            try {
                console.log('📋 Fetching all subscriptions...');
                const { status, customer_id } = req.query;

                let query = `
                    SELECT s.*, c.name as customer_name
                    FROM subscriptions s
                    JOIN customers c ON s.customer_id = c.id
                `;
                const params = [];
                const conditions = [];

                if (status) {
                    conditions.push('s.status = ?');
                    params.push(status);
                }

                if (customer_id) {
                    conditions.push('s.customer_id = ?');
                    params.push(customer_id);
                }

                if (conditions.length > 0) {
                    query += ' WHERE ' + conditions.join(' AND ');
                }

                query += ' ORDER BY s.created_date DESC';

                const subscriptions = this.db.prepare(query).all(params);
                console.log(`✅ Found ${subscriptions.length} subscriptions`);
                res.json(subscriptions);
            } catch (error) {
                console.error('❌ Error fetching subscriptions:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/subscriptions/:subscriptionId
        this.app.get('/api/subscriptions/:subscriptionId', (req, res) => {
            try {
                const { subscriptionId } = req.params;
                console.log(`📋 Fetching subscription: ${subscriptionId}`);

                const subscription = this.db.prepare(`
                    SELECT s.*, c.name as customer_name, c.email as customer_email
                    FROM subscriptions s
                    JOIN customers c ON s.customer_id = c.id
                    WHERE s.id = ?
                `).get([subscriptionId]);

                if (!subscription) {
                    return res.status(404).json({ error: 'Subscription not found' });
                }

                console.log(`✅ Subscription found: ${subscription.service_name} for ${subscription.customer_name}`);
                res.json(subscription);
            } catch (error) {
                console.error('❌ Error fetching subscription:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // COMPLETE POST /api/subscriptions with MAC address support
        this.app.post('/api/subscriptions', (req, res) => {
            console.log('📝 Received subscription request:', req.body);

            const transaction = this.db.transaction((subscriptionData) => {
                try {
                    console.log('📝 Processing subscription creation:', subscriptionData);

                    const {
                        customerID, serviceName, startDate, creditsSelected,
                        amountPaid, status, vendorID, vendorServiceName,
                        notes, classification, macAddress, itemType, bundleID,
                        paymentType, paymentStatus, transactionIdRef, orderStatus
                    } = subscriptionData;

                    // 1. Basic Validation
                    if (!customerID || !startDate) {
                        throw new Error('Customer ID and Start Date are required');
                    }

                    // 2. Generate ID and Calculate Dates
                    const subscriptionId = this.generateId();
                    const startDateObj = new Date(startDate);
                    let expirationDateStr = '';
                    
                    const credits = parseInt(creditsSelected || 0);
                    if (itemType === 'subscription') {
                        const expirationDateObj = new Date(startDateObj);
                        expirationDateObj.setMonth(expirationDateObj.getMonth() + credits);
                        expirationDateObj.setDate(expirationDateObj.getDate() - 1);
                        expirationDateStr = expirationDateObj.toISOString().split('T')[0];
                    } else {
                        // Hardware/Fees/Products don't expire. 
                        // Set to a far future date to satisfy any "expiration > start" constraints
                        expirationDateStr = '9999-12-31';
                    }

                    // 3. Normalize MAC Address
                    let normalizedMacAddress = '';
                    if (macAddress && macAddress.trim() !== '') {
                        const cleaned = macAddress.replace(/[:-]/g, '').toUpperCase();
                        normalizedMacAddress = cleaned.match(/.{2}/g)?.join(':') || macAddress;
                    }

                    // 4. Credit/Stock Check
                    if (itemType !== 'fee' && vendorID && vendorServiceName && credits > 0) {
                        const creditBalance = this.db.prepare(`
                            SELECT remaining_credits FROM credit_balances 
                            WHERE vendor_id = ? AND service_name = ?
                        `).get([vendorID, vendorServiceName]);

                        if (!creditBalance || creditBalance.remaining_credits < credits) {
                            throw new Error(`Insufficient stock for ${vendorServiceName}. Available: ${creditBalance ? creditBalance.remaining_credits : 0}`);
                        }
                    }

                    // 5. Insert Record
                    const stmt = this.db.prepare(`
                        INSERT INTO subscriptions (
                            id, customer_id, service_name, start_date, expiration_date, 
                            amount_paid, status, vendor_id, vendor_service_name, 
                            credits_used, notes, classification, mac_address, 
                            item_type, bundle_id, payment_type, payment_status, 
                            transaction_id_ref, order_status, created_date
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                    `);

                    const insertResult = stmt.run([
                        subscriptionId,
                        customerID,
                        serviceName || 'IT Service',
                        startDate,
                        expirationDateStr,
                        parseFloat(amountPaid || 0),
                        status || 'active',
                        vendorID || '',
                        vendorServiceName || '',
                        credits,
                        notes || '',
                        classification || '',
                        normalizedMacAddress,
                        itemType || 'subscription',
                        bundleID || null,
                        paymentType || 'Cash',
                        paymentStatus || 'Paid',
                        transactionIdRef || null,
                        orderStatus || 'Closed'
                    ]);

                    if (insertResult.changes === 0) {
                        throw new Error('Failed to create subscription record');
                    }

                    // 6. Update Inventory/Stock
                    if (vendorID && vendorServiceName && credits > 0) {
                        const updateStmt = this.db.prepare(`
                            UPDATE credit_balances 
                            SET remaining_credits = remaining_credits - ?, 
                                total_used = total_used + ?,
                                last_updated = datetime('now')
                            WHERE vendor_id = ? AND service_name = ?
                        `);
                        updateStmt.run([credits, credits, vendorID, vendorServiceName]);
                    }

                    return { subscriptionId };
                } catch (error) {
                    console.error('❌ Error in subscription transaction:', error);
                    throw error;
                }
            });

            try {
                const result = transaction(req.body);
                const newSubscription = this.db.prepare('SELECT * FROM subscriptions WHERE id = ?').get([result.subscriptionId]);

                res.status(201).json({
                    success: true,
                    message: 'Sale processed successfully',
                    subscription: newSubscription
                });
            } catch (error) {
                console.error('❌ Error creating subscription:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // PUT /api/subscriptions/:subscriptionId/status
        this.app.put('/api/subscriptions/:subscriptionId/status', (req, res) => {
            try {
                const { subscriptionId } = req.params;
                const { status } = req.body;

                console.log(`🔄 Updating subscription status: ${subscriptionId} to ${status}`);

                const validStatuses = ['active', 'expired', 'cancelled', 'suspended'];
                if (!status || !validStatuses.includes(status)) {
                    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
                }

                const stmt = this.db.prepare('UPDATE subscriptions SET status = ? WHERE id = ?');
                const result = stmt.run([status, subscriptionId]);

                if (result.changes === 0) {
                    return res.status(404).json({ error: 'Subscription not found' });
                }

                console.log(`✅ Subscription status updated: ${subscriptionId} -> ${status}`);
                res.json({
                    success: true,
                    message: `Subscription status updated to ${status}`
                });
            } catch (error) {
                console.error('❌ Error updating subscription status:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // PUT /api/subscriptions/:id/order-status
        this.app.put('/api/subscriptions/:id/order-status', (req, res) => {
            try {
                const { id } = req.params;
                const { orderStatus } = req.body;
                this.db.prepare('UPDATE subscriptions SET order_status = ? WHERE id = ?').run([orderStatus, id]);
                res.json({ success: true, message: 'Order status updated' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // PUT /api/subscriptions/:id/metadata
        this.app.put('/api/subscriptions/:id/metadata', (req, res) => {
            try {
                const { id } = req.params;
                const { orderStatus, paymentType, paymentStatus, transactionIdRef, notes } = req.body;
                this.db.prepare(`
                    UPDATE subscriptions 
                    SET order_status = ?, payment_type = ?, payment_status = ?, 
                        transaction_id_ref = ?, notes = ?
                    WHERE id = ?
                `).run([orderStatus, paymentType, paymentStatus, transactionIdRef, notes, id]);
                res.json({ success: true, message: 'Metadata updated' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // PUT /api/subscriptions/bundle/:bundleId/status
        this.app.put('/api/subscriptions/bundle/:bundleId/status', (req, res) => {
            try {
                const { bundleId } = req.params;
                const { orderStatus } = req.body;
                this.db.prepare('UPDATE subscriptions SET order_status = ? WHERE bundle_id = ?').run([orderStatus, bundleId]);
                res.json({ success: true, message: 'Combo order status updated' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/subscriptions/weekly-expiring
        this.app.get('/api/subscriptions/weekly-expiring', (req, res) => {
            try {
                console.log('📅 Fetching weekly expiring subscriptions...');
                const expiring = this.db.prepare(`
                    SELECT s.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
                    FROM subscriptions s
                    JOIN customers c ON s.customer_id = c.id
                    WHERE s.status = 'active' 
                        AND date(s.expiration_date) > date('now')
                        AND date(s.expiration_date) <= date('now', '+7 days')
                    ORDER BY s.expiration_date
                `).all();

                console.log(`✅ Found ${expiring.length} subscriptions expiring this week`);
                res.json(expiring);
            } catch (error) {
                console.error('❌ Error fetching weekly expiring subscriptions:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/subscriptions/monthly-expiring
        this.app.get('/api/subscriptions/monthly-expiring', (req, res) => {
            try {
                console.log('📅 Fetching monthly expiring subscriptions...');
                const expiring = this.db.prepare(`
                    SELECT s.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
                    FROM subscriptions s
                    JOIN customers c ON s.customer_id = c.id
                    WHERE s.status = 'active' 
                        AND date(s.expiration_date) > date('now')
                        AND date(s.expiration_date) <= date('now', '+30 days')
                    ORDER BY s.expiration_date
                `).all();

                console.log(`✅ Found ${expiring.length} subscriptions expiring this month`);
                res.json(expiring);
            } catch (error) {
                console.error('❌ Error fetching monthly expiring subscriptions:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/subscriptions/by-mac/:macAddress
        this.app.get('/api/subscriptions/by-mac/:macAddress', (req, res) => {
            try {
                const { macAddress } = req.params;
                console.log(`🔍 Searching for subscription by MAC address: ${macAddress}`);

                const normalizedMac = macAddress.replace(/[:-]/g, '').toUpperCase();

                const subscription = this.db.prepare(`
                    SELECT s.*, c.name as customer_name, c.email as customer_email
                    FROM subscriptions s
                    JOIN customers c ON s.customer_id = c.id
                    WHERE REPLACE(REPLACE(UPPER(s.mac_address), ':', ''), '-', '') = ?
                    ORDER BY s.created_date DESC
                    LIMIT 1
                `).get([normalizedMac]);

                if (!subscription) {
                    return res.status(404).json({ error: 'No subscription found for this MAC address' });
                }

                console.log(`✅ Subscription found for MAC ${macAddress}: ${subscription.customer_name}`);
                res.json(subscription);
            } catch (error) {
                console.error('❌ Error searching subscription by MAC:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // DELETE /api/subscriptions/:id
        this.app.delete('/api/subscriptions/:id', (req, res) => {
            try {
                const { id } = req.params;
                const { password } = req.headers;

                if (password !== '1234') {
                    return res.status(403).json({ error: 'Unauthorized: Invalid safety password.' });
                }

                const transaction = this.db.transaction(() => {
                    // 1. Get the subscription details to restore stock
                    const sub = this.db.prepare('SELECT * FROM subscriptions WHERE id = ?').get([id]);
                    if (!sub) throw new Error('Transaction not found');

                    // 2. Restore Stock if vendor data exists
                    if (sub.vendor_id && sub.vendor_service_name && sub.credits_used > 0) {
                        this.db.prepare(`
                            UPDATE credit_balances 
                            SET remaining_credits = remaining_credits + ?, 
                                total_used = total_used - ?,
                                last_updated = datetime('now')
                            WHERE vendor_id = ? AND service_name = ?
                        `).run([sub.credits_used, sub.credits_used, sub.vendor_id, sub.vendor_service_name]);
                    }

                    // 3. Delete the record
                    return this.db.prepare('DELETE FROM subscriptions WHERE id = ?').run([id]);
                });

                const result = transaction();
                res.json({ success: true, message: 'Customer transaction deleted and stock restored.' });
            } catch (error) {
                console.error('❌ Error deleting subscription:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // DELETE /api/subscriptions/bundle/:bundleId
        this.app.delete('/api/subscriptions/bundle/:bundleId', (req, res) => {
            try {
                const { bundleId } = req.params;
                const { password } = req.headers;

                if (password !== '1234') {
                    return res.status(403).json({ error: 'Unauthorized: Invalid safety password.' });
                }

                const transaction = this.db.transaction(() => {
                    // 1. Get all items in the bundle to restore stock
                    const items = this.db.prepare('SELECT * FROM subscriptions WHERE bundle_id = ?').all([bundleId]);
                    
                    for (const item of items) {
                        if (item.vendor_id && item.vendor_service_name && item.credits_used > 0) {
                            this.db.prepare(`
                                UPDATE credit_balances 
                                SET remaining_credits = remaining_credits + ?, 
                                    total_used = total_used - ?,
                                    last_updated = datetime('now')
                                WHERE vendor_id = ? AND service_name = ?
                            `).run([item.credits_used, item.credits_used, item.vendor_id, item.vendor_service_name]);
                        }
                    }

                    // 2. Delete all records in the bundle
                    return this.db.prepare('DELETE FROM subscriptions WHERE bundle_id = ?').run([bundleId]);
                });

                transaction();
                res.json({ success: true, message: 'Entire combo bundle deleted and stock restored.' });
            } catch (error) {
                console.error('❌ Error deleting bundle:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/bundles/:bundleId - Get all items in a bundle
        this.app.get('/api/bundles/:bundleId', (req, res) => {
            try {
                const { bundleId } = req.params;
                const items = this.db.prepare('SELECT * FROM subscriptions WHERE bundle_id = ?').all([bundleId]);
                if (items.length === 0) return res.status(404).json({ error: 'Bundle not found' });
                res.json(items);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // PUT /api/bundles/:bundleId - Update all items in a bundle (status, payment, etc)
        this.app.put('/api/bundles/:bundleId', (req, res) => {
            try {
                const { bundleId } = req.params;
                const { orderStatus, paymentType, paymentStatus, transactionIdRef, notes } = req.body;
                
                this.db.prepare(`
                    UPDATE subscriptions 
                    SET order_status = ?, payment_type = ?, payment_status = ?, 
                        transaction_id_ref = ?, notes = ?
                    WHERE bundle_id = ?
                `).run([orderStatus, paymentType, paymentStatus, transactionIdRef, notes, bundleId]);
                
                res.json({ success: true, message: 'Bundle updated successfully' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupPLRoutes() {
        // GET /api/pl/monthly
        this.app.get('/api/pl/monthly', (req, res) => {
            try {
                const { month, year } = req.query;
                console.log(`📊 Generating monthly P&L for ${month}/${year}...`);

                if (!month || !year) {
                    return res.status(400).json({ error: 'Month and year are required' });
                }

                if (parseInt(month) < 1 || parseInt(month) > 12) {
                    return res.status(400).json({ error: 'Month must be between 1 and 12' });
                }

                const currentYear = new Date().getFullYear();
                if (parseInt(year) < 2020 || parseInt(year) > currentYear + 1) {
                    return res.status(400).json({ error: `Year must be between 2020 and ${currentYear + 1}` });
                }

                const subscriptions = this.db.prepare(`
                    SELECT * FROM subscriptions 
                    WHERE strftime('%m', start_date) = ? AND strftime('%Y', start_date) = ?
                    AND status = 'active'
                `).all([month.padStart(2, '0'), year]);

                const totalRevenue = subscriptions.reduce((sum, sub) => sum + (sub.amount_paid || 0), 0);
                const totalCreditsUsed = subscriptions.reduce((sum, sub) => sum + (sub.credits_used || 0), 0);

                // Get average cost per credit
                const avgCostResult = this.db.prepare(`
                    SELECT AVG(CAST(price_usd AS REAL) / CAST(credits AS REAL)) as avg_cost 
                    FROM vendor_transactions WHERE credits > 0
                `).get();

                const avgCostPerCredit = avgCostResult?.avg_cost || 0;
                const estimatedCosts = totalCreditsUsed * avgCostPerCredit;
                const estimatedProfit = totalRevenue - estimatedCosts;

                console.log(`✅ Monthly P&L calculated: Revenue $${totalRevenue}, Profit $${estimatedProfit}`);
                res.json({
                    totalRevenue,
                    totalCreditsUsed,
                    avgCostPerCredit,
                    estimatedCosts,
                    estimatedProfit,
                    subscriptionCount: subscriptions.length,
                    period: `${month}/${year}`
                });
            } catch (error) {
                console.error('❌ Error fetching monthly P&L:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/pl/yearly
        this.app.get('/api/pl/yearly', (req, res) => {
            try {
                const { year } = req.query;
                console.log(`📊 Generating yearly P&L for ${year}...`);

                if (!year) {
                    return res.status(400).json({ error: 'Year is required' });
                }

                const currentYear = new Date().getFullYear();
                if (parseInt(year) < 2020 || parseInt(year) > currentYear + 1) {
                    return res.status(400).json({ error: `Year must be between 2020 and ${currentYear + 1}` });
                }

                const subscriptions = this.db.prepare(`
                    SELECT * FROM subscriptions 
                    WHERE strftime('%Y', start_date) = ?
                    AND status = 'active'
                `).all([year]);

                const totalRevenue = subscriptions.reduce((sum, sub) => sum + (sub.amount_paid || 0), 0);
                const totalCreditsUsed = subscriptions.reduce((sum, sub) => sum + (sub.credits_used || 0), 0);

                // Get average cost per credit
                const avgCostResult = this.db.prepare(`
                    SELECT AVG(CAST(price_usd AS REAL) / CAST(credits AS REAL)) as avg_cost 
                    FROM vendor_transactions WHERE credits > 0
                `).get();

                const avgCostPerCredit = avgCostResult?.avg_cost || 0;
                const estimatedCosts = totalCreditsUsed * avgCostPerCredit;
                const estimatedProfit = totalRevenue - estimatedCosts;

                console.log(`✅ Yearly P&L calculated: Revenue $${totalRevenue}, Profit $${estimatedProfit}`);
                res.json({
                    totalRevenue,
                    totalCreditsUsed,
                    avgCostPerCredit,
                    estimatedCosts,
                    estimatedProfit,
                    subscriptionCount: subscriptions.length,
                    period: year
                });
            } catch (error) {
                console.error('❌ Error fetching yearly P&L:', error);
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupDashboardRoutes() {
        // GET /api/dashboard/stats
        this.app.get('/api/dashboard/stats', (req, res) => {
            try {
                console.log('📊 Generating dashboard statistics...');

                // 1. Get today's stats
                const today = new Date().toISOString().split('T')[0];
                const todayStats = this.db.prepare(`
                    SELECT 
                        COALESCE(SUM(amount_paid), 0) as cash,
                        COUNT(*) as count
                    FROM subscriptions 
                    WHERE date(start_date) = date(?)
                `).get([today]);

                // 2. Get customer count
                const customerCount = this.db.prepare('SELECT COUNT(*) as count FROM customers WHERE (status = "active" OR status IS NULL)').get();
                const totalCustomers = customerCount.count || 0;

                // 3. Get subscription stats
                const subscriptions = this.db.prepare("SELECT * FROM subscriptions WHERE status = 'active'").all();
                const totalCreditsUsed = subscriptions.reduce((sum, sub) => sum + (sub.credits_used || 0), 0);
                const totalRevenue = subscriptions.reduce((sum, sub) => sum + (sub.amount_paid || 0), 0);

                // Revenue Breakdown
                const revenueBreakdown = {
                    credits: subscriptions.filter(s => (s.item_type || 'subscription') === 'subscription')
                                         .reduce((sum, s) => sum + (s.amount_paid || 0), 0),
                    hardware: subscriptions.filter(s => s.item_type === 'hardware')
                                          .reduce((sum, s) => sum + (s.amount_paid || 0), 0),
                    fees: subscriptions.filter(s => s.item_type === 'fee')
                                      .reduce((sum, s) => sum + (s.amount_paid || 0), 0)
                };

                // 4. Get vendor transaction costs
                const vendorTransactions = this.db.prepare('SELECT * FROM vendor_transactions').all();
                const totalVendorCosts = vendorTransactions.reduce((sum, trans) => sum + (trans.price_usd || 0), 0);

                // 5. Calculate average cost per credit
                const totalCreditsFromVendors = vendorTransactions.reduce((sum, trans) => sum + (trans.credits || 0), 0);
                const avgCostPerCredit = totalCreditsFromVendors > 0 ? totalVendorCosts / totalCreditsFromVendors : 0;
                
                // 6. Calculate today's estimated net profit
                // (Cash collected today - (Credits sold today * average cost))
                const todayCreditsSold = this.db.prepare(`
                    SELECT COALESCE(SUM(credits_used), 0) as qty FROM subscriptions WHERE date(start_date) = date(?)
                `).get([today]).qty || 0;
                const todayProfit = todayStats.cash - (todayCreditsSold * avgCostPerCredit);

                // 7. Get final stats
                const netProfitFromCreditSales = totalRevenue - (totalCreditsUsed * avgCostPerCredit);
                const finalNetProfit = totalRevenue - totalVendorCosts;

                const creditBalances = this.db.prepare('SELECT * FROM credit_balances').all();
                const totalCreditsRemaining = creditBalances.reduce((sum, balance) => sum + (balance.remaining_credits || 0), 0);
                const lowCreditAlerts = creditBalances.filter(balance => (balance.remaining_credits || 0) < 10).length;

                res.json({
                    today: {
                        cash: todayStats.cash,
                        profit: todayProfit,
                        salesCount: todayStats.count
                    },
                    revenueBreakdown,
                    totalCustomers,
                    totalCreditsUsed,
                    totalRevenue,
                    totalVendorCosts,
                    avgCostPerCredit: Math.round(avgCostPerCredit * 100) / 100,
                    netProfitFromCreditSales: Math.round(netProfitFromCreditSales * 100) / 100,
                    finalNetProfit: Math.round(finalNetProfit * 100) / 100,
                    totalCreditsRemaining,
                    lowCreditAlerts,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('❌ Error fetching dashboard stats:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/dashboard/profit-data (for Charts)
        this.app.get('/api/dashboard/profit-data', (req, res) => {
            try {
                const { period } = req.query; // 'monthly' or 'yearly'
                console.log(`📊 Fetching profit data for chart: ${period}`);

                let labels = [];
                let revenue = [];
                let profit = [];

                // Get average cost per unit once for calculations
                const avgCostRes = this.db.prepare(`
                    SELECT AVG(CAST(price_usd AS REAL) / CAST(credits AS REAL)) as avg_cost 
                    FROM vendor_transactions WHERE credits > 0
                `).get();
                const avgCostPerUnit = avgCostRes?.avg_cost || 0;

                if (period === 'yearly') {
                    // Last 5 years
                    const currentYear = new Date().getFullYear();
                    for (let i = 4; i >= 0; i--) {
                        const year = currentYear - i;
                        const data = this.db.prepare(`
                            SELECT 
                                SUM(amount_paid) as revenue,
                                SUM(credits_used) as qty
                            FROM subscriptions 
                            WHERE strftime('%Y', start_date) = ? AND status != 'cancelled'
                        `).get([year.toString()]);

                        labels.push(year.toString());
                        revenue.push(data.revenue || 0);
                        profit.push((data.revenue || 0) - ((data.qty || 0) * avgCostPerUnit));
                    }
                } else {
                    // Last 12 months
                    for (let i = 11; i >= 0; i--) {
                        const d = new Date();
                        d.setMonth(d.getMonth() - i);
                        const month = (d.getMonth() + 1).toString().padStart(2, '0');
                        const year = d.getFullYear().toString();
                        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

                        const data = this.db.prepare(`
                            SELECT 
                                SUM(amount_paid) as revenue,
                                SUM(credits_used) as qty
                            FROM subscriptions 
                            WHERE strftime('%m', start_date) = ? AND strftime('%Y', start_date) = ?
                            AND status != 'cancelled'
                        `).get([month, year]);

                        labels.push(label);
                        revenue.push(data.revenue || 0);
                        profit.push((data.revenue || 0) - ((data.qty || 0) * avgCostPerUnit));
                    }
                }

                res.json({ labels, revenue, profit });
            } catch (error) {
                console.error('❌ Error fetching profit data:', error);
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupBusinessRoutes() {
        // GET /api/business/transactions
        this.app.get('/api/business/transactions', (req, res) => {
            try {
                console.log('📊 Fetching business transactions...');
                const transactions = this.db.prepare(`
                    SELECT * FROM business_transactions 
                    ORDER BY transaction_date DESC, created_date DESC
                `).all();

                // Calculate balance
                const balance = transactions.reduce((sum, trans) => {
                    return sum + (trans.type === 'add' ? trans.amount : -trans.amount);
                }, 0);

                console.log(`✅ Found ${transactions.length} business transactions, balance: $${balance}`);
                res.json({
                    transactions,
                    balance: Math.round(balance * 100) / 100
                });
            } catch (error) {
                console.error('❌ Error fetching business transactions:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // POST /api/business/add-money
        this.app.post('/api/business/add-money', (req, res) => {
            try {
                console.log('💰 Adding money to business...');
                const { amount, date, description } = req.body;

                // Validation
                if (!amount || parseFloat(amount) <= 0) {
                    return res.status(400).json({ error: 'Amount must be greater than 0' });
                }

                if (parseFloat(amount) > 1000000) {
                    return res.status(400).json({ error: 'Amount seems unusually high (max $1,000,000)' });
                }

                if (!date) {
                    return res.status(400).json({ error: 'Date is required' });
                }

                const transactionId = this.generateId();

                const stmt = this.db.prepare(`
                    INSERT INTO business_transactions (business_transaction_id, type, amount, description, transaction_date, created_date)
                    VALUES (?, 'add', ?, ?, ?, datetime('now'))
                `);

                const result = stmt.run([transactionId, parseFloat(amount), description || '', date]);

                if (result.changes === 0) {
                    throw new Error('Failed to add business transaction');
                }

                console.log(`✅ Added $${amount} to business on ${date}`);
                res.status(201).json({
                    success: true,
                    message: 'Money added successfully'
                });
            } catch (error) {
                console.error('❌ Error adding money:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // POST /api/business/withdraw-money
        this.app.post('/api/business/withdraw-money', (req, res) => {
            try {
                console.log('💸 Withdrawing money from business...');
                const { amount, date, description } = req.body;

                // Validation
                if (!amount || parseFloat(amount) <= 0) {
                    return res.status(400).json({ error: 'Amount must be greater than 0' });
                }

                if (parseFloat(amount) > 1000000) {
                    return res.status(400).json({ error: 'Amount seems unusually high (max $1,000,000)' });
                }

                if (!date) {
                    return res.status(400).json({ error: 'Date is required' });
                }

                const transactionId = this.generateId();

                const stmt = this.db.prepare(`
                    INSERT INTO business_transactions (business_transaction_id, type, amount, description, transaction_date, created_date)
                    VALUES (?, 'withdraw', ?, ?, ?, datetime('now'))
                `);

                const result = stmt.run([transactionId, parseFloat(amount), description || '', date]);

                if (result.changes === 0) {
                    throw new Error('Failed to add business transaction');
                }

                console.log(`✅ Withdrew $${amount} from business on ${date}`);
                res.status(201).json({
                    success: true,
                    message: 'Money withdrawn successfully'
                });
            } catch (error) {
                console.error('❌ Error withdrawing money:', error);
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupCreditRoutes() {
        // GET /api/credit-balances
        this.app.get('/api/credit-balances', (req, res) => {
            try {
                console.log('💳 Fetching credit balances...');
                const balances = this.db.prepare(`
                    SELECT cb.*, v.name as vendor_name
                    FROM credit_balances cb
                    JOIN vendors v ON cb.vendor_id = v.vendor_id
                    WHERE v.is_active = 1
                    ORDER BY v.name, cb.service_name
                `).all();

                console.log(`✅ Found ${balances.length} credit balances`);
                res.json(balances);
            } catch (error) {
                console.error('❌ Error fetching credit balances:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/vendor-transactions
        this.app.get('/api/vendor-transactions', (req, res) => {
            try {
                console.log('📊 Fetching vendor transactions...');
                const transactions = this.db.prepare(`
                    SELECT vt.*, v.name as vendor_name
                    FROM vendor_transactions vt
                    JOIN vendors v ON vt.vendor_id = v.vendor_id
                    ORDER BY vt.purchase_date DESC
                `).all();

                console.log(`✅ Found ${transactions.length} vendor transactions`);
                res.json(transactions);
            } catch (error) {
                console.error('❌ Error fetching vendor transactions:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // POST /api/vendor-transactions
        this.app.post('/api/vendor-transactions', (req, res) => {
            const transaction = this.db.transaction((purchaseData) => {
                try {
                    console.log('💸 Processing credit purchase...', purchaseData);

                    const { vendorID, serviceName, purchaseDate, credits, priceUSD, notes } = purchaseData;

                    // Validation
                    if (!vendorID || !serviceName || !credits || !priceUSD) {
                        throw new Error('Vendor, service, credits, and price are required');
                    }

                    const creditsNum = parseInt(credits);
                    const priceNum = parseFloat(priceUSD);

                    if (isNaN(creditsNum) || creditsNum <= 0) {
                        throw new Error('Credits must be a positive number');
                    }

                    if (isNaN(priceNum) || priceNum <= 0) {
                        throw new Error('Price must be a positive number');
                    }

                    if (creditsNum > 1000000) {
                        throw new Error('Credits cannot exceed 1,000,000');
                    }

                    if (priceNum > 1000000) {
                        throw new Error('Price cannot exceed $1,000,000');
                    }

                    // Verify vendor and service exist
                    const vendor = this.db.prepare('SELECT name FROM vendors WHERE vendor_id = ? AND is_active = 1').get([vendorID]);
                    if (!vendor) {
                        throw new Error('Vendor not found or inactive');
                    }

                    const service = this.db.prepare('SELECT * FROM vendor_services WHERE vendor_id = ? AND service_name = ? AND is_available = 1').get([vendorID, serviceName]);
                    if (!service) {
                        throw new Error('Service not found or unavailable');
                    }

                    const transactionId = this.generateId();

                    // Insert transaction
                    const stmt = this.db.prepare(`
                        INSERT INTO vendor_transactions (transaction_id, vendor_id, service_name, credits, price_usd, purchase_date, notes, created_date)
                        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
                    `);

                    const result = stmt.run([transactionId, vendorID, serviceName, creditsNum, priceNum, purchaseDate, notes || '']);

                    if (result.changes === 0) {
                        throw new Error('Failed to create vendor transaction');
                    }

                    // Update or create credit balance
                    const existingBalance = this.db.prepare(`
                        SELECT * FROM credit_balances 
                        WHERE vendor_id = ? AND service_name = ?
                    `).get([vendorID, serviceName]);

                    if (existingBalance) {
                        const updateStmt = this.db.prepare(`
                            UPDATE credit_balances 
                            SET remaining_credits = remaining_credits + ?,
                                total_purchased = total_purchased + ?,
                                last_updated = datetime('now')
                            WHERE vendor_id = ? AND service_name = ?
                        `);
                        const updateResult = updateStmt.run([creditsNum, creditsNum, vendorID, serviceName]);

                        if (updateResult.changes === 0) {
                            throw new Error('Failed to update credit balance');
                        }
                    } else {
                        const balanceId = this.generateId();
                        const insertStmt = this.db.prepare(`
                            INSERT INTO credit_balances (balance_id, vendor_id, service_name, remaining_credits, total_purchased, total_used, last_updated)
                            VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
                        `);
                        const insertResult = insertStmt.run([balanceId, vendorID, serviceName, creditsNum, creditsNum]);

                        if (insertResult.changes === 0) {
                            throw new Error('Failed to create credit balance');
                        }
                    }

                    console.log(`✅ Credit purchase completed: ${creditsNum} credits for ${vendor.name} - ${serviceName}`);
                    return { transactionId };
                } catch (error) {
                    console.error('❌ Error in credit purchase transaction:', error);
                    throw error;
                }
            });

            try {
                const result = transaction(req.body);
                res.status(201).json({
                    success: true,
                    message: 'Credits purchased successfully'
                });
            } catch (error) {
                console.error('❌ Error purchasing credits:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // DELETE /api/vendor-transactions/:id
        this.app.delete('/api/vendor-transactions/:id', (req, res) => {
            try {
                const { id } = req.params;
                const { password } = req.headers;

                if (password !== '1234') {
                    return res.status(403).json({ error: 'Unauthorized: Invalid safety password.' });
                }

                const transaction = this.db.transaction(() => {
                    // 1. Get transaction details to deduct stock
                    const vt = this.db.prepare('SELECT * FROM vendor_transactions WHERE transaction_id = ?').get([id]);
                    if (!vt) throw new Error('Vendor transaction not found');

                    // 2. Deduct Stock (Reverse the purchase)
                    this.db.prepare(`
                        UPDATE credit_balances 
                        SET remaining_credits = remaining_credits - ?, 
                            total_purchased = total_purchased - ?,
                            last_updated = datetime('now')
                        WHERE vendor_id = ? AND service_name = ?
                    `).run([vt.credits, vt.credits, vt.vendor_id, vt.service_name]);

                    // 3. Delete record
                    return this.db.prepare('DELETE FROM vendor_transactions WHERE transaction_id = ?').run([id]);
                });

                transaction();
                res.json({ success: true, message: 'Vendor transaction deleted and stock reduced.' });
            } catch (error) {
                console.error('❌ Error deleting vendor transaction:', error);
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupUtilityRoutes() {
        // GET /api/search/subscriptions - Search subscriptions
        this.app.get('/api/search/subscriptions', (req, res) => {
            try {
                const { q, type } = req.query; // q = query, type = search type
                console.log(`🔍 Searching subscriptions: "${q}" (type: ${type})`);

                if (!q || q.trim().length < 2) {
                    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
                }

                let query;
                let params;

                switch (type) {
                    case 'mac':
                        const normalizedMac = q.replace(/[:-]/g, '').toUpperCase();
                        query = `
                            SELECT s.*, c.name as customer_name, c.email as customer_email
                            FROM subscriptions s
                            JOIN customers c ON s.customer_id = c.id
                            WHERE REPLACE(REPLACE(UPPER(s.mac_address), ':', ''), '-', '') LIKE ?
                            ORDER BY s.created_date DESC
                        `;
                        params = [`%${normalizedMac}%`];
                        break;
                    case 'customer':
                        query = `
                            SELECT s.*, c.name as customer_name, c.email as customer_email
                            FROM subscriptions s
                            JOIN customers c ON s.customer_id = c.id
                            WHERE c.name LIKE ? OR c.email LIKE ?
                            ORDER BY s.created_date DESC
                        `;
                        params = [`%${q}%`, `%${q}%`];
                        break;
                    default:
                        query = `
                            SELECT s.*, c.name as customer_name, c.email as customer_email
                            FROM subscriptions s
                            JOIN customers c ON s.customer_id = c.id
                            WHERE c.name LIKE ? OR c.email LIKE ? OR s.classification LIKE ? 
                               OR s.notes LIKE ? OR s.service_name LIKE ?
                               OR REPLACE(REPLACE(UPPER(s.mac_address), ':', ''), '-', '') LIKE ?
                            ORDER BY s.created_date DESC
                        `;
                        const normalizedQuery = q.replace(/[:-]/g, '').toUpperCase();
                        params = [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${normalizedQuery}%`];
                }

                const results = this.db.prepare(query).all(params);
                console.log(`✅ Found ${results.length} matching subscriptions`);
                res.json(results);
            } catch (error) {
                console.error('❌ Error searching subscriptions:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/stats/summary - Overall system statistics
        this.app.get('/api/stats/summary', (req, res) => {
            try {
                console.log('📊 Generating system summary statistics...');

                const stats = {
                    customers: {
                        total: this.db.prepare('SELECT COUNT(*) as count FROM customers').get().count,
                        active: this.db.prepare('SELECT COUNT(*) as count FROM customers WHERE status = "active" OR status IS NULL').get().count,
                        inactive: this.db.prepare('SELECT COUNT(*) as count FROM customers WHERE status = "inactive"').get().count
                    },
                    subscriptions: {
                        total: this.db.prepare('SELECT COUNT(*) as count FROM subscriptions').get().count,
                        active: this.db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE status = "active"').get().count,
                        expired: this.db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE status = "expired"').get().count,
                        cancelled: this.db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE status = "cancelled"').get().count,
                        withMac: this.db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE mac_address IS NOT NULL AND mac_address != ""').get().count
                    },
                    vendors: {
                        total: this.db.prepare('SELECT COUNT(*) as count FROM vendors').get().count,
                        active: this.db.prepare('SELECT COUNT(*) as count FROM vendors WHERE is_active = 1').get().count
                    },
                    services: {
                        total: this.db.prepare('SELECT COUNT(*) as count FROM vendor_services').get().count,
                        available: this.db.prepare('SELECT COUNT(*) as count FROM vendor_services WHERE is_available = 1').get().count
                    },
                    financial: {
                        totalRevenue: this.db.prepare('SELECT COALESCE(SUM(amount_paid), 0) as total FROM subscriptions WHERE status = "active"').get().total,
                        totalCosts: this.db.prepare('SELECT COALESCE(SUM(price_usd), 0) as total FROM vendor_transactions').get().total,
                        totalCreditsRemaining: this.db.prepare('SELECT COALESCE(SUM(remaining_credits), 0) as total FROM credit_balances').get().total
                    },
                    timestamp: new Date().toISOString()
                };

                stats.financial.profit = stats.financial.totalRevenue - stats.financial.totalCosts;

                console.log('✅ System summary statistics generated');
                res.json(stats);
            } catch (error) {
                console.error('❌ Error generating system summary:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // POST /api/utils/validate - Validate data before submission
        this.app.post('/api/utils/validate', (req, res) => {
            try {
                const { type, data } = req.body;
                console.log(`🔍 Validating ${type} data...`);

                let validation = { isValid: false, errors: ['Unknown validation type'] };

                switch (type) {
                    case 'customer':
                        validation = this.validateCustomerData(data);
                        break;
                    case 'subscription':
                        validation = this.validateSubscriptionData(data);
                        break;
                    case 'vendor':
                        validation = this.validateVendorData(data);
                        break;
                    case 'mac':
                        validation = this.validateMacAddress(data.macAddress);
                        break;
                }

                console.log(`✅ Validation result: ${validation.isValid ? 'VALID' : 'INVALID'}`);
                res.json(validation);
            } catch (error) {
                console.error('❌ Error validating data:', error);
                res.status(500).json({ error: error.message });
            }
        });
    }

    // Helper validation methods
    validateCustomerData(data) {
        const errors = [];

        if (!data.name || data.name.trim().length < 2) {
            errors.push('Customer name must be at least 2 characters long');
        }

        if (!data.email) {
            errors.push('Email is required');
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                errors.push('Invalid email format');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    validateSubscriptionData(data) {
        const errors = [];

        if (!data.customerID) errors.push('Customer selection is required');
        if (!data.startDate) errors.push('Start date is required');
        if (!data.creditsSelected || data.creditsSelected <= 0) errors.push('Credits must be greater than 0');
        if (!data.amountPaid || data.amountPaid <= 0) errors.push('Payment amount must be greater than $0');

        if (data.macAddress) {
            const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^[0-9A-Fa-f]{12}$/;
            if (!macRegex.test(data.macAddress.trim())) {
                errors.push('Invalid MAC address format');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    validateVendorData(data) {
        const errors = [];

        if (!data.name || data.name.trim().length < 2) {
            errors.push('Vendor name must be at least 2 characters long');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    validateMacAddress(macAddress) {
        if (!macAddress) {
            return { isValid: true, errors: [] }; // Optional field
        }

        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^[0-9A-Fa-f]{12}$/;
        const isValid = macRegex.test(macAddress.trim());

        return {
            isValid: isValid,
            errors: isValid ? [] : ['Invalid MAC address format. Use XX:XX:XX:XX:XX:XX, XX-XX-XX-XX-XX-XX, or XXXXXXXXXXXX']
        };
    }

    generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 5);
    }

    async start() {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.port, (err) => {
                if (err) {
                    console.error('❌ Failed to start server:', err);
                    reject(err);
                } else {
                    console.log(`✅ Server running on http://localhost:${this.port}`);
                    console.log(`📊 Health check: http://localhost:${this.port}/api/health`);
                    resolve();
                }
            });
        });
    }

    close() {
        if (this.server) {
            this.server.close();
            console.log('🌐 Embedded server closed');
        }
    }
}

module.exports = EmbeddedServer;
