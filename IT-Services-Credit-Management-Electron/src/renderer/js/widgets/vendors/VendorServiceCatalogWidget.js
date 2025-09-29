class VendorServiceCatalogWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.services = [];
        this.filteredServices = [];
        this.searchTerm = '';
        this.selectedVendorId = null;
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showSearch: true,
            showVendorFilter: true,
            showActions: true,
            groupByVendor: true,
            showAvailabilityStatus: true
        };
    }

    async loadData() {
        try {
            this.log('Loading vendor services...');
            const response = await fetch('/api/vendor-services');
            if (!response.ok) throw new Error('Failed to fetch vendor services');

            this.services = await response.json();
            this.filteredServices = [...this.services];
            this.log(`Loaded ${this.services.length} vendor services`);
        } catch (error) {
            this.handleError('Failed to load vendor services', error);
        }
    }

    async getTemplate() {
        return `
            <div class="vendor-tab-content">
                <h3>🔧 Service Catalog Management</h3>
                
                ${this.getFiltersTemplate()}
                
                <div class="service-stats">
                    <span class="service-count">${this.filteredServices.length}</span> services found
                    <div class="service-actions-bar">
                        <button class="btn-primary add-service-btn">➕ Add Service</button>
                        <button class="btn-secondary export-services-btn">📊 Export</button>
                        <button class="btn-info refresh-services-btn">🔄 Refresh</button>
                    </div>
                </div>
                
                <div class="services-container">
                    ${this.getServicesTemplate()}
                </div>
                
                <div class="service-note">
                    <strong>💡 Note:</strong> Services are catalog entries. Prices are entered per transaction when purchasing credits.
                </div>
            </div>
        `;
    }

    getFiltersTemplate() {
        return `
            <div class="filters-section">
                ${this.options.showSearch ? `
                    <div class="search-container">
                        <div class="search-bar">
                            <input type="text" 
                                   class="service-search-input" 
                                   placeholder="🔍 Search services by name, vendor, or description..."
                                   value="${this.searchTerm}">
                            <button class="btn-clear search-clear-btn">✕ Clear</button>
                        </div>
                    </div>
                ` : ''}
                
                ${this.options.showVendorFilter ? `
                    <div class="vendor-filter">
                        <select class="vendor-filter-select">
                            <option value="">All Vendors</option>
                            ${this.getVendorFilterOptions()}
                        </select>
                    </div>
                ` : ''}
                
                <div class="view-controls">
                    <button class="view-toggle ${this.options.groupByVendor ? 'active' : ''}" data-view="grouped">
                        📂 Grouped
                    </button>
                    <button class="view-toggle ${!this.options.groupByVendor ? 'active' : ''}" data-view="list">
                        📋 List
                    </button>
                </div>
            </div>
        `;
    }

    getVendorFilterOptions() {
        const vendors = [...new Set(this.services.map(s => s.vendor_name))].sort();
        return vendors.map(vendor => `
            <option value="${vendor}">${vendor}</option>
        `).join('');
    }

    getServicesTemplate() {
        if (this.filteredServices.length === 0) {
            return `
                <div class="no-services">
                    <div class="no-data-icon">🔧</div>
                    <h4>No Services Found</h4>
                    <p>No services match your current search or filter criteria.</p>
                    <button class="btn-primary add-first-service-btn">Add Your First Service</button>
                </div>
            `;
        }

        return this.options.groupByVendor ?
            this.getGroupedServicesTemplate() :
            this.getListServicesTemplate();
    }

    getGroupedServicesTemplate() {
        const groupedServices = this.groupServicesByVendor();

        return Object.entries(groupedServices).map(([vendorName, services]) => `
            <div class="vendor-service-group">
                <div class="vendor-group-header">
                    <h4 class="vendor-group-title">
                        🏭 ${vendorName}
                        <span class="service-count-badge">${services.length} service${services.length !== 1 ? 's' : ''}</span>
                    </h4>
                    <div class="vendor-group-actions">
                        <button class="btn-small btn-primary add-service-to-vendor-btn" 
                                data-vendor-name="${vendorName}">
                            ➕ Add Service
                        </button>
                        <button class="btn-small btn-secondary collapse-vendor-btn" 
                                data-vendor-name="${vendorName}">
                            📁 Collapse
                        </button>
                    </div>
                </div>
                
                <div class="vendor-services-list" data-vendor="${vendorName}">
                    ${services.map(service => this.getServiceItemTemplate(service)).join('')}
                </div>
            </div>
        `).join('');
    }

    getListServicesTemplate() {
        return `
            <div class="services-list">
                ${this.filteredServices.map(service => this.getServiceItemTemplate(service)).join('')}
            </div>
        `;
    }

    getServiceItemTemplate(service) {
        const isAvailable = service.is_available !== 0;

        return `
            <div class="service-item ${!isAvailable ? 'unavailable' : ''}" 
                 data-service-id="${service.service_id}">
                
                <div class="service-header">
                    <div class="service-name">
                        <h5>${this.escapeHtml(service.service_name)}</h5>
                        ${!this.options.groupByVendor ? `
                            <span class="service-vendor">${service.vendor_name}</span>
                        ` : ''}
                    </div>
                    
                    <div class="service-status">
                        ${this.options.showAvailabilityStatus ? `
                            <span class="availability-badge ${isAvailable ? 'available' : 'unavailable'}">
                                ${isAvailable ? '✅ Available' : '❌ Unavailable'}
                            </span>
                        ` : ''}
                        <span class="service-id">ID: ${service.service_id}</span>
                    </div>
                </div>
                
                ${service.description ? `
                    <div class="service-description">
                        ${this.escapeHtml(service.description)}
                    </div>
                ` : ''}
                
                <div class="service-metadata">
                    <div class="metadata-item">
                        <strong>📅 Created:</strong> ${this.formatDate(service.created_date)}
                    </div>
                    <div class="metadata-item">
                        <strong>🆔 Vendor ID:</strong> ${service.vendor_id}
                    </div>
                </div>
                
                ${this.options.showActions ? this.getServiceActionsTemplate(service, isAvailable) : ''}
            </div>
        `;
    }

    getServiceActionsTemplate(service, isAvailable) {
        return `
            <div class="service-actions">
                <button class="btn-small btn-primary edit-service-btn" 
                        data-service-id="${service.service_id}">
                    ✏️ Edit
                </button>
                <button class="btn-small btn-success purchase-credits-btn" 
                        data-vendor-id="${service.vendor_id}"
                        data-service-name="${service.service_name}">
                    💸 Buy Credits
                </button>
                <button class="btn-small btn-info view-balances-btn" 
                        data-vendor-id="${service.vendor_id}"
                        data-service-name="${service.service_name}">
                    💳 View Balance
                </button>
                
                <div class="service-more-actions">
                    <button class="btn-small btn-secondary more-actions-btn">⋯</button>
                    <div class="actions-dropdown">
                        <button class="dropdown-item" data-action="duplicate" 
                                data-service-id="${service.service_id}">
                            📋 Duplicate
                        </button>
                        <button class="dropdown-item" data-action="export" 
                                data-service-id="${service.service_id}">
                            📊 Export
                        </button>
                        <hr>
                        <button class="dropdown-item ${isAvailable ? 'warning' : 'success'}" 
                                data-action="${isAvailable ? 'disable' : 'enable'}" 
                                data-service-id="${service.service_id}">
                            ${isAvailable ? '❌ Disable' : '✅ Enable'}
                        </button>
                        <button class="dropdown-item danger" data-action="delete" 
                                data-service-id="${service.service_id}">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Search functionality
        const searchInput = this.$('.service-search-input');
        if (searchInput) {
            this.addEventListener(searchInput, 'input', (e) => this.handleSearch(e.target.value));
        }

        // Clear search
        const clearBtn = this.$('.search-clear-btn');
        if (clearBtn) {
            this.addEventListener(clearBtn, 'click', () => this.clearSearch());
        }

        // Vendor filter
        const vendorFilter = this.$('.vendor-filter-select');
        if (vendorFilter) {
            this.addEventListener(vendorFilter, 'change', (e) => this.setVendorFilter(e.target.value));
        }

        // View toggles
        this.$$('.view-toggle').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const view = e.target.getAttribute('data-view');
                this.setViewMode(view);
            });
        });

        // Action buttons
        this.bindActionButtons();
        this.bindServiceActions();
    }

    bindActionButtons() {
        const addBtn = this.$('.add-service-btn');
        if (addBtn) {
            this.addEventListener(addBtn, 'click', () => this.handleAddService());
        }

        const exportBtn = this.$('.export-services-btn');
        if (exportBtn) {
            this.addEventListener(exportBtn, 'click', () => this.handleExport());
        }

        const refreshBtn = this.$('.refresh-services-btn');
        if (refreshBtn) {
            this.addEventListener(refreshBtn, 'click', () => this.refresh());
        }

        // Vendor group actions
        this.$$('.add-service-to-vendor-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const vendorName = e.target.getAttribute('data-vendor-name');
                this.handleAddServiceToVendor(vendorName);
            });
        });

        this.$$('.collapse-vendor-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const vendorName = e.target.getAttribute('data-vendor-name');
                this.toggleVendorGroup(vendorName);
            });
        });
    }

    bindServiceActions() {
        // Edit buttons
        this.$$('.edit-service-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const serviceId = e.target.getAttribute('data-service-id');
                this.handleEditService(serviceId);
            });
        });

        // Purchase credits buttons
        this.$$('.purchase-credits-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const vendorId = e.target.getAttribute('data-vendor-id');
                const serviceName = e.target.getAttribute('data-service-name');
                this.handlePurchaseCredits(vendorId, serviceName);
            });
        });

        // View balances buttons
        this.$$('.view-balances-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const vendorId = e.target.getAttribute('data-vendor-id');
                const serviceName = e.target.getAttribute('data-service-name');
                this.handleViewBalances(vendorId, serviceName);
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
                const serviceId = e.target.getAttribute('data-service-id');
                this.handleDropdownAction(action, serviceId);
            });
        });

        // Click outside to close dropdowns
        this.addEventListener(document, 'click', (e) => {
            if (!e.target.closest('.service-more-actions')) {
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
        const searchInput = this.$('.service-search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        this.applyFilters();
    }

    setVendorFilter(vendorName) {
        this.selectedVendorId = vendorName;
        this.applyFilters();
    }

    setViewMode(viewMode) {
        this.options.groupByVendor = viewMode === 'grouped';

        // Update toggle buttons
        this.$$('.view-toggle').forEach(btn => btn.classList.remove('active'));
        this.$(`[data-view="${viewMode}"]`).classList.add('active');

        this.updateDisplay();
    }

    applyFilters() {
        let filtered = [...this.services];

        // Apply search filter
        if (this.searchTerm.trim()) {
            filtered = filtered.filter(service => {
                const searchFields = [
                    service.service_name || '',
                    service.vendor_name || '',
                    service.description || '',
                    service.service_id || ''
                ].map(field => field.toLowerCase());

                return searchFields.some(field => field.includes(this.searchTerm));
            });
        }

        // Apply vendor filter
        if (this.selectedVendorId) {
            filtered = filtered.filter(service => service.vendor_name === this.selectedVendorId);
        }

        this.filteredServices = filtered;
        this.updateDisplay();
    }

    async updateDisplay() {
        const container = this.$('.services-container');
        const countEl = this.$('.service-count');

        if (container) {
            container.innerHTML = this.getServicesTemplate();
            this.bindServiceActions(); // Re-bind events after DOM update
        }

        if (countEl) {
            countEl.textContent = this.filteredServices.length;
        }
    }

    groupServicesByVendor() {
        const grouped = {};
        this.filteredServices.forEach(service => {
            const vendorName = service.vendor_name || 'Unknown Vendor';
            if (!grouped[vendorName]) {
                grouped[vendorName] = [];
            }
            grouped[vendorName].push(service);
        });
        return grouped;
    }

    toggleVendorGroup(vendorName) {
        const servicesList = this.$(`[data-vendor="${vendorName}"]`);
        const button = this.$(`[data-vendor-name="${vendorName}"]`);

        if (servicesList && button) {
            const isCollapsed = servicesList.style.display === 'none';
            servicesList.style.display = isCollapsed ? 'block' : 'none';
            button.textContent = isCollapsed ? '📁 Collapse' : '📂 Expand';
        }
    }

    // Action handlers
    handleAddService() {
        this.emit('addServiceRequested');
        console.log('Add service requested');
    }

    handleAddServiceToVendor(vendorName) {
        this.emit('addServiceToVendorRequested', { vendorName });
        console.log('Add service to vendor requested:', vendorName);
    }

    handleEditService(serviceId) {
        this.emit('editServiceRequested', { serviceId });
        console.log('Edit service:', serviceId);
    }

    handlePurchaseCredits(vendorId, serviceName) {
        this.emit('purchaseCreditsRequested', { vendorId, serviceName });
        console.log('Purchase credits requested:', { vendorId, serviceName });
    }

    handleViewBalances(vendorId, serviceName) {
        this.emit('viewBalancesRequested', { vendorId, serviceName });
        console.log('View balances requested:', { vendorId, serviceName });
    }

    handleDropdownAction(action, serviceId) {
        switch (action) {
            case 'duplicate':
                this.handleDuplicateService(serviceId);
                break;
            case 'export':
                this.handleExportService(serviceId);
                break;
            case 'enable':
            case 'disable':
                this.handleToggleServiceStatus(serviceId, action === 'enable');
                break;
            case 'delete':
                this.handleDeleteService(serviceId);
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

    handleDuplicateService(serviceId) {
        const service = this.services.find(s => s.service_id === serviceId);
        if (service) {
            const duplicateData = {
                vendorID: service.vendor_id,
                serviceName: `${service.service_name} (Copy)`,
                description: service.description
            };
            this.emit('duplicateServiceRequested', { serviceData: duplicateData });
        }
    }

    handleExportService(serviceId) {
        const service = this.services.find(s => s.service_id === serviceId);
        if (service) {
            const csvData = this.exportServiceToCSV(service);
            this.downloadCSV(csvData, `service-${service.service_name.replace(/\s+/g, '-')}.csv`);
        }
    }

    async handleToggleServiceStatus(serviceId, enable) {
        try {
            const service = this.services.find(s => s.service_id === serviceId);
            if (!service) return;

            const response = await fetch(`/api/vendor-services/${serviceId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_available: enable ? 1 : 0 })
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Failed to update service status');
            }

            // Update local data
            service.is_available = enable ? 1 : 0;
            this.applyFilters();

            this.showSuccessMessage(`Service ${enable ? 'enabled' : 'disabled'} successfully`);
        } catch (error) {
            this.showErrorMessage(error.message);
        }
    }

    async handleDeleteService(serviceId) {
        const service = this.services.find(s => s.service_id === serviceId);
        if (!service) return;

        const modal = WidgetManager.getWidget('confirmation-modal');
        if (modal) {
            modal.confirmDelete(`${service.vendor_name} - ${service.service_name}`, async () => {
                try {
                    const response = await fetch(`/api/vendor-services/${serviceId}`, {
                        method: 'DELETE'
                    });

                    if (!response.ok) {
                        const result = await response.json();
                        throw new Error(result.error || 'Failed to delete service');
                    }

                    // Remove from local data
                    this.services = this.services.filter(s => s.service_id !== serviceId);
                    this.applyFilters();

                    this.showSuccessMessage('Service deleted successfully');
                } catch (error) {
                    this.showErrorMessage(error.message);
                }
            });
        }
    }

    handleExport() {
        const csvData = this.exportToCSV();
        this.downloadCSV(csvData, 'vendor-services.csv');
    }

    exportToCSV() {
        const headers = ['Service ID', 'Service Name', 'Vendor Name', 'Vendor ID', 'Description', 'Status', 'Created Date'];
        const rows = this.filteredServices.map(service => [
            service.service_id,
            service.service_name,
            service.vendor_name,
            service.vendor_id,
            service.description || '',
            service.is_available ? 'Available' : 'Unavailable',
            service.created_date
        ]);

        return [headers, ...rows].map(row =>
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
    }

    exportServiceToCSV(service) {
        const headers = ['Field', 'Value'];
        const rows = [
            ['Service ID', service.service_id],
            ['Service Name', service.service_name],
            ['Vendor Name', service.vendor_name],
            ['Vendor ID', service.vendor_id],
            ['Description', service.description || ''],
            ['Status', service.is_available ? 'Available' : 'Unavailable'],
            ['Created Date', service.created_date]
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
    }

    showErrorMessage(message) {
        console.error('Error:', message);
    }

    // Public API
    async refresh() {
        await this.loadData();
        this.applyFilters();
    }

    searchServices(query) {
        this.handleSearch(query);
    }

    filterByVendor(vendorName) {
        this.setVendorFilter(vendorName);
    }
}

window.VendorServiceCatalogWidget = VendorServiceCatalogWidget;
