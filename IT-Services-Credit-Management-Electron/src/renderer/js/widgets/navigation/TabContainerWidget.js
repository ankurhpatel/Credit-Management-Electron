class TabContainerWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.tabs = new Map();
        this.activeTabId = null;
        this.tabWidgets = new Map();
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showTabIcons: true,
            allowTabClose: false,
            animated: true,
            defaultTab: 'dashboard'
        };
    }

    async getTemplate() {
        return `
            <div class="tab-container">
                <div class="tab-header">
                    <div class="tab-nav" id="tab-nav">
                        <!-- Tab navigation buttons will be inserted here -->
                    </div>
                </div>
                
                <div class="tab-content-area">
                    <div class="tab-content" id="tab-content">
                        <!-- Tab content will be rendered here -->
                    </div>
                </div>
            </div>
        `;
    }

    async onAfterRender() {
        this.tabNavElement = this.$('#tab-nav');
        this.tabContentElement = this.$('#tab-content');

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Handle tab clicks
        this.tabNavElement.addEventListener('click', (e) => {
            const tabButton = e.target.closest('.tab-button');
            if (tabButton) {
                const tabId = tabButton.dataset.tabId;
                this.activateTab(tabId);
            }
        });
    }

    addTab(tabId, config) {
        const tabConfig = {
            id: tabId,
            title: config.title || tabId,
            icon: config.icon || '📄',
            widgetClass: config.widgetClass || null,
            closable: config.closable !== undefined ? config.closable : this.options.allowTabClose,
            content: config.content || '',
            ...config
        };

        this.tabs.set(tabId, tabConfig);
        this.renderTabButton(tabConfig);

        this.log(`Tab added: ${tabId}`);
        return true;
    }

    removeTab(tabId) {
        if (!this.tabs.has(tabId)) {
            return false;
        }

        // Remove tab widget if it exists
        const widget = this.tabWidgets.get(tabId);
        if (widget && typeof widget.destroy === 'function') {
            widget.destroy();
        }
        this.tabWidgets.delete(tabId);

        // Remove from tabs collection
        this.tabs.delete(tabId);

        // Remove tab button
        const tabButton = this.tabNavElement.querySelector(`[data-tab-id="${tabId}"]`);
        if (tabButton) {
            tabButton.remove();
        }

        // If this was the active tab, activate another one
        if (this.activeTabId === tabId) {
            const remainingTabs = Array.from(this.tabs.keys());
            if (remainingTabs.length > 0) {
                this.activateTab(remainingTabs[0]);
            } else {
                this.activeTabId = null;
                this.tabContentElement.innerHTML = '<div class="no-tabs">No tabs available</div>';
            }
        }

        this.log(`Tab removed: ${tabId}`);
        return true;
    }

    hasTab(tabId) {
        return this.tabs.has(tabId);
    }

    getTab(tabId) {
        const config = this.tabs.get(tabId);
        if (!config) return null;

        return {
            ...config,
            widget: this.tabWidgets.get(tabId)
        };
    }

    async activateTab(tabId) {
        if (!this.tabs.has(tabId)) {
            this.log(`Tab ${tabId} does not exist`, 'error');
            return false;
        }

        const previousTabId = this.activeTabId;
        this.activeTabId = tabId;

        // Update tab button states
        this.updateTabButtonStates();

        // Load tab content
        await this.loadTabContent(tabId);

        // Emit tab activation event
        this.emit('tabActivated', {
            tabId: tabId,
            previousTabId: previousTabId
        });

        this.log(`Tab activated: ${tabId}`);
        return true;
    }

    renderTabButton(tabConfig) {
        const button = document.createElement('button');
        button.className = 'tab-button';
        button.dataset.tabId = tabConfig.id;

        const icon = this.options.showTabIcons && tabConfig.icon ?
            `<span class="tab-icon">${tabConfig.icon}</span>` : '';

        const closeButton = tabConfig.closable ?
            `<span class="tab-close" data-tab-id="${tabConfig.id}">×</span>` : '';

        button.innerHTML = `
            ${icon}
            <span class="tab-title">${tabConfig.title}</span>
            ${closeButton}
        `;

        this.tabNavElement.appendChild(button);

        // Handle close button if present
        if (tabConfig.closable) {
            const closeBtn = button.querySelector('.tab-close');
            closeBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeTab(tabConfig.id);
            });
        }
    }

    updateTabButtonStates() {
        this.tabNavElement.querySelectorAll('.tab-button').forEach(button => {
            const tabId = button.dataset.tabId;
            button.classList.toggle('active', tabId === this.activeTabId);
        });
    }

    async loadTabContent(tabId) {
        const tabConfig = this.tabs.get(tabId);
        if (!tabConfig) return;

        try {
            // Show loading state
            this.tabContentElement.innerHTML = '<div class="tab-loading">Loading...</div>';

            // Check if widget already exists
            let widget = this.tabWidgets.get(tabId);

            if (!widget && tabConfig.widgetClass) {
                // Create new widget instance
                const WidgetClass = window[tabConfig.widgetClass];
                if (!WidgetClass) {
                    throw new Error(`Widget class ${tabConfig.widgetClass} not found`);
                }

                // Create a container for this tab's content
                const tabContentId = `tab-content-${tabId}`;
                this.tabContentElement.innerHTML = `<div id="${tabContentId}"></div>`;

                widget = new WidgetClass(tabContentId, tabConfig.options || {});
                await widget.initialize();

                this.tabWidgets.set(tabId, widget);
                this.log(`Widget created for tab ${tabId}: ${tabConfig.widgetClass}`);
            } else if (tabConfig.content) {
                // Static content
                this.tabContentElement.innerHTML = tabConfig.content;
            }

            // Show/hide tab content based on active state
            this.updateTabContentVisibility();

        } catch (error) {
            this.handleError(`Failed to load tab ${tabId}`, error);
            this.tabContentElement.innerHTML = `
                <div class="tab-error">
                    <h3>Error Loading Tab</h3>
                    <p>Failed to load ${tabConfig.title}</p>
                    <button class="btn-retry" onclick="window.WidgetManager.showTab('${tabId}')">Retry</button>
                </div>
            `;
        }
    }

    updateTabContentVisibility() {
        // Hide all tab contents
        this.tabContentElement.querySelectorAll('[id^="tab-content-"]').forEach(content => {
            content.style.display = 'none';
        });

        // Show active tab content
        if (this.activeTabId) {
            const activeContent = this.tabContentElement.querySelector(`#tab-content-${this.activeTabId}`);
            if (activeContent) {
                activeContent.style.display = 'block';
            }
        }
    }

    getTabCount() {
        return this.tabs.size;
    }

    getState() {
        return {
            activeTabId: this.activeTabId,
            tabs: Array.from(this.tabs.keys())
        };
    }

    async restoreState(state) {
        if (state.activeTabId && this.tabs.has(state.activeTabId)) {
            await this.activateTab(state.activeTabId);
        }
    }

    destroy() {
        // Destroy all tab widgets
        this.tabWidgets.forEach((widget, tabId) => {
            if (typeof widget.destroy === 'function') {
                widget.destroy();
            }
        });

        this.tabWidgets.clear();
        this.tabs.clear();
        super.destroy();
    }
}

window.TabContainerWidget = TabContainerWidget;
