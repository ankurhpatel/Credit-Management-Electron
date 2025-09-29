class CustomerListWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.customers = [];
        this.filteredCustomers = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.sortField = 'name';
        this.sortDirection = 'asc';
        this.searchTerm = '';
        this.filterStatus = 'all';
        this.selectedCustomer = null;
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showAddButton: true,
            showSearch: true,
            showFilters: true,
            showPagination: true,
            showStats: true,
            itemsPerPage: 10
        };
    }

    async loadData() {
        try {
            this.log('Loading customers data...');

            // Load customers from Express API
            const response = await fetch('http://localhost:3001/api/customers');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            this.customers = await response.json();
            this.applyFiltersAndSearch();

            this.log(`✅ Loaded ${this.customers.length} customers successfully`);
        } catch (error) {
            this.handleError('Failed to load customers', error);

            // Set fallback demo data to ensure widget displays something
            this.customers = this.getDemoCustomers();
            this.applyFiltersAndSearch();
        }
    }

    getDemoCustomers() {
        return [
            {
                id: 'demo1',
                name: 'John Doe',
                email: 'john.doe@example.com',
                phone: '555-0001',
                address: '123 Main St, Anytown USA',
                status: 'active',
                subscription_count: 2,
                total_spent: 240.00,
                created_date: '2024-01-15T00:00:00Z',
                updated_at: '2024-09-15T00:00:00Z'
            },
            {
                id: 'demo2',
                name: 'Jane Smith',
                email: 'jane.smith@example.com',
                phone: '555-0002',
                address: '456 Oak Ave, Somewhere USA',
                status: 'active',
                subscription_count: 1,
                total_spent: 120.00,
                created_date: '2024-02-20T00:00:00Z',
                updated_at: '2024-09-20T00:00:00Z'
            },
            {
                id: 'demo3',
                name: 'Bob Johnson',
                email: 'bob.johnson@example.com',
                phone: '555-0003',
                address: '789 Pine Rd, Elsewhere USA',
                status: 'inactive',
                subscription_count: 0,
                total_spent: 60.00,
                created_date: '2024-03-10T00:00:00Z',
                updated_at: '2024-08-10T00:00:00Z'
            }
        ];
    }

    async getTemplate() {
        const stats = this.calculateStats();
        const paginatedCustomers = this.getPaginatedCustomers();
        const totalPages = Math.ceil(this.filteredCustomers.length / this.itemsPerPage);

        return `
            <div class="customer-management">
                <!-- Header Section -->
                <div class="customer-header">
                    <div class="header-content">
                        <h2>👥 Customer Management</h2>
                        ${this.options.showStats ? this.getStatsCards(stats) : ''}
                    </div>
                    <div class="header-actions">
                        ${this.options.showAddButton ? `
                            <button class="btn btn-primary btn-add" onclick="window.customerWidget.showAddModal()">
                                ➕ Add Customer
                            </button>
                        ` : ''}
                        <button class="btn btn-secondary" onclick="window.customerWidget.refresh()">
                            🔄 Refresh
                        </button>
                    </div>
                </div>

                <!-- Search and Filters -->
                ${this.options.showSearch ? this.getSearchFiltersTemplate() : ''}

                <!-- Customer Table -->
                <div class="table-container">
                    <table class="customer-table">
                        <thead>
                            <tr>
                                <th class="sortable" onclick="window.customerWidget.sortBy('name')">
                                    <span>Customer Name</span>
                                    ${this.getSortIcon('name')}
                                </th>
                                <th class="sortable" onclick="window.customerWidget.sortBy('email')">
                                    <span>Contact Info</span>
                                    ${this.getSortIcon('email')}
                                </th>
                                <th class="sortable" onclick="window.customerWidget.sortBy('subscription_count')">
                                    <span>Subscriptions</span>
                                    ${this.getSortIcon('subscription_count')}
                                </th>
                                <th class="sortable" onclick="window.customerWidget.sortBy('total_spent')">
                                    <span>Total Spent</span>
                                    ${this.getSortIcon('total_spent')}
                                </th>
                                <th class="sortable" onclick="window.customerWidget.sortBy('status')">
                                    <span>Status</span>
                                    ${this.getSortIcon('status')}
                                </th>
                                <th class="actions-header">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${paginatedCustomers.length > 0 ?
                paginatedCustomers.map(customer => this.getCustomerRow(customer)).join('') :
                '<tr><td colspan="6" class="no-data">No customers found</td></tr>'
            }
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                ${this.options.showPagination && totalPages > 1 ? this.getPagination(totalPages) : ''}
            </div>

            ${this.getModalsTemplate()}
        `;
    }

    getStatsCards(stats) {
        return `
            <div class="customer-stats">
                <div class="stat-card">
                    <div class="stat-icon">👥</div>
                    <div class="stat-info">
                        <div class="stat-value">${stats.total}</div>
                        <div class="stat-label">Total Customers</div>
                    </div>
                </div>
                <div class="stat-card active">
                    <div class="stat-icon">✅</div>
                    <div class="stat-info">
                        <div class="stat-value">${stats.active}</div>
                        <div class="stat-label">Active</div>
                    </div>
                </div>
                <div class="stat-card revenue">
                    <div class="stat-icon">💰</div>
                    <div class="stat-info">
                        <div class="stat-value">${this.formatCurrency(stats.totalRevenue)}</div>
                        <div class="stat-label">Total Revenue</div>
                    </div>
                </div>
                <div class="stat-card avg">
                    <div class="stat-icon">📊</div>
                    <div class="stat-info">
                        <div class="stat-value">${this.formatCurrency(stats.avgSpent)}</div>
                        <div class="stat-label">Avg per Customer</div>
                    </div>
                </div>
            </div>
        `;
    }

    getSearchFiltersTemplate() {
        return `
            <div class="customer-controls">
                <div class="search-section">
                    <div class="search-box">
                        <input type="text" 
                               id="customerSearch" 
                               class="search-input"
                               placeholder="🔍 Search by name, email, or phone..." 
                               value="${this.searchTerm}"
                               oninput="window.customerWidget.handleSearch(this.value)">
                    </div>
                </div>
                <div class="filter-section">
                    <select id="statusFilter" 
                            class="filter-select"
                            onchange="window.customerWidget.handleStatusFilter(this.value)">
                        <option value="all" ${this.filterStatus === 'all' ? 'selected' : ''}>All Status</option>
                        <option value="active" ${this.filterStatus === 'active' ? 'selected' : ''}>Active Only</option>
                        <option value="inactive" ${this.filterStatus === 'inactive' ? 'selected' : ''}>Inactive Only</option>
                    </select>
                    <button class="btn btn-outline" onclick="window.customerWidget.resetFilters()">
                        🔄 Reset Filters
                    </button>
                </div>
            </div>
        `;
    }

    getCustomerRow(customer) {
        const statusClass = customer.status === 'active' ? 'status-active' : 'status-inactive';
        const subscriptionBadge = customer.subscription_count > 0 ?
            `<span class="subscription-badge">${customer.subscription_count} active</span>` :
            '<span class="subscription-badge none">No subscriptions</span>';

        return `
            <tr class="customer-row" data-customer-id="${customer.id}">
                <td class="customer-info">
                    <div class="customer-name">${customer.name || 'Unknown'}</div>
                    <div class="customer-since">Customer since ${this.formatDate(customer.created_date)}</div>
                </td>
                <td class="contact-info">
                    <div class="email">
                        <a href="mailto:${customer.email || ''}" class="contact-link">
                            📧 ${customer.email || 'No email'}
                        </a>
                    </div>
                    <div class="phone">
                        <a href="tel:${customer.phone || ''}" class="contact-link">
                            📞 ${customer.phone || 'No phone'}
                        </a>
                    </div>
                </td>
                <td class="subscription-info">
                    ${subscriptionBadge}
                </td>
                <td class="spending-info">
                    <div class="total-spent">${this.formatCurrency(customer.total_spent || 0)}</div>
                </td>
                <td class="status-info">
                    <span class="status-badge ${statusClass}">
                        ${customer.status === 'active' ? '✅' : '⏸️'} ${customer.status || 'Unknown'}
                    </span>
                </td>
                <td class="actions">
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-info" 
                                onclick="window.customerWidget.viewCustomer('${customer.id}')"
                                title="View Customer Details">
                            👁️ View
                        </button>
                        <button class="btn btn-sm btn-primary" 
                                onclick="window.customerWidget.editCustomer('${customer.id}')"
                                title="Edit Customer">
                            ✏️ Edit
                        </button>
                        <button class="btn btn-sm btn-danger" 
                                onclick="window.customerWidget.confirmDelete('${customer.id}', '${customer.name}')"
                                title="Delete Customer">
                            🗑️ Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    getPagination(totalPages) {
        if (totalPages <= 1) return '';

        let pagination = '<div class="pagination-container">';
        pagination += '<div class="pagination">';

        // Previous button
        pagination += `
            <button class="btn btn-sm pagination-btn ${this.currentPage <= 1 ? 'disabled' : ''}" 
                    onclick="window.customerWidget.goToPage(${this.currentPage - 1})"
                    ${this.currentPage <= 1 ? 'disabled' : ''}>
                ‹ Previous
            </button>
        `;

        // Page numbers (show max 5 pages)
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);

        for (let i = startPage; i <= endPage; i++) {
            pagination += `
                <button class="btn btn-sm pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                        onclick="window.customerWidget.goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        // Next button
        pagination += `
            <button class="btn btn-sm pagination-btn ${this.currentPage >= totalPages ? 'disabled' : ''}" 
                    onclick="window.customerWidget.goToPage(${this.currentPage + 1})"
                    ${this.currentPage >= totalPages ? 'disabled' : ''}>
                Next ›
            </button>
        `;

        pagination += '</div>';
        pagination += `<div class="pagination-info">Showing ${((this.currentPage - 1) * this.itemsPerPage) + 1}-${Math.min(this.currentPage * this.itemsPerPage, this.filteredCustomers.length)} of ${this.filteredCustomers.length} customers</div>`;
        pagination += '</div>';

        return pagination;
    }

    getModalsTemplate() {
        return `
            <!-- Add Customer Modal -->
            <div id="addCustomerModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>➕ Add New Customer</h3>
                        <button class="modal-close" onclick="window.customerWidget.hideAddModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="addCustomerForm" onsubmit="window.customerWidget.handleAddCustomer(event)">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="newCustomerName">Full Name *</label>
                                    <input type="text" id="newCustomerName" name="name" required 
                                           placeholder="Enter customer's full name">
                                </div>
                                <div class="form-group">
                                    <label for="newCustomerEmail">Email Address</label>
                                    <input type="email" id="newCustomerEmail" name="email" 
                                           placeholder="customer@example.com">
                                </div>
                                <div class="form-group">
                                    <label for="newCustomerPhone">Phone Number</label>
                                    <input type="tel" id="newCustomerPhone" name="phone" 
                                           placeholder="555-123-4567">
                                </div>
                                <div class="form-group">
                                    <label for="newCustomerStatus">Status</label>
                                    <select id="newCustomerStatus" name="status">
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="newCustomerAddress">Address</label>
                                <textarea id="newCustomerAddress" name="address" rows="3" 
                                          placeholder="Enter customer's address (optional)"></textarea>
                            </div>
                            <div class="modal-actions">
                                <button type="button" class="btn btn-secondary" onclick="window.customerWidget.hideAddModal()">
                                    Cancel
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    ➕ Add Customer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Edit Customer Modal -->
            <div id="editCustomerModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>✏️ Edit Customer</h3>
                        <button class="modal-close" onclick="window.customerWidget.hideEditModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="editCustomerForm" onsubmit="window.customerWidget.handleEditCustomer(event)">
                            <input type="hidden" id="editCustomerId" name="id">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="editCustomerName">Full Name *</label>
                                    <input type="text" id="editCustomerName" name="name" required>
                                </div>
                                <div class="form-group">
                                    <label for="editCustomerEmail">Email Address</label>
                                    <input type="email" id="editCustomerEmail" name="email">
                                </div>
                                <div class="form-group">
                                    <label for="editCustomerPhone">Phone Number</label>
                                    <input type="tel" id="editCustomerPhone" name="phone">
                                </div>
                                <div class="form-group">
                                    <label for="editCustomerStatus">Status</label>
                                    <select id="editCustomerStatus" name="status">
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="editCustomerAddress">Address</label>
                                <textarea id="editCustomerAddress" name="address" rows="3"></textarea>
                            </div>
                            <div class="modal-actions">
                                <button type="button" class="btn btn-secondary" onclick="window.customerWidget.hideEditModal()">
                                    Cancel
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    💾 Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Customer Details Modal -->
            <div id="customerDetailsModal" class="modal">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>👤 Customer Details</h3>
                        <button class="modal-close" onclick="window.customerWidget.hideDetailsModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="customerDetailsContent">
                            <div class="loading-spinner">Loading customer details...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Utility Methods
    calculateStats() {
        const totalRevenue = this.customers.reduce((sum, customer) => sum + (customer.total_spent || 0), 0);
        const activeCustomers = this.customers.filter(customer => customer.status === 'active').length;

        return {
            total: this.customers.length,
            active: activeCustomers,
            inactive: this.customers.length - activeCustomers,
            totalRevenue: totalRevenue,
            avgSpent: this.customers.length > 0 ? totalRevenue / this.customers.length : 0
        };
    }

    applyFiltersAndSearch() {
        this.filteredCustomers = this.customers.filter(customer => {
            // Search filter
            const searchMatch = !this.searchTerm ||
                customer.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                customer.email?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                customer.phone?.includes(this.searchTerm);

            // Status filter
            const statusMatch = this.filterStatus === 'all' || customer.status === this.filterStatus;

            return searchMatch && statusMatch;
        });

        // Apply sorting
        this.filteredCustomers.sort((a, b) => {
            let aVal = a[this.sortField] || '';
            let bVal = b[this.sortField] || '';

            // Convert to strings for comparison if needed
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toString().toLowerCase();
            }

            if (this.sortDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        // Reset to first page when filters change
        this.currentPage = 1;
    }

    getPaginatedCustomers() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return this.filteredCustomers.slice(startIndex, endIndex);
    }

    getSortIcon(field) {
        if (this.sortField !== field) return '<span class="sort-icon">↕️</span>';
        return this.sortDirection === 'asc' ? '<span class="sort-icon active">↑</span>' : '<span class="sort-icon active">↓</span>';
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return 'Invalid Date';
        }
    }

    async onAfterRender() {
        // Set up global reference
        window.customerWidget = this;

        // Set up modal handlers
        this.setupModalHandlers();

        // Set up keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    setupModalHandlers() {
        // Close modals when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        });

        // Close modals with Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                const modals = document.querySelectorAll('.modal');
                modals.forEach(modal => {
                    if (modal.style.display === 'flex') {
                        modal.style.display = 'none';
                    }
                });
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Only handle shortcuts when not typing in inputs
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            if (event.ctrlKey || event.metaKey) {
                switch (event.key.toLowerCase()) {
                    case 'n':
                        event.preventDefault();
                        this.showAddModal();
                        break;
                    case 'f':
                        event.preventDefault();
                        document.getElementById('customerSearch')?.focus();
                        break;
                }
            }
        });
    }

    // Event Handlers
    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.trim();
        this.applyFiltersAndSearch();
        this.render();
    }

    handleStatusFilter(status) {
        this.filterStatus = status;
        this.applyFiltersAndSearch();
        this.render();
    }

    resetFilters() {
        this.searchTerm = '';
        this.filterStatus = 'all';
        this.sortField = 'name';
        this.sortDirection = 'asc';
        this.currentPage = 1;

        // Reset UI elements
        const searchInput = document.getElementById('customerSearch');
        const statusFilter = document.getElementById('statusFilter');

        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = 'all';

        this.applyFiltersAndSearch();
        this.render();
    }

    sortBy(field) {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }
        this.applyFiltersAndSearch();
        this.render();
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredCustomers.length / this.itemsPerPage);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.render();
        }
    }

    // Modal Methods
    showAddModal() {
        document.getElementById('addCustomerModal').style.display = 'flex';
        setTimeout(() => {
            document.getElementById('newCustomerName')?.focus();
        }, 100);
    }

    hideAddModal() {
        document.getElementById('addCustomerModal').style.display = 'none';
        document.getElementById('addCustomerForm')?.reset();
    }

    hideEditModal() {
        document.getElementById('editCustomerModal').style.display = 'none';
    }

    hideDetailsModal() {
        document.getElementById('customerDetailsModal').style.display = 'none';
    }

    // Customer CRUD Operations
    async handleAddCustomer(event) {
        event.preventDefault();

        try {
            const formData = new FormData(event.target);
            const customerData = Object.fromEntries(formData);

            // Validate required fields
            if (!customerData.name?.trim()) {
                throw new Error('Customer name is required');
            }

            const response = await fetch('http://localhost:3001/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customerData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const newCustomer = await response.json();

            // Add to local array and refresh
            this.customers.unshift(newCustomer);
            this.applyFiltersAndSearch();
            this.hideAddModal();
            await this.render();

            this.showNotification('Success', `Customer "${customerData.name}" added successfully!`, 'success');
        } catch (error) {
            this.log(`Add customer error: ${error.message}`, 'error');
            this.showNotification('Error', `Failed to add customer: ${error.message}`, 'error');
        }
    }

    async editCustomer(customerId) {
        try {
            const customer = this.customers.find(c => c.id === customerId);
            if (!customer) {
                throw new Error('Customer not found');
            }

            // Populate edit form
            document.getElementById('editCustomerId').value = customer.id;
            document.getElementById('editCustomerName').value = customer.name || '';
            document.getElementById('editCustomerEmail').value = customer.email || '';
            document.getElementById('editCustomerPhone').value = customer.phone || '';
            document.getElementById('editCustomerStatus').value = customer.status || 'active';
            document.getElementById('editCustomerAddress').value = customer.address || '';

            document.getElementById('editCustomerModal').style.display = 'flex';
            setTimeout(() => {
                document.getElementById('editCustomerName')?.focus();
            }, 100);
        } catch (error) {
            this.showNotification('Error', `Failed to load customer for editing: ${error.message}`, 'error');
        }
    }

    async handleEditCustomer(event) {
        event.preventDefault();

        try {
            const formData = new FormData(event.target);
            const customerData = Object.fromEntries(formData);
            const customerId = customerData.id;

            if (!customerId) {
                throw new Error('Customer ID is missing');
            }

            const response = await fetch(`http://localhost:3001/api/customers/${customerId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customerData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const updatedCustomer = await response.json();

            // Update local array
            const customerIndex = this.customers.findIndex(c => c.id === customerId);
            if (customerIndex !== -1) {
                this.customers[customerIndex] = updatedCustomer;
                this.applyFiltersAndSearch();
                this.hideEditModal();
                await this.render();
            }

            this.showNotification('Success', `Customer "${customerData.name}" updated successfully!`, 'success');
        } catch (error) {
            this.log(`Edit customer error: ${error.message}`, 'error');
            this.showNotification('Error', `Failed to update customer: ${error.message}`, 'error');
        }
    }

    async viewCustomer(customerId) {
        try {
            const customer = this.customers.find(c => c.id === customerId);
            if (!customer) {
                throw new Error('Customer not found');
            }

            // Show modal with loading state
            document.getElementById('customerDetailsModal').style.display = 'flex';
            document.getElementById('customerDetailsContent').innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner">📊</div>
                    <p>Loading customer details...</p>
                </div>
            `;

            // Load detailed customer data
            const response = await fetch(`http://localhost:3001/api/customers/${customerId}`);
            let customerDetails = customer;

            if (response.ok) {
                customerDetails = await response.json();
            }

            // Display customer details
            document.getElementById('customerDetailsContent').innerHTML = `
                <div class="customer-details">
                    <div class="customer-profile">
                        <div class="profile-header">
                            <div class="customer-avatar">👤</div>
                            <div class="customer-title">
                                <h3>${customerDetails.name}</h3>
                                <span class="status-badge ${customerDetails.status === 'active' ? 'status-active' : 'status-inactive'}">
                                    ${customerDetails.status === 'active' ? '✅ Active' : '⏸️ Inactive'}
                                </span>
                            </div>
                        </div>
                        
                        <div class="profile-details">
                            <div class="detail-section">
                                <h4>📞 Contact Information</h4>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <label>Email:</label>
                                        <span>${customerDetails.email ? `<a href="mailto:${customerDetails.email}">${customerDetails.email}</a>` : 'Not provided'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>Phone:</label>
                                        <span>${customerDetails.phone ? `<a href="tel:${customerDetails.phone}">${customerDetails.phone}</a>` : 'Not provided'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="detail-section">
                                <h4>🏠 Address</h4>
                                <p>${customerDetails.address || 'No address provided'}</p>
                            </div>
                            
                            <div class="detail-section">
                                <h4>📊 Statistics</h4>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <label>Total Spent:</label>
                                        <span class="amount">${this.formatCurrency(customerDetails.total_spent || 0)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>Active Subscriptions:</label>
                                        <span>${customerDetails.subscription_count || 0}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>Customer Since:</label>
                                        <span>${this.formatDate(customerDetails.created_date)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>Last Updated:</label>
                                        <span>${this.formatDate(customerDetails.updated_at)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="profile-actions">
                            <button class="btn btn-primary" onclick="window.customerWidget.editCustomer('${customerId}'); window.customerWidget.hideDetailsModal();">
                                ✏️ Edit Customer
                            </button>
                            <button class="btn btn-info" onclick="window.customerWidget.addSubscription('${customerId}')">
                                ➕ Add Subscription
                            </button>
                            <button class="btn btn-secondary" onclick="window.customerWidget.hideDetailsModal()">
                                Close
                            </button>
                        </div>
                    </div>
                    
                    ${customerDetails.subscriptions && customerDetails.subscriptions.length > 0 ? `
                    <div class="customer-subscriptions">
                        <h4>📋 Active Subscriptions</h4>
                        <div class="subscriptions-list">
                            ${customerDetails.subscriptions.map(sub => `
                                <div class="subscription-item">
                                    <div class="subscription-info">
                                        <strong>${sub.service_name}</strong>
                                        <span class="subscription-status">${sub.status}</span>
                                    </div>
                                    <div class="subscription-details">
                                        <small>Expires: ${this.formatDate(sub.expiration_date)}</small>
                                        <small>Amount: ${this.formatCurrency(sub.amount_paid)}</small>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
        } catch (error) {
            document.getElementById('customerDetailsContent').innerHTML = `
                <div class="error-state">
                    <div class="error-icon">❌</div>
                    <p>Failed to load customer details</p>
                    <p><small>${error.message}</small></p>
                    <button class="btn btn-secondary" onclick="window.customerWidget.hideDetailsModal()">Close</button>
                </div>
            `;
        }
    }

    confirmDelete(customerId, customerName) {
        if (confirm(`Are you sure you want to delete customer "${customerName}"?\n\nThis action cannot be undone.`)) {
            this.deleteCustomer(customerId);
        }
    }

    async deleteCustomer(customerId) {
        try {
            const response = await fetch(`http://localhost:3001/api/customers/${customerId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            // Remove from local array
            this.customers = this.customers.filter(c => c.id !== customerId);
            this.applyFiltersAndSearch();
            await this.render();

            this.showNotification('Success', 'Customer deleted successfully!', 'success');
        } catch (error) {
            this.log(`Delete customer error: ${error.message}`, 'error');
            this.showNotification('Error', `Failed to delete customer: ${error.message}`, 'error');
        }
    }

    addSubscription(customerId) {
        // TODO: Navigate to add subscription page or open modal
        this.showNotification('Info', 'Add subscription functionality coming soon!', 'info');
        console.log('Adding subscription for customer:', customerId);
    }

    showNotification(title, message, type = 'info') {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        console.log(`${icons[type] || 'ℹ️'} ${title}: ${message}`);

        // TODO: Implement actual toast notification system
        // For now, using browser alert for critical messages
        if (type === 'error') {
            alert(`Error: ${message}`);
        }
    }
}

// Make widget available globally
window.CustomerListWidget = CustomerListWidget;
