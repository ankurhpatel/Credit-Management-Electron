// Mock API Server for Development Mode
class MockAPIServer {
    constructor() {
        this.isEnabled = false;
        this.interceptedFetch = null;
        this.mockData = this.initializeMockData();
    }

    initializeMockData() {
        return {
            health: { status: 'ok', timestamp: Date.now() },
            vendors: [
                { vendor_id: 1, name: 'TechServices Pro', created_date: '2024-01-15', status: 'active' },
                { vendor_id: 2, name: 'DataFlow Solutions', created_date: '2024-02-01', status: 'active' },
                { vendor_id: 3, name: 'CloudTech Systems', created_date: '2024-03-10', status: 'active' }
            ],
            customers: [
                { id: 1, name: 'John Smith', email: 'john@email.com', phone: '555-0101', created_date: '2024-01-20' },
                { id: 2, name: 'Sarah Johnson', email: 'sarah@email.com', phone: '555-0102', created_date: '2024-01-25' },
                { id: 3, name: 'Mike Davis', email: 'mike@email.com', phone: '555-0103', created_date: '2024-02-01' }
            ],
            'credit-balances': [
                {
                    id: 1, vendor_id: 1, vendor_name: 'TechServices Pro', service_name: 'IPTV Premium',
                    remaining_credits: 45, total_purchased_credits: 100, total_used_credits: 55,
                    avg_cost_per_credit: 2.50, last_purchase_date: '2024-11-01'
                },
                {
                    id: 2, vendor_id: 1, vendor_name: 'TechServices Pro', service_name: 'VPN Service',
                    remaining_credits: 8, total_purchased_credits: 50, total_used_credits: 42,
                    avg_cost_per_credit: 1.75, last_purchase_date: '2024-10-15'
                },
                {
                    id: 3, vendor_id: 2, vendor_name: 'DataFlow Solutions', service_name: 'Streaming Plus',
                    remaining_credits: 75, total_purchased_credits: 100, total_used_credits: 25,
                    avg_cost_per_credit: 3.00, last_purchase_date: '2024-11-10'
                }
            ],
            'credit-balances/alerts': [
                {
                    id: 2, vendor_id: 1, vendor_name: 'TechServices Pro', service_name: 'VPN Service',
                    remaining_credits: 8, avg_cost_per_credit: 1.75, alert_threshold: 10,
                    last_purchase_date: '2024-10-15', total_used_credits: 42, total_purchased_credits: 50
                }
            ],
            transactions: [
                {
                    id: 1, customer_id: 1, customer_name: 'John Smith', service_name: 'IPTV Premium',
                    classification: 'Living Room', amount_paid: 25.00, credits_used: 1,
                    start_date: '2024-11-01', expiration_date: '2024-12-01', status: 'active',
                    created_date: '2024-11-01', mac_address: 'AA:BB:CC:DD:EE:01'
                },
                {
                    id: 2, customer_id: 2, customer_name: 'Sarah Johnson', service_name: 'VPN Service',
                    classification: 'Home Office', amount_paid: 15.00, credits_used: 1,
                    start_date: '2024-11-05', expiration_date: '2024-12-05', status: 'active',
                    created_date: '2024-11-05', mac_address: 'AA:BB:CC:DD:EE:02'
                }
            ],
            'vendor-transactions': [
                {
                    id: 1, vendor_id: 1, vendor_name: 'TechServices Pro', service_name: 'IPTV Premium',
                    credits: 50, price_usd: 125.00, purchase_date: '2024-11-01', created_date: '2024-11-01',
                    notes: 'Bulk purchase for November'
                },
                {
                    id: 2, vendor_id: 2, vendor_name: 'DataFlow Solutions', service_name: 'Streaming Plus',
                    credits: 100, price_usd: 300.00, purchase_date: '2024-11-10', created_date: '2024-11-10',
                    notes: 'Monthly inventory restock'
                }
            ],
            sales: [
                {
                    id: 1, customer_id: 1, customer_name: 'John Smith', customer_email: 'john@email.com',
                    service_name: 'IPTV Premium', classification: 'Living Room',
                    amount_paid: 25.00, credits_used: 1, status: 'active',
                    start_date: '2024-11-01', expiration_date: '2024-12-01',
                    created_date: '2024-11-01', cost: 2.50, profit: 22.50
                }
            ],
            'vendor-services': [
                { vendor_id: 1, service_name: 'IPTV Premium' },
                { vendor_id: 1, service_name: 'VPN Service' },
                { vendor_id: 2, service_name: 'Streaming Plus' },
                { vendor_id: 3, service_name: 'Cloud Storage' }
            ]
        };
    }

    enable() {
        if (this.isEnabled) return;

        this.isEnabled = true;
        this.interceptedFetch = window.fetch;

        // Override global fetch function
        window.fetch = this.mockFetch.bind(this);

        console.log('🔧 Mock API Server enabled');
    }

    disable() {
        if (!this.isEnabled) return;

        this.isEnabled = false;
        window.fetch = this.interceptedFetch;
        this.interceptedFetch = null;

        console.log('🔧 Mock API Server disabled');
    }

    async mockFetch(url, options = {}) {
        // If it's not an API request, use real fetch
        if (!url.includes('/api/')) {
            return this.interceptedFetch(url, options);
        }

        console.log(`🔧 Mock API: ${options.method || 'GET'} ${url}`);

        // Extract endpoint from URL
        const apiPath = url.split('/api/')[1];
        const endpoint = apiPath.split('?')[0];
        const method = options.method || 'GET';

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

        try {
            const response = this.handleMockRequest(endpoint, method, options);

            return new Response(JSON.stringify(response.data), {
                status: response.status,
                statusText: response.statusText,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Mock API error:', error);
            return new Response(JSON.stringify({
                error: error.message,
                timestamp: Date.now()
            }), {
                status: 500,
                statusText: 'Internal Server Error',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
    }

    handleMockRequest(endpoint, method, options) {
        switch (method) {
            case 'GET':
                return this.handleGet(endpoint, options);
            case 'POST':
                return this.handlePost(endpoint, options);
            case 'PUT':
                return this.handlePut(endpoint, options);
            case 'DELETE':
                return this.handleDelete(endpoint, options);
            default:
                throw new Error(`Method ${method} not supported`);
        }
    }

    handleGet(endpoint, options) {
        // Handle nested endpoints
        if (this.mockData[endpoint]) {
            return {
                status: 200,
                statusText: 'OK',
                data: this.mockData[endpoint]
            };
        }

        // Handle parameterized endpoints
        switch (endpoint) {
            case 'health':
                return {
                    status: 200,
                    statusText: 'OK',
                    data: { ...this.mockData.health, timestamp: Date.now() }
                };

            case 'pnl/monthly':
                return this.generateMockMonthlyPL();

            case 'pnl/yearly':
                return this.generateMockYearlyPL();

            case 'credits/usage':
                return this.generateMockUsageData();

            default:
                // Check if it's a collection endpoint
                const baseEndpoint = endpoint.split('/')[0];
                if (this.mockData[baseEndpoint]) {
                    return {
                        status: 200,
                        statusText: 'OK',
                        data: this.mockData[baseEndpoint]
                    };
                }

                return {
                    status: 404,
                    statusText: 'Not Found',
                    data: { error: `Endpoint ${endpoint} not found`, endpoint }
                };
        }
    }

    handlePost(endpoint, options) {
        let data;
        try {
            data = options.body ? JSON.parse(options.body) : {};
        } catch (error) {
            data = {};
        }

        switch (endpoint) {
            case 'customers':
                return this.createCustomer(data);
            case 'vendors':
                return this.createVendor(data);
            case 'transactions':
                return this.createTransaction(data);
            case 'vendor-transactions':
                return this.createVendorTransaction(data);
            default:
                return {
                    status: 201,
                    statusText: 'Created',
                    data: { success: true, id: Date.now(), ...data }
                };
        }
    }

    handlePut(endpoint, options) {
        return {
            status: 200,
            statusText: 'OK',
            data: { success: true, message: 'Updated successfully' }
        };
    }

    handleDelete(endpoint, options) {
        return {
            status: 200,
            statusText: 'OK',
            data: { success: true, message: 'Deleted successfully' }
        };
    }

    // Mock data generators
    generateMockMonthlyPL() {
        const currentDate = new Date();
        const revenue = {
            customerSales: 2500 + Math.random() * 1000,
            businessIncome: 300 + Math.random() * 200,
            total: 0
        };
        revenue.total = revenue.customerSales + revenue.businessIncome;

        const costs = {
            creditPurchases: 1200 + Math.random() * 400,
            vendorFees: 150 + Math.random() * 50,
            serviceCosts: 100 + Math.random() * 50,
            total: 0
        };
        costs.total = costs.creditPurchases + costs.vendorFees + costs.serviceCosts;

        return {
            status: 200,
            statusText: 'OK',
            data: {
                month: currentDate.getMonth() + 1,
                year: currentDate.getFullYear(),
                revenue,
                costs,
                grossProfit: revenue.total - costs.total,
                netProfit: revenue.total - costs.total,
                metrics: {
                    totalTransactions: 45 + Math.floor(Math.random() * 20),
                    totalCustomers: 25 + Math.floor(Math.random() * 10),
                    creditsSold: 150 + Math.floor(Math.random() * 50),
                    avgRevenuePerCredit: revenue.customerSales / (150 + Math.floor(Math.random() * 50)),
                    netMargin: ((revenue.total - costs.total) / revenue.total) * 100
                }
            }
        };
    }

    generateMockYearlyPL() {
        const currentDate = new Date();
        const revenue = {
            customerSales: 25000 + Math.random() * 10000,
            businessIncome: 3000 + Math.random() * 2000,
            total: 0
        };
        revenue.total = revenue.customerSales + revenue.businessIncome;

        const costs = {
            creditPurchases: 12000 + Math.random() * 4000,
            vendorFees: 1500 + Math.random() * 500,
            serviceCosts: 1000 + Math.random() * 500,
            total: 0
        };
        costs.total = costs.creditPurchases + costs.vendorFees + costs.serviceCosts;

        return {
            status: 200,
            statusText: 'OK',
            data: {
                year: currentDate.getFullYear(),
                revenue,
                costs,
                grossProfit: revenue.total - costs.total,
                netProfit: revenue.total - costs.total,
                metrics: {
                    totalTransactions: 450 + Math.floor(Math.random() * 200),
                    totalCustomers: 125 + Math.floor(Math.random() * 50),
                    creditsSold: 1500 + Math.floor(Math.random() * 500),
                    avgRevenuePerCredit: revenue.customerSales / (1500 + Math.floor(Math.random() * 500)),
                    netMargin: ((revenue.total - costs.total) / revenue.total) * 100
                }
            }
        };
    }

    generateMockUsageData() {
        return {
            status: 200,
            statusText: 'OK',
            data: {
                summary: {
                    totalCreditsUsed: 234,
                    dailyAverage: 7.8,
                    totalRevenue: 5850,
                    utilizationRate: 78.5
                },
                breakdown: [
                    {
                        vendorName: 'TechServices Pro',
                        serviceName: 'IPTV Premium',
                        creditsUsed: 134,
                        revenue: 3350,
                        customerCount: 67
                    },
                    {
                        vendorName: 'DataFlow Solutions',
                        serviceName: 'Streaming Plus',
                        creditsUsed: 100,
                        revenue: 2500,
                        customerCount: 50
                    }
                ],
                trends: [
                    { periodLabel: 'Week 1', creditsUsed: 45, revenue: 1125 },
                    { periodLabel: 'Week 2', creditsUsed: 52, revenue: 1300 },
                    { periodLabel: 'Week 3', creditsUsed: 67, revenue: 1675 },
                    { periodLabel: 'Week 4', creditsUsed: 70, revenue: 1750 }
                ]
            }
        };
    }

    createCustomer(data) {
        const newCustomer = {
            id: Date.now(),
            name: data.name || 'New Customer',
            email: data.email || 'customer@email.com',
            phone: data.phone || '555-0000',
            created_date: new Date().toISOString(),
            ...data
        };

        this.mockData.customers.push(newCustomer);

        return {
            status: 201,
            statusText: 'Created',
            data: newCustomer
        };
    }

    createVendor(data) {
        const newVendor = {
            vendor_id: Date.now(),
            name: data.name || 'New Vendor',
            created_date: new Date().toISOString(),
            status: 'active',
            ...data
        };

        this.mockData.vendors.push(newVendor);

        return {
            status: 201,
            statusText: 'Created',
            data: newVendor
        };
    }

    createTransaction(data) {
        const newTransaction = {
            id: Date.now(),
            customer_id: data.customer_id,
            customer_name: data.customer_name || 'Customer',
            service_name: data.service_name || 'Service',
            amount_paid: parseFloat(data.amount_paid) || 0,
            credits_used: parseInt(data.credits_used) || 1,
            status: 'active',
            created_date: new Date().toISOString(),
            ...data
        };

        this.mockData.transactions.push(newTransaction);

        return {
            status: 201,
            statusText: 'Created',
            data: newTransaction
        };
    }

    createVendorTransaction(data) {
        const newTransaction = {
            id: Date.now(),
            vendor_id: data.vendor_id,
            vendor_name: data.vendor_name || 'Vendor',
            service_name: data.service_name || 'Service',
            credits: parseInt(data.credits) || 0,
            price_usd: parseFloat(data.price_usd) || 0,
            purchase_date: new Date().toISOString().split('T')[0],
            created_date: new Date().toISOString(),
            ...data
        };

        this.mockData['vendor-transactions'].push(newTransaction);

        return {
            status: 201,
            statusText: 'Created',
            data: newTransaction
        };
    }

    // Utility methods
    addMockData(endpoint, data) {
        if (Array.isArray(this.mockData[endpoint])) {
            this.mockData[endpoint].push(data);
        } else {
            this.mockData[endpoint] = data;
        }
    }

    getMockData(endpoint) {
        return this.mockData[endpoint];
    }

    resetMockData() {
        this.mockData = this.initializeMockData();
        console.log('🔧 Mock data reset');
    }
}

// Create global instance
const mockAPIServer = new MockAPIServer();
window.mockAPIServer = mockAPIServer;

// Auto-enable in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    mockAPIServer.enable();
}

console.log('🔧 Mock API Server loaded');
