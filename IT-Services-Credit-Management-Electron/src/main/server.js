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

        // Error handling middleware
        this.app.use((error, req, res, next) => {
            console.error('Server Error:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: error.message
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
                database: 'Connected'
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
    }

    setupCustomerRoutes() {
        // GET /api/customers
        this.app.get('/api/customers', (req, res) => {
            try {
                const customers = this.db.prepare('SELECT * FROM customers ORDER BY created_date DESC').all();
                res.json(customers);
            } catch (error) {
                console.error('Error fetching customers:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // POST /api/customers
        this.app.post('/api/customers', (req, res) => {
            try {
                const { name, email, phone, address } = req.body;

                if (!name || !email) {
                    return res.status(400).json({ error: 'Name and email are required' });
                }

                // Check for existing customer
                const existing = this.db.prepare('SELECT id FROM customers WHERE email = ?').get([email]);
                if (existing) {
                    return res.status(400).json({ error: 'Customer with this email already exists' });
                }

                const customerId = this.generateId();

                const stmt = this.db.prepare(`
                    INSERT INTO customers (id, name, email, phone, address, created_date)
                    VALUES (?, ?, ?, ?, ?, datetime('now'))
                `);

                stmt.run([customerId, name, email, phone || '', address || '']);

                const newCustomer = this.db.prepare('SELECT * FROM customers WHERE id = ?').get([customerId]);
                res.json({
                    success: true,
                    message: 'Customer added successfully',
                    customer: newCustomer
                });
            } catch (error) {
                console.error('Error creating customer:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // PUT /api/customers/:customerId/status
        this.app.put('/api/customers/:customerId/status', (req, res) => {
            try {
                const { customerId } = req.params;
                const { status } = req.body;

                if (!status || !['active', 'inactive'].includes(status)) {
                    return res.status(400).json({ error: 'Valid status (active/inactive) is required' });
                }

                const stmt = this.db.prepare('UPDATE customers SET status = ? WHERE id = ?');
                const result = stmt.run([status, customerId]);

                if (result.changes === 0) {
                    return res.status(404).json({ error: 'Customer not found' });
                }

                res.json({
                    success: true,
                    message: `Customer status updated to ${status}`
                });
            } catch (error) {
                console.error('Error updating customer status:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // PUT /api/customers/:customerId
        this.app.put('/api/customers/:customerId', (req, res) => {
            try {
                const { customerId } = req.params;
                const { name, email, phone, address, status } = req.body;

                if (!name || !email) {
                    return res.status(400).json({ error: 'Name and email are required' });
                }

                // Check if email is already used by another customer
                const existing = this.db.prepare('SELECT id FROM customers WHERE email = ? AND id != ?').get([email, customerId]);
                if (existing) {
                    return res.status(400).json({ error: 'Email is already used by another customer' });
                }

                const stmt = this.db.prepare(`
                    UPDATE customers 
                    SET name = ?, email = ?, phone = ?, address = ?, status = ?
                    WHERE id = ?
                `);

                const result = stmt.run([name, email, phone || '', address || '', status || 'active', customerId]);

                if (result.changes === 0) {
                    return res.status(404).json({ error: 'Customer not found' });
                }

                const updatedCustomer = this.db.prepare('SELECT * FROM customers WHERE id = ?').get([customerId]);
                res.json({
                    success: true,
                    message: 'Customer updated successfully',
                    customer: updatedCustomer
                });
            } catch (error) {
                console.error('Error updating customer:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/customers/:customerId/transactions
        this.app.get('/api/customers/:customerId/transactions', (req, res) => {
            try {
                const { customerId } = req.params;

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
                console.error('Error fetching customer transactions:', error);
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
                        service_name: sub.service_name,
                        start_date: sub.start_date,
                        expiration_date: sub.expiration_date,
                        amount_paid: sub.amount_paid || 0,
                        credits_used: sub.credits_used || 0,
                        status: sub.status,
                        notes: sub.notes,
                        created_date: sub.created_date,
                        // Also include alternative property names for compatibility
                        AmountPaid: sub.amount_paid || 0,
                        CreditsUsed: sub.credits_used || 0,
                        StartDate: sub.start_date
                    });
                });

                console.log(`Grouped into ${Object.keys(customerSales).length} customers`);
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
                const vendors = this.db.prepare('SELECT * FROM vendors WHERE is_active = 1 ORDER BY name').all();
                res.json(vendors);
            } catch (error) {
                console.error('Error fetching vendors:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // POST /api/vendors  
        this.app.post('/api/vendors', (req, res) => {
            try {
                const { name, contactEmail, contactPhone, description } = req.body;

                if (!name) {
                    return res.status(400).json({ error: 'Vendor name is required' });
                }

                const vendorId = this.generateId();

                const stmt = this.db.prepare(`
                    INSERT INTO vendors (vendor_id, name, contact_email, contact_phone, description, created_date)
                    VALUES (?, ?, ?, ?, ?, datetime('now'))
                `);

                stmt.run([vendorId, name, contactEmail || '', contactPhone || '', description || '']);

                const newVendor = this.db.prepare('SELECT * FROM vendors WHERE vendor_id = ?').get([vendorId]);
                res.json({
                    success: true,
                    message: 'Vendor added successfully',
                    vendor: newVendor
                });
            } catch (error) {
                console.error('Error creating vendor:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/vendor-services
        this.app.get('/api/vendor-services', (req, res) => {
            try {
                const services = this.db.prepare(`
                    SELECT vs.*, v.name as vendor_name 
                    FROM vendor_services vs
                    JOIN vendors v ON vs.vendor_id = v.vendor_id
                    WHERE vs.is_available = 1 AND v.is_active = 1
                    ORDER BY v.name, vs.service_name
                `).all();
                res.json(services);
            } catch (error) {
                console.error('Error fetching vendor services:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/vendor-services/:vendorId
        this.app.get('/api/vendor-services/:vendorId', (req, res) => {
            try {
                const { vendorId } = req.params;
                const services = this.db.prepare(`
                    SELECT * FROM vendor_services 
                    WHERE vendor_id = ? AND is_available = 1
                    ORDER BY service_name
                `).all([vendorId]);
                res.json(services);
            } catch (error) {
                console.error('Error fetching vendor services:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // POST /api/vendor-services
        this.app.post('/api/vendor-services', (req, res) => {
            try {
                const { vendorID, serviceName, description } = req.body;

                if (!vendorID || !serviceName) {
                    return res.status(400).json({ error: 'Vendor ID and service name are required' });
                }

                const serviceId = this.generateId();

                const stmt = this.db.prepare(`
                    INSERT INTO vendor_services (service_id, vendor_id, service_name, description, created_date)
                    VALUES (?, ?, ?, ?, datetime('now'))
                `);

                stmt.run([serviceId, vendorID, serviceName, description || '']);

                const newService = this.db.prepare('SELECT * FROM vendor_services WHERE service_id = ?').get([serviceId]);
                res.json({
                    success: true,
                    message: 'Vendor service added successfully',
                    service: newService
                });
            } catch (error) {
                console.error('Error creating vendor service:', error);
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupSubscriptionRoutes() {
        // GET /api/subscriptions
        this.app.get('/api/subscriptions', (req, res) => {
            try {
                const subscriptions = this.db.prepare(`
                    SELECT s.*, c.name as customer_name
                    FROM subscriptions s
                    JOIN customers c ON s.customer_id = c.id
                    ORDER BY s.created_date DESC
                `).all();

                res.json(subscriptions);
            } catch (error) {
                console.error('Error fetching subscriptions:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // FIXED POST /api/subscriptions - Complete rewrite with proper error handling
        this.app.post('/api/subscriptions', (req, res) => {
            console.log('📝 Received subscription request:', req.body);

            const transaction = this.db.transaction((subscriptionData) => {
                try {
                    console.log('📝 Processing subscription creation:', subscriptionData);

                    const {
                        customerID, serviceName, startDate, creditsSelected,
                        amountPaid, status, vendorID, vendorServiceName,
                        notes, classification
                    } = subscriptionData;

                    // Validate required fields
                    if (!customerID) {
                        throw new Error('Customer ID is required');
                    }
                    if (!startDate) {
                        throw new Error('Start date is required');
                    }
                    if (!creditsSelected || parseInt(creditsSelected) <= 0) {
                        throw new Error('Credits selected must be greater than 0');
                    }
                    if (!amountPaid || parseFloat(amountPaid) <= 0) {
                        throw new Error('Amount paid must be greater than 0');
                    }

                    // Verify customer exists and is active
                    const customer = this.db.prepare('SELECT * FROM customers WHERE id = ? AND (status = "active" OR status IS NULL)').get([customerID]);
                    if (!customer) {
                        throw new Error('Customer not found or inactive');
                    }

                    console.log(`✅ Customer verified: ${customer.name}`);

                    // If vendor service is specified, check credit availability
                    if (vendorID && vendorServiceName) {
                        console.log(`🔍 Checking credit availability for vendor: ${vendorID}, service: ${vendorServiceName}`);

                        const creditBalance = this.db.prepare(`
                            SELECT * FROM credit_balances 
                            WHERE vendor_id = ? AND service_name = ?
                        `).get([vendorID, vendorServiceName]);

                        if (!creditBalance) {
                            // Check if vendor and service exist
                            const vendor = this.db.prepare('SELECT name FROM vendors WHERE vendor_id = ?').get([vendorID]);
                            const service = this.db.prepare('SELECT * FROM vendor_services WHERE vendor_id = ? AND service_name = ?').get([vendorID, vendorServiceName]);

                            if (!vendor) {
                                throw new Error(`Vendor not found`);
                            }
                            if (!service) {
                                throw new Error(`Service "${vendorServiceName}" not found for vendor`);
                            }

                            throw new Error(`No credit balance found for service: ${vendorServiceName}. Please purchase credits first.`);
                        }

                        if (creditBalance.remaining_credits < parseInt(creditsSelected)) {
                            throw new Error(`Insufficient credits. Available: ${creditBalance.remaining_credits}, Required: ${creditsSelected}`);
                        }

                        console.log(`✅ Credit check passed. Available: ${creditBalance.remaining_credits}, Using: ${creditsSelected}`);
                    }

                    // Calculate expiration date
                    const startDateObj = new Date(startDate);
                    if (isNaN(startDateObj.getTime())) {
                        throw new Error('Invalid start date');
                    }

                    const expirationDateObj = new Date(startDateObj);
                    expirationDateObj.setMonth(expirationDateObj.getMonth() + parseInt(creditsSelected));
                    expirationDateObj.setDate(expirationDateObj.getDate() - 1);

                    const subscriptionId = this.generateId();

                    // Insert subscription
                    // In the subscription POST endpoint, add mac_address to the INSERT
                    const stmt = this.db.prepare(`
    INSERT INTO subscriptions (
        id, customer_id, service_name, start_date, expiration_date, 
        amount_paid, status, vendor_id, vendor_service_name, 
        credits_used, notes, classification, mac_address, created_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`);

                    stmt.run([
                        subscriptionId,
                        customerID,
                        serviceName || 'IT App Services',
                        startDate,
                        expirationDateObj.toISOString().split('T')[0],
                        parseFloat(amountPaid),
                        status || 'active',
                        vendorID || '',
                        vendorServiceName || '',
                        parseInt(creditsSelected),
                        notes || '',
                        classification || '',
                        macAddress || '',  // NEW FIELD
                    ]);


                    if (insertResult.changes === 0) {
                        throw new Error('Failed to create subscription - no rows affected');
                    }

                    console.log(`✅ Subscription created with ID: ${subscriptionId}`);

                    // If vendor service is specified, update credit balances and create usage record
                    if (vendorID && vendorServiceName) {
                        console.log('🔄 Updating credit balances...');

                        // Update credit balance
                        const updateStmt = this.db.prepare(`
                            UPDATE credit_balances 
                            SET remaining_credits = remaining_credits - ?, 
                                total_used = total_used + ?,
                                last_updated = datetime('now')
                            WHERE vendor_id = ? AND service_name = ?
                        `);

                        const updateResult = updateStmt.run([
                            parseInt(creditsSelected),
                            parseInt(creditsSelected),
                            vendorID,
                            vendorServiceName
                        ]);

                        if (updateResult.changes === 0) {
                            throw new Error('Failed to update credit balance - no rows affected');
                        }

                        console.log(`✅ Credit balance updated. Deducted ${creditsSelected} credits`);

                        // Create credit usage record
                        const usageId = this.generateId();
                        const usageStmt = this.db.prepare(`
                            INSERT INTO credit_usage (usage_id, vendor_id, service_name, subscription_id, credits_used, usage_date)
                            VALUES (?, ?, ?, ?, ?, datetime('now'))
                        `);

                        const usageResult = usageStmt.run([usageId, vendorID, vendorServiceName, subscriptionId, parseInt(creditsSelected)]);

                        if (usageResult.changes === 0) {
                            throw new Error('Failed to create credit usage record');
                        }

                        console.log(`✅ Credit usage recorded with ID: ${usageId}`);
                    }

                    return { subscriptionId };
                } catch (error) {
                    console.error('❌ Error in subscription transaction:', error);
                    throw error;
                }
            });

            try {
                console.log('🚀 Starting subscription transaction...');
                const result = transaction(req.body);

                const newSubscription = this.db.prepare(`
                    SELECT s.*, c.name as customer_name
                    FROM subscriptions s
                    JOIN customers c ON s.customer_id = c.id
                    WHERE s.id = ?
                `).get([result.subscriptionId]);

                console.log('✅ Subscription added successfully');
                res.json({
                    success: true,
                    message: req.body.vendorID && req.body.vendorServiceName ?
                        'Subscription added successfully and credits deducted' :
                        'Subscription added successfully',
                    subscription: newSubscription
                });
            } catch (error) {
                console.error('❌ Error creating subscription:', error);
                res.status(500).json({
                    error: error.message || 'Failed to create subscription',
                    details: 'Check server logs for more information',
                    timestamp: new Date().toISOString()
                });
            }
        });

        // GET /api/subscriptions/weekly-expiring
        this.app.get('/api/subscriptions/weekly-expiring', (req, res) => {
            try {
                const expiring = this.db.prepare(`
                    SELECT s.*, c.name as customer_name
                    FROM subscriptions s
                    JOIN customers c ON s.customer_id = c.id
                    WHERE s.status = 'active' 
                        AND date(s.expiration_date) > date('now')
                        AND date(s.expiration_date) <= date('now', '+7 days')
                    ORDER BY s.expiration_date
                `).all();

                res.json(expiring);
            } catch (error) {
                console.error('Error fetching weekly expiring subscriptions:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/subscriptions/monthly-expiring
        this.app.get('/api/subscriptions/monthly-expiring', (req, res) => {
            try {
                const expiring = this.db.prepare(`
                    SELECT s.*, c.name as customer_name
                    FROM subscriptions s
                    JOIN customers c ON s.customer_id = c.id
                    WHERE s.status = 'active' 
                        AND date(s.expiration_date) > date('now')
                        AND date(s.expiration_date) <= date('now', '+30 days')
                    ORDER BY s.expiration_date
                `).all();

                res.json(expiring);
            } catch (error) {
                console.error('Error fetching monthly expiring subscriptions:', error);
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupPLRoutes() {
        // GET /api/pl/monthly
        this.app.get('/api/pl/monthly', (req, res) => {
            try {
                const { month, year } = req.query;

                if (!month || !year) {
                    return res.status(400).json({ error: 'Month and year are required' });
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

                res.json({
                    totalRevenue,
                    totalCreditsUsed,
                    avgCostPerCredit,
                    estimatedCosts,
                    estimatedProfit,
                    subscriptionCount: subscriptions.length
                });
            } catch (error) {
                console.error('Error fetching monthly P&L:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/pl/yearly
        this.app.get('/api/pl/yearly', (req, res) => {
            try {
                const { year } = req.query;

                if (!year) {
                    return res.status(400).json({ error: 'Year is required' });
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

                res.json({
                    totalRevenue,
                    totalCreditsUsed,
                    avgCostPerCredit,
                    estimatedCosts,
                    estimatedProfit,
                    subscriptionCount: subscriptions.length
                });
            } catch (error) {
                console.error('Error fetching yearly P&L:', error);
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupDashboardRoutes() {
        // GET /api/dashboard/stats
        this.app.get('/api/dashboard/stats', (req, res) => {
            try {
                // Get customer count
                const customerCount = this.db.prepare('SELECT COUNT(*) as count FROM customers WHERE (status = "active" OR status IS NULL)').get();
                const totalCustomers = customerCount.count || 0;

                // Get subscription stats
                const subscriptions = this.db.prepare('SELECT * FROM subscriptions WHERE status = "active"').all();
                const totalCreditsUsed = subscriptions.reduce((sum, sub) => sum + (sub.credits_used || 0), 0);
                const totalRevenue = subscriptions.reduce((sum, sub) => sum + (sub.amount_paid || 0), 0);

                // Get vendor transaction costs
                const vendorTransactions = this.db.prepare('SELECT * FROM vendor_transactions').all();
                const totalVendorCosts = vendorTransactions.reduce((sum, trans) => sum + (trans.price_usd || 0), 0);

                // Calculate average cost per credit
                const totalCreditsFromVendors = vendorTransactions.reduce((sum, trans) => sum + (trans.credits || 0), 0);
                const avgCostPerCredit = totalCreditsFromVendors > 0 ? totalVendorCosts / totalCreditsFromVendors : 0;
                const avgRevenuePerCredit = totalCreditsUsed > 0 ? totalRevenue / totalCreditsUsed : 0;

                // Calculate profits
                const netProfitFromCreditSales = totalRevenue - (totalCreditsUsed * avgCostPerCredit);
                const finalNetProfit = totalRevenue - totalVendorCosts;

                // Get credit balances
                const creditBalances = this.db.prepare('SELECT * FROM credit_balances').all();
                const totalCreditsRemaining = creditBalances.reduce((sum, balance) => sum + (balance.remaining_credits || 0), 0);
                const lowCreditAlerts = creditBalances.filter(balance => (balance.remaining_credits || 0) < 10).length;

                res.json({
                    totalCustomers,
                    totalCreditsUsed,
                    totalRevenue,
                    totalVendorCosts,
                    avgCostPerCredit,
                    avgRevenuePerCredit,
                    netProfitFromCreditSales,
                    finalNetProfit,
                    totalCreditsRemaining,
                    lowCreditAlerts
                });
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupBusinessRoutes() {
        // GET /api/business/transactions
        this.app.get('/api/business/transactions', (req, res) => {
            try {
                const transactions = this.db.prepare(`
                    SELECT * FROM business_transactions 
                    ORDER BY transaction_date DESC, created_date DESC
                `).all();

                // Calculate balance
                const balance = transactions.reduce((sum, trans) => {
                    return sum + (trans.type === 'add' ? trans.amount : -trans.amount);
                }, 0);

                res.json({
                    transactions,
                    balance
                });
            } catch (error) {
                console.error('Error fetching business transactions:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // POST /api/business/add-money
        this.app.post('/api/business/add-money', (req, res) => {
            try {
                const { amount, date, description } = req.body;

                if (!amount || parseFloat(amount) <= 0) {
                    return res.status(400).json({ error: 'Amount must be greater than 0' });
                }

                const transactionId = this.generateId();

                const stmt = this.db.prepare(`
                    INSERT INTO business_transactions (business_transaction_id, type, amount, description, transaction_date, created_date)
                    VALUES (?, 'add', ?, ?, ?, datetime('now'))
                `);

                stmt.run([transactionId, parseFloat(amount), description || '', date]);

                res.json({
                    success: true,
                    message: 'Money added successfully'
                });
            } catch (error) {
                console.error('Error adding money:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // POST /api/business/withdraw-money
        this.app.post('/api/business/withdraw-money', (req, res) => {
            try {
                const { amount, date, description } = req.body;

                if (!amount || parseFloat(amount) <= 0) {
                    return res.status(400).json({ error: 'Amount must be greater than 0' });
                }

                const transactionId = this.generateId();

                const stmt = this.db.prepare(`
                    INSERT INTO business_transactions (business_transaction_id, type, amount, description, transaction_date, created_date)
                    VALUES (?, 'withdraw', ?, ?, ?, datetime('now'))
                `);

                stmt.run([transactionId, parseFloat(amount), description || '', date]);

                res.json({
                    success: true,
                    message: 'Money withdrawn successfully'
                });
            } catch (error) {
                console.error('Error withdrawing money:', error);
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupCreditRoutes() {
        // GET /api/credit-balances
        this.app.get('/api/credit-balances', (req, res) => {
            try {
                const balances = this.db.prepare(`
                    SELECT cb.*, v.name as vendor_name
                    FROM credit_balances cb
                    JOIN vendors v ON cb.vendor_id = v.vendor_id
                    WHERE v.is_active = 1
                    ORDER BY v.name, cb.service_name
                `).all();

                res.json(balances);
            } catch (error) {
                console.error('Error fetching credit balances:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/vendor-transactions
        this.app.get('/api/vendor-transactions', (req, res) => {
            try {
                const transactions = this.db.prepare(`
                    SELECT vt.*, v.name as vendor_name
                    FROM vendor_transactions vt
                    JOIN vendors v ON vt.vendor_id = v.vendor_id
                    ORDER BY vt.purchase_date DESC
                `).all();

                res.json(transactions);
            } catch (error) {
                console.error('Error fetching vendor transactions:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // POST /api/vendor-transactions
        this.app.post('/api/vendor-transactions', (req, res) => {
            const transaction = this.db.transaction((purchaseData) => {
                try {
                    const { vendorID, serviceName, purchaseDate, credits, priceUSD, notes } = purchaseData;

                    if (!vendorID || !serviceName || !credits || !priceUSD) {
                        throw new Error('All required fields must be provided');
                    }

                    const transactionId = this.generateId();

                    // Insert transaction
                    const stmt = this.db.prepare(`
                        INSERT INTO vendor_transactions (transaction_id, vendor_id, service_name, credits, price_usd, purchase_date, notes, created_date)
                        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
                    `);

                    stmt.run([transactionId, vendorID, serviceName, parseInt(credits), parseFloat(priceUSD), purchaseDate, notes || '']);

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
                        updateStmt.run([parseInt(credits), parseInt(credits), vendorID, serviceName]);
                    } else {
                        const balanceId = this.generateId();
                        const insertStmt = this.db.prepare(`
                            INSERT INTO credit_balances (balance_id, vendor_id, service_name, remaining_credits, total_purchased, total_used, last_updated)
                            VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
                        `);
                        insertStmt.run([balanceId, vendorID, serviceName, parseInt(credits), parseInt(credits)]);
                    }

                    return { transactionId };
                } catch (error) {
                    throw error;
                }
            });

            try {
                const result = transaction(req.body);
                res.json({
                    success: true,
                    message: 'Credits purchased successfully'
                });
            } catch (error) {
                console.error('Error purchasing credits:', error);
                res.status(500).json({ error: error.message });
            }
        });
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
