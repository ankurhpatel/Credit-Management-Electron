class VendorListWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.vendors = [];
        this.filteredVendors = [];
        this.searchTerm = '';
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showSearch: true,
            showActions: true,
            showServiceCount: true,
            sortBy: 'name',
            sortOrder: 'asc'
        };
    }

    async loadData() {
        try {
            this.log('Loading vendors...');
            const response = await fetch('/api/vendors');
            if (!response.ok) throw new Error('Failed to fetch vendors');

            this.vendors = await response.json();
            this.filteredVendors = [...this.vendors];
            this.log(`Loaded ${this.vendors.length} vendors`);
        } catch (error) {
            this.handleError('Failed to load vendors', error);
        }
    }

    async getTemplate() {
        return `
            <div class="vendor-tab-content">
                <h3>📋 Vendor Directory</h3>
                
                ${this.options.showSearch ? this.getSearchTemplate() : ''}
                
                <div class="vendor-stats">
                    <span class="vendor-count">${this.filteredVendors.length}</span> vendors found
                    <div class="vendor-actions-bar">
                        <button class="btn-primary add-vendor-btn">➕ Add Vendor</button>
                        <button class="btn-secondary export-vendors-btn">📊 Export</button>
                        <button class="btn-info refresh-vendors-btn">🔄 Refresh</button>
                    </div>
                </div>
                
                <div class="vendor-list-container">
                    ${this.getVendorListTemplate()}
                </div>
            </div>
        `;
    }

    getSearchTemplate() {
        return `
            <div class="search-container">
                <div class="search-bar">
                    <input type="text" 
                           class="vendor-search-input" 
                           placeholder="🔍 Search vendors by name, email, or description..."
                           value="${this.searchTerm}">
                    <button class="btn-clear search-clear-btn">✕ Clear</button>
                </div>
                <div class="sort-controls">
                    <select class="sort-select">
                        <option value="name">Sort by Name</option>
                        <option value="created_date">Sort by Date Added</option>
                        <option value="service_count">Sort by Services</option>
                    </select>
                    <button class="sort-direction-btn" data-direction="${this.options.sortOrder}">
                        ${this.options.sortOrder === 'asc' ? '⬆️' : '⬇️'}
                    </button>
                </div>
            </div>
        `;
    }

    getVendorListTemplate() {
        if (this.filteredVendors.length === 0) {
            return `
                <div class="no-vendors">
                    <div class="no-data-icon">🏭</div>
                    <h4>No Vendors Found</h4>
                    <p>No vendors match your current search criteria.</p>
                    <button class="btn-primary add-first-vendor-btn">Add Your First Vendor</button>
                </div>
            `;
        }

        return `
            <div class="vendor-grid">
                ${this.filteredVendors.map(vendor => this.getVendorCardTemplate(vendor)).join('')}
            </div>
        `;
    }

    getVendorCardTemplate(vendor) {
        const serviceCount = vendor.service_count || 0;
        const isActive = (vendor.is_active !== 0);

        return `
            <div class="vendor-card ${!isActive ? 'inactive' : ''}" data-vendor-id="${vendor.vendor_id}">
                <div class="vendor-header">
                    <h4 class="vendor-name">${this.escapeHtml(vendor.name)}</h4>
                    <div class="vendor-status ${isActive ? 'active' : 'inactive'}">
                        ${isActive ? '✅ Active' : '❌ Inactive'}
                    </div>
                </div>
                
                <div class="vendor-details">
                    <div class="vendor-info">
                        <div class="info-row">
                            <strong>🆔 Vendor ID:</strong> ${vendor.vendor_id}
                        </div>
                        ${vendor.contact_email ? `
                            <div class="info-row">
                                <strong>📧 Email:</strong> 
                                <a href="mailto:${vendor.contact_email}">${this.escapeHtml(vendor.contact_email)}</a>
                            </div>
                        ` : ''}
                        ${vendor.contact_phone ? `
                            <div class="info-row">
                                <strong>📱 Phone:</strong> 
                                <a href="tel:${vendor.contact_phone}">${this.escapeHtml(vendor.contact_phone)}</a>
                            </div>
                        ` : ''}
                        <div class="info-row">
                            <strong>📅 Added:</strong> ${this.formatDate(vendor.created_date)}
                        </div>
                        ${this.options.showServiceCount ? `
                            <div class="info-row">
                                <strong>🔧 Services:</strong> 
                                <span class="service-count">${serviceCount}</span>
                            </div>
                        ` : ''}
                        ${vendor.description ? `
                            <div class="info-row description">
                                <strong>📝 Description:</strong><br>
                                ${this.escapeHtml(vendor.description)}
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                ${this.options.showActions ? this.getVendorActionsTemplate(vendor, isActive) : ''}
            </div>
        `;
    }

    getVendorActionsTemplate(vendor, isActive) {
        return `
            <div class="vendor-actions">
                <button class="btn-small btn-primary edit-vendor-btn" 
                        data-vendor-id="${vendor.vendor_id}">
                    ✏️ Edit
                </button>
                <button class="btn-small btn-info view-services-btn" 
                        data-vendor-id="${vendor.vendor_id}">
                    🔧 Services
                </button>
                <button class="btn-small btn-success purchase-credits-btn" 
                        data-vendor-id="${vendor.vendor_id}">
                    💸 Buy Credits
                </button>
                <button class="btn-small btn-secondary view-balances-btn" 
                        data-vendor-id="${vendor.vendor_id}">
                    💳 Balances
                </button>
                
                <div class="more-actions">
                    <button class="btn-small btn-secondary more-actions-btn">⋯</button>
                    <div class="actions-dropdown">
                        <button class="dropdown-item" data-action="duplicate" data-vendor-id="${vendor.vendor_id}">
                            📋 Duplicate
                        </button>
                        <button class="dropdown-item" data-action="export" data-vendor-id="${vendor.vendor_id}">
                            📊 Export Data
                        </button>
                        <button class="dropdown-item" data-action="contact" data-vendor-id="${vendor.vendor_id}">
                            📧 Contact Vendor
                        </button>
                        <hr>
                        <button class="dropdown-item ${isActive ? 'warning' : 'success'}" 
                                data-action="${isActive ? 'deactivate' : 'activate'}" 
                                data-vendor-id="${vendor.vendor_id}">
                            ${isActive ? '❌ Deactivate' : '✅ Activate'}
                        </button>
                        <button class="dropdown-item danger" data-action="delete" data-vendor-id="${vendor.vendor_id}">
                            🗑️ Delete Vendor
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Search functionality
        const searchInput = this.$('.vendor-search-input');
        if (searchInput) {
            this.addEventListener(searchInput, 'input', (e) => this.handleSearch(e.target.value));
        }

        // Clear search
        const clearBtn = this.$('.search-clear-btn');
        if (clearBtn) {
            this.addEventListener(clearBtn, 'click', () => this.clearSearch());
        }

        // Sort controls
        const sortSelect = this.$('.sort-select');
        if (sortSelect) {
            this.addEventListener(sortSelect, 'change', (e) => this.setSortBy(e.target.value));
        }

        const sortDirectionBtn = this.$('.sort-direction-btn');
        if (sortDirectionBtn) {
            this.addEventListener(sortDirectionBtn, 'click', () => this.toggleSortDirection());
        }

        // Action buttons
        const addBtn = this.$('.add-vendor-btn');
        if (addBtn) {
            this.addEventListener(addBtn, 'click', () => this.handleAddVendor());
        }

        const exportBtn = this.$('.export-vendors-btn');
        if (exportBtn) {
            this.addEventListener(exportBtn, 'click', () => this.handleExport());
        }

        const refreshBtn = this.$('.refresh-vendors-btn');
        if (refreshBtn) {
            this.addEventListener(refreshBtn, 'click', () => this.refresh());
        }

        // Vendor action buttons
        this.bindVendorActions();
    }

    bindVendorActions() {
        // Edit buttons
        this.$$('.edit-vendor-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const vendorId = e.target.getAttribute('data-vendor-id');
                this.handleEditVendor(vendorId);
            });
        });

        // View services buttons
        this.$$('.view-services-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const vendorId = e.target.getAttribute('data-vendor-id');
                this.handleViewServices(vendorId);
            });
        });

        // Purchase credits buttons
        this.$$('.purchase-credits-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const vendorId = e.target.getAttribute('data-vendor-id');
                this.handlePurchaseCredits(vendorId);
            });
        });

        // View balances buttons
        this.$$('.view-balances-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const vendorId = e.target.getAttribute('data-vendor-id');
                this.handleViewBalances(vendorId);
            });
        });

        // More actions dropdowns
        this.$$('.more-actions-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                e.stopPropagation();
                this.toggleMoreActions(btn);
            });
        });

        // Dropdown actions
        this.$$('.dropdown-item').forEach(item => {
            this.addEventListener(item, 'click', (e) => {
                const action = e.target.getAttribute('data-action');
                const vendorId = e.target.getAttribute('data-vendor-id');
                this.handleDropdownAction(action, vendorId);
            });
        });

        // Click outside to close dropdowns
        this.addEventListener(document, 'click', (e) => {
            if (!e.target.closest('.more-actions')) {
                this.$$('.actions-dropdown').forEach(dropdown => {
                    dropdown.style.display = 'none';
                });
            }
        });
    }

    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.applyFilters();
    }

    clearSearch() {
        this.searchTerm = '';
        const searchInput = this.$('.vendor-search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        this.applyFilters();
    }

    setSortBy(sortBy) {
        this.options.sortBy = sortBy;
        this.applyFilters();
    }

    toggleSortDirection() {
        this.options.sortOrder = this.options.sortOrder === 'asc' ? 'desc' : 'asc';
        const btn = this.$('.sort-direction-btn');
        if (btn) {
            btn.setAttribute('data-direction', this.options.sortOrder);
            btn.textContent = this.options.sortOrder === 'asc' ? '⬆️' : '⬇️';
        }
        this.applyFilters();
    }

    applyFilters() {
        let filtered = [...this.vendors];

        // Apply search filter
        if (this.searchTerm.trim()) {
            filtered = filtered.filter(vendor => {
                const searchFields = [
                    vendor.name || '',
                    vendor.contact_email || '',
                    vendor.contact_phone || '',
                    vendor.description || '',
                    vendor.vendor_id || ''
                ].map(field => field.toLowerCase());

                return searchFields.some(field => field.includes(this.searchTerm));
            });
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue = a[this.options.sortBy] || '';
            let bValue = b[this.options.sortBy] || '';

            // Handle special sorting for service count
            if (this.options.sortBy === 'service_count') {
                aValue = parseInt(aValue) || 0;
                bValue = parseInt(bValue) || 0;
            }

            let comparison = 0;
            if (aValue > bValue) comparison = 1;
            if (aValue < bValue) comparison = -1;

            return this.options.sortOrder === 'desc' ? -comparison : comparison;
        });

        this.filteredVendors = filtered;
        this.updateDisplay();
    }

    async updateDisplay() {
        const container = this.$('.vendor-list-container');
        const countEl = this.$('.vendor-count');

        if (container) {
            container.innerHTML = this.getVendorListTemplate();
            this.bindVendorActions(); // Re-bind events after DOM update
        }

        if (countEl) {
            countEl.textContent = this.filteredVendors.length;
        }
    }

    // Action handlers
    handleAddVendor() {
        this.emit('addVendorRequested');
        console.log('Add vendor requested');
    }

    handleEditVendor(vendorId) {
        this.emit('editVendorRequested', { vendorId });
        console.log('Edit vendor:', vendorId);
    }

    handleViewServices(vendorId) {
        this.emit('viewServicesRequested', { vendorId });
        console.log('View services for vendor:', vendorId);
    }

    handlePurchaseCredits(vendorId) {
        this.emit('purchaseCreditsRequested', { vendorId });
        console.log('Purchase credits for vendor:', vendorId);
    }

    handleViewBalances(vendorId) {
        this.emit('viewBalancesRequested', { vendorId });
        console.log('View balances for vendor:', vendorId);
    }

    handleDropdownAction(action, vendorId) {
        switch (action) {
            case 'duplicate':
                this.handleDuplicateVendor(vendorId);
                break;
            case 'export':
                this.handleExportVendor(vendorId);
                break;
            case 'contact':
                this.handleContactVendor(vendorId);
                break;
            case 'activate':
            case 'deactivate':
                this.handleToggleVendorStatus(vendorId, action === 'activate');
                break;
            case 'delete':
                this.handleDeleteVendor(vendorId);
                break;
        }

        // Hide dropdown
        this.$$('.actions-dropdown').forEach(dropdown => {
            dropdown.style.display = 'none';
        });
    }

    toggleMoreActions(button) {
        const dropdown = button.nextElementSibling;
        const isVisible = dropdown.style.display === 'block';

        // Hide all dropdowns first
        this.$$('.actions-dropdown').forEach(d => d.style.display = 'none');

        // Show this dropdown if it wasn't visible
        if (!isVisible) {
            dropdown.style.display = 'block';
        }
    }

    handleDuplicateVendor(vendorId) {
        const vendor = this.vendors.find(v => v.vendor_id === vendorId);
        if (vendor) {
            const duplicateData = {
                name: `${vendor.name} (Copy)`,
                contactEmail: '', // Clear email as it should be unique
                contactPhone: vendor.contact_phone,
                description: vendor.description
            };
            this.emit('duplicateVendorRequested', { vendorData: duplicateData });
        }
    }

    handleExportVendor(vendorId) {
        const vendor = this.vendors.find(v => v.vendor_id === vendorId);
        if (vendor) {
            const csvData = this.exportVendorToCSV(vendor);
            this.downloadCSV(csvData, `vendor-${vendor.name.replace(/\s+/g, '-')}.csv`);
        }
    }

    handleContactVendor(vendorId) {
        const vendor = this.vendors.find(v => v.vendor_id === vendorId);
        if (vendor && vendor.contact_email) {
            const subject = `Regarding Vendor Services - ${vendor.name}`;
            const body = `Dear ${vendor.name},\n\nI hope this message finds you well.\n\nBest regards`;

            const mailtoLink = `mailto:${vendor.contact_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.open(mailtoLink);
        } else {
            this.showErrorMessage('No contact email available for this vendor');
        }
    }

    async handleToggleVendorStatus(vendorId, activate) {
        try {
            const vendor = this.vendors.find(v => v.vendor_id === vendorId);
            if (!vendor) return;

            const newStatus = activate ? 'active' : 'inactive';
            const response = await fetch(`/api/vendors/${vendorId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Failed to update vendor status');
            }

            // Update local data
            vendor.is_active = activate ? 1 : 0;
            this.applyFilters();

            this.showSuccessMessage(`Vendor ${activate ? 'activated' : 'deactivated'} successfully`);
        } catch (error) {
            this.showErrorMessage(error.message);
        }
    }

    async handleDeleteVendor(vendorId) {
        const vendor = this.vendors.find(v => v.vendor_id === vendorId);
        if (!vendor) return;

        const modal = WidgetManager.getWidget('confirmation-modal');
        if (modal) {
            modal.confirmDelete(vendor.name, async () => {
                try {
                    const response = await fetch(`/api/vendors/${vendorId}`, {
                        method: 'DELETE'
                    });

                    if (!response.ok) {
                        const result = await response.json();
                        throw new Error(result.error || 'Failed to delete vendor');
                    }

                    // Remove from local data
                    this.vendors = this.vendors.filter(v => v.vendor_id !== vendorId);
                    this.applyFilters();

                    this.showSuccessMessage('Vendor deleted successfully');
                } catch (error) {
                    this.showErrorMessage(error.message);
                }
            });
        }
    }

    handleExport() {
        const csvData = this.exportToCSV();
        this.downloadCSV(csvData, 'vendors.csv');
    }

    exportToCSV() {
        const headers = ['Vendor ID', 'Name', 'Contact Email', 'Contact Phone', 'Description', 'Status', 'Services', 'Created Date'];
        const rows = this.filteredVendors.map(vendor => [
            vendor.vendor_id,
            vendor.name,
            vendor.contact_email || '',
            vendor.contact_phone || '',
            vendor.description || '',
            vendor.is_active ? 'Active' : 'Inactive',
            vendor.service_count || 0,
            vendor.created_date
        ]);

        return [headers, ...rows].map(row =>
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
    }

    exportVendorToCSV(vendor) {
        const headers = ['Field', 'Value'];
        const rows = [
            ['Vendor ID', vendor.vendor_id],
            ['Name', vendor.name],
            ['Contact Email', vendor.contact_email || ''],
            ['Contact Phone', vendor.contact_phone || ''],
            ['Description', vendor.description || ''],
            ['Status', vendor.is_active ? 'Active' : 'Inactive'],
            ['Services', vendor.service_count || 0],
            ['Created Date', vendor.created_date]
        ];

        return [headers, ...rows].map(row =>
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
    }

    downloadCSV(csvData, filename) {
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    showSuccessMessage(message) {
        console.log('Success:', message);
        // Implementation depends on your notification system
    }

    showErrorMessage(message) {
        console.error('Error:', message);
        // Implementation depends on your notification system
    }

    // Public API
    async refresh() {
        await this.loadData();
        this.applyFilters();
    }

    searchVendors(query) {
        this.handleSearch(query);
    }

    getSelectedVendors() {
        // For future implementation of bulk actions
        return [];
    }
}

window.VendorListWidget = VendorListWidget;
