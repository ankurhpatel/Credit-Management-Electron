class TabContainerWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.tabs = new Map();
        this.activeTab = null;
        this.tabOrder = [];
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showTabIcons: true,
            allowTabClose: false,
            showTabCount: true,
            maxTabs: 10,
            tabPosition: 'top',
            animated: true
        };
    }

    async getTemplate() {
        return `
            <div class="tab-container ${this.options.tabPosition}">
                <div class="tab-navigation">
                    <div class="tab-list">
                        <!-- Tabs will be dynamically added here -->
                    </div>
                    <div class="tab-controls">
                        <button class="tab-control-btn refresh-tab-btn" title="Refresh Current Tab">
                            🔄
                        </button>
                        ${this.options.allowTabClose ? `
                            <button class="tab-control-btn close-tab-btn" title="Close Current Tab">
                                ✕
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                <div class="tab-content-area">
                    <div class="tab-content-wrapper" id="tab-content-wrapper">
                        <div class="tab-loading">
                            <div class="loading-spinner"></div>
                            <p>Loading tab content...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Tab controls
        const refreshBtn = this.$('.refresh-tab-btn');
        if (refreshBtn) {
            this.addEventListener(refreshBtn, 'click', () => this.refreshCurrentTab());
        }

        const closeBtn = this.$('.close-tab-btn');
        if (closeBtn) {
            this.addEventListener(closeBtn, 'click', () => this.closeCurrentTab());
        }

        // Keyboard shortcuts for tab navigation
        this.addEventListener(document, 'keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                // Ctrl+Tab / Ctrl+Shift+Tab for tab switching
                if (e.key === 'Tab') {
                    e.preventDefault();
                    this.switchTab(e.shiftKey ? 'previous' : 'next');
                }
                // Ctrl+W to close tab
                else if (e.key === 'w' && this.options.allowTabClose) {
                    e.preventDefault();
                    this.closeCurrentTab();
                }
            }
        });
    }

    // Tab management methods
    addTab(tabId, tabConfig) {
        if (this.tabs.has(tabId)) {
            console.warn(`Tab ${tabId} already exists`);
            return false;
        }

        if (this.tabs.size >= this.options.maxTabs) {
            console.warn(`Maximum number of tabs (${this.options.maxTabs}) reached`);
            return false;
        }

        const tab = {
            id: tabId,
            title: tabConfig.title || tabId,
            icon: tabConfig.icon || '📄',
            widget: tabConfig.widget || null,
            widgetClass: tabConfig.widgetClass || null,
            widgetOptions: tabConfig.widgetOptions || {},
            content: tabConfig.content || '',
            active: false,
            loaded: false,
            closable: tabConfig.closable !== false,
            ...tabConfig
        };

        this.tabs.set(tabId, tab);
        this.tabOrder.push(tabId);

        this.renderTabNavigation();

        // Auto-activate if it's the first tab or explicitly requested
        if (this.tabs.size === 1 || tabConfig.activate) {
            this.activateTab(tabId);
        }

        this.emit('tabAdded', { tabId, tab });
        return true;
    }

    removeTab(tabId) {
        if (!this.tabs.has(tabId)) {
            console.warn(`Tab ${tabId} does not exist`);
            return false;
        }

        const tab = this.tabs.get(tabId);

        // Don't close non-closable tabs
        if (!tab.closable) {
            console.warn(`Tab ${tabId} is not closable`);
            return false;
        }

        // If removing active tab, switch to another tab first
        if (this.activeTab === tabId) {
            const currentIndex = this.tabOrder.indexOf(tabId);
            const nextTab = this.tabOrder[currentIndex + 1] || this.tabOrder[currentIndex - 1];

            if (nextTab) {
                this.activateTab(nextTab);
            } else {
                this.activeTab = null;
            }
        }

        // Clean up tab widget if exists
        if (tab.widget && typeof tab.widget.destroy === 'function') {
            tab.widget.destroy();
        }

        this.tabs.delete(tabId);
        this.tabOrder = this.tabOrder.filter(id => id !== tabId);

        this.renderTabNavigation();
        this.emit('tabRemoved', { tabId, tab });

        return true;
    }

    activateTab(tabId) {
        if (!this.tabs.has(tabId)) {
            console.error(`Tab ${tabId} does not exist`);
            return false;
        }

        // Deactivate current tab
        if (this.activeTab) {
            const currentTab = this.tabs.get(this.activeTab);
            if (currentTab) {
                currentTab.active = false;
                // Hide current tab widget if it exists
                if (currentTab.widget && typeof currentTab.widget.hide === 'function') {
                    currentTab.widget.hide();
                }
            }
        }

        // Activate new tab
        const newTab = this.tabs.get(tabId);
        newTab.active = true;
        this.activeTab = tabId;

        // Render tab navigation to update active states
        this.renderTabNavigation();

        // Load and show tab content
        this.loadTabContent(tabId);

        this.emit('tabActivated', { tabId, tab: newTab });
        return true;
    }

    async loadTabContent(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        // Get the content wrapper - use the specific ID we created
        const contentWrapper = document.getElementById('tab-content-wrapper') ||
            this.$('.tab-content-wrapper');

        if (!contentWrapper) {
            console.error('Tab content wrapper not found');
            return;
        }

        try {
            // Show loading state
            contentWrapper.innerHTML = `
                <div class="tab-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading ${tab.title}...</p>
                </div>
            `;

            // If tab has a widget class but no widget instance, create it
            if (tab.widgetClass && !tab.widget) {
                const WidgetClass = window[tab.widgetClass];
                if (WidgetClass) {
                    console.log(`Creating widget ${tab.widgetClass} for tab ${tabId}`);

                    // Create a container for this specific tab widget
                    const widgetContainer = document.createElement('div');
                    widgetContainer.id = `tab-${tabId}-content`;
                    widgetContainer.className = 'tab-widget-container';
                    contentWrapper.appendChild(widgetContainer);

                    // Create and initialize the widget
                    tab.widget = new WidgetClass(widgetContainer.id, tab.widgetOptions || {});
                    await tab.widget.initialize();
                } else {
                    throw new Error(`Widget class ${tab.widgetClass} not found`);
                }
            }

            // Show the widget or content
            if (tab.widget) {
                // Clear loading state
                if (contentWrapper.querySelector('.tab-loading')) {
                    contentWrapper.innerHTML = `<div id="tab-${tabId}-content" class="tab-widget-container"></div>`;
                }

                if (typeof tab.widget.show === 'function') {
                    tab.widget.show();
                }
            } else if (tab.content) {
                contentWrapper.innerHTML = tab.content;
            } else {
                contentWrapper.innerHTML = `
                    <div class="empty-tab">
                        <div class="empty-icon">📄</div>
                        <h3>Tab Content</h3>
                        <p>This tab doesn't have any content configured yet.</p>
                    </div>
                `;
            }

            tab.loaded = true;
            this.emit('tabLoaded', { tabId, tab });

        } catch (error) {
            console.error(`Failed to load tab ${tabId}:`, error);
            contentWrapper.innerHTML = `
                <div class="tab-error">
                    <div class="error-icon">❌</div>
                    <h4>Failed to Load Tab</h4>
                    <p>${error.message}</p>
                    <button class="btn-secondary retry-tab-btn" data-tab-id="${tabId}">
                        🔄 Retry
                    </button>
                </div>
            `;

            // Bind retry button
            const retryBtn = this.$('.retry-tab-btn');
            if (retryBtn) {
                this.addEventListener(retryBtn, 'click', () => this.loadTabContent(tabId));
            }

            this.emit('tabError', { tabId, tab, error });
        }
    }

    renderTabNavigation() {
        const tabList = this.$('.tab-list');
        if (!tabList) return;

        tabList.innerHTML = this.tabOrder.map(tabId => {
            const tab = this.tabs.get(tabId);
            return this.getTabTemplate(tab);
        }).join('');

        // Bind tab click events
        this.$$('.tab-item').forEach(tabElement => {
            const tabId = tabElement.getAttribute('data-tab-id');
            this.addEventListener(tabElement, 'click', () => this.activateTab(tabId));

            // Bind close button if tab is closable
            const closeBtn = tabElement.querySelector('.tab-close-btn');
            if (closeBtn) {
                this.addEventListener(closeBtn, 'click', (e) => {
                    e.stopPropagation();
                    this.removeTab(tabId);
                });
            }
        });
    }

    getTabTemplate(tab) {
        return `
            <div class="tab-item ${tab.active ? 'active' : ''} ${!tab.loaded ? 'loading' : ''}" 
                 data-tab-id="${tab.id}"
                 title="${this.escapeHtml(tab.title)}">
                ${this.options.showTabIcons ? `
                    <span class="tab-icon">${tab.icon}</span>
                ` : ''}
                <span class="tab-title">${this.escapeHtml(tab.title)}</span>
                ${this.options.showTabCount && tab.count ? `
                    <span class="tab-count">${tab.count}</span>
                ` : ''}
                ${tab.closable && this.options.allowTabClose ? `
                    <button class="tab-close-btn" title="Close tab">×</button>
                ` : ''}
                ${!tab.loaded ? `<div class="tab-loading-indicator"></div>` : ''}
            </div>
        `;
    }

    // Navigation methods
    switchTab(direction) {
        if (this.tabOrder.length <= 1) return;

        const currentIndex = this.tabOrder.indexOf(this.activeTab);
        let newIndex;

        if (direction === 'next') {
            newIndex = (currentIndex + 1) % this.tabOrder.length;
        } else {
            newIndex = currentIndex === 0 ? this.tabOrder.length - 1 : currentIndex - 1;
        }

        const newTabId = this.tabOrder[newIndex];
        this.activateTab(newTabId);
    }

    refreshCurrentTab() {
        if (!this.activeTab) return;

        const tab = this.tabs.get(this.activeTab);
        if (!tab) return;

        // Mark tab as not loaded to force reload
        tab.loaded = false;

        // If tab has a widget with refresh method, call it
        if (tab.widget && typeof tab.widget.refresh === 'function') {
            tab.widget.refresh();
        } else {
            // Otherwise reload the tab content
            this.loadTabContent(this.activeTab);
        }

        this.emit('tabRefreshed', { tabId: this.activeTab, tab });
    }

    closeCurrentTab() {
        if (this.activeTab && this.options.allowTabClose) {
            this.removeTab(this.activeTab);
        }
    }

    // Utility methods
    updateTabTitle(tabId, newTitle) {
        const tab = this.tabs.get(tabId);
        if (tab) {
            tab.title = newTitle;
            this.renderTabNavigation();
        }
    }

    updateTabCount(tabId, count) {
        const tab = this.tabs.get(tabId);
        if (tab) {
            tab.count = count;
            this.renderTabNavigation();
        }
    }

    updateTabIcon(tabId, icon) {
        const tab = this.tabs.get(tabId);
        if (tab) {
            tab.icon = icon;
            this.renderTabNavigation();
        }
    }

    // Public API methods
    getActiveTab() {
        return this.activeTab;
    }

    getTab(tabId) {
        return this.tabs.get(tabId);
    }

    getAllTabs() {
        return Array.from(this.tabs.values());
    }

    getTabOrder() {
        return [...this.tabOrder];
    }

    hasTab(tabId) {
        return this.tabs.has(tabId);
    }

    getTabCount() {
        return this.tabs.size;
    }

    // State management
    getState() {
        return {
            activeTab: this.activeTab,
            tabOrder: [...this.tabOrder],
            tabs: Array.from(this.tabs.entries()).map(([id, tab]) => ({
                id,
                title: tab.title,
                icon: tab.icon,
                loaded: tab.loaded,
                closable: tab.closable
            }))
        };
    }

    restoreState(state) {
        // Clear current tabs
        this.tabs.clear();
        this.tabOrder = [];
        this.activeTab = null;

        // Restore tabs (without widgets - those need to be re-added)
        state.tabs.forEach(tabInfo => {
            this.tabs.set(tabInfo.id, {
                ...tabInfo,
                active: false,
                widget: null,
                loaded: false
            });
        });

        this.tabOrder = [...state.tabOrder];

        // Restore active tab
        if (state.activeTab && this.tabs.has(state.activeTab)) {
            this.activateTab(state.activeTab);
        }

        this.renderTabNavigation();
    }

    destroy() {
        // Clean up all tab widgets
        this.tabs.forEach(tab => {
            if (tab.widget && typeof tab.widget.destroy === 'function') {
                tab.widget.destroy();
            }
        });

        this.tabs.clear();
        this.tabOrder = [];
        this.activeTab = null;

        super.destroy();
    }
}

window.TabContainerWidget = TabContainerWidget;
