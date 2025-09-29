class WidgetManager {
    constructor() {
        this.widgets = new Map();
        this.widgetFactories = new Map();
        this.globalEventListeners = new Map();
        this.isDestroyed = false;

        this.log('WidgetManager initialized');
    }

    // Widget Registration and Management
    registerWidget(id, widget) {
        if (this.isDestroyed) {
            console.warn('WidgetManager is destroyed, cannot register widget');
            return false;
        }

        if (this.widgets.has(id)) {
            this.log(`Widget ${id} already exists, destroying old instance`);
            this.destroyWidget(id);
        }

        this.widgets.set(id, widget);
        this.log(`Widget registered: ${id} (${widget.constructor.name})`);

        // Listen for widget events
        this.setupWidgetEventListeners(id, widget);

        return true;
    }

    unregisterWidget(id) {
        const widget = this.widgets.get(id);
        if (widget) {
            this.widgets.delete(id);
            this.log(`Widget unregistered: ${id}`);
            return true;
        }
        return false;
    }

    getWidget(id) {
        return this.widgets.get(id) || null;
    }

    hasWidget(id) {
        return this.widgets.has(id);
    }

    getAllWidgets() {
        return Array.from(this.widgets.values());
    }

    getWidgetIds() {
        return Array.from(this.widgets.keys());
    }

    // Widget Factory Methods
    registerWidgetFactory(type, factory) {
        this.widgetFactories.set(type, factory);
        this.log(`Widget factory registered: ${type}`);
    }

    async createWidget(type, containerId, options = {}) {
        const factory = this.widgetFactories.get(type);
        if (!factory) {
            throw new Error(`No factory registered for widget type: ${type}`);
        }

        try {
            const widget = await factory(containerId, options);
            const widgetId = options.id || `${type}_${Date.now()}`;

            await widget.initialize();
            this.registerWidget(widgetId, widget);

            return { id: widgetId, widget };
        } catch (error) {
            this.log(`Failed to create widget ${type}: ${error.message}`, 'error');
            throw error;
        }
    }

    // Widget Lifecycle Methods
    async initializeWidget(id, widgetClass, containerId, options = {}) {
        try {
            if (!window[widgetClass]) {
                throw new Error(`Widget class ${widgetClass} not found`);
            }

            const WidgetClass = window[widgetClass];
            const widget = new WidgetClass(containerId, options);

            await widget.initialize();
            this.registerWidget(id, widget);

            this.log(`Widget initialized: ${id}`);
            return widget;
        } catch (error) {
            this.log(`Failed to initialize widget ${id}: ${error.message}`, 'error');
            throw error;
        }
    }

    async refreshWidget(id) {
        const widget = this.getWidget(id);
        if (!widget) {
            this.log(`Widget ${id} not found for refresh`, 'warn');
            return false;
        }

        try {
            if (typeof widget.refresh === 'function') {
                await widget.refresh();
                this.log(`Widget refreshed: ${id}`);
                return true;
            } else {
                this.log(`Widget ${id} does not support refresh`, 'warn');
                return false;
            }
        } catch (error) {
            this.log(`Failed to refresh widget ${id}: ${error.message}`, 'error');
            return false;
        }
    }

    async refreshAllWidgets() {
        const refreshPromises = this.getWidgetIds().map(id => this.refreshWidget(id));
        const results = await Promise.allSettled(refreshPromises);

        const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
        const total = results.length;

        this.log(`Refreshed ${successful}/${total} widgets`);
        return { successful, total, results };
    }

    destroyWidget(id) {
        const widget = this.getWidget(id);
        if (!widget) {
            this.log(`Widget ${id} not found for destruction`, 'warn');
            return false;
        }

        try {
            if (typeof widget.destroy === 'function') {
                widget.destroy();
            }

            this.unregisterWidget(id);
            this.log(`Widget destroyed: ${id}`);
            return true;
        } catch (error) {
            this.log(`Failed to destroy widget ${id}: ${error.message}`, 'error');
            return false;
        }
    }

    destroyAll() {
        const widgetIds = this.getWidgetIds();
        let destroyedCount = 0;

        widgetIds.forEach(id => {
            if (this.destroyWidget(id)) {
                destroyedCount++;
            }
        });

        this.log(`Destroyed ${destroyedCount}/${widgetIds.length} widgets`);
        return destroyedCount;
    }

    // Event Management
    setupWidgetEventListeners(id, widget) {
        // Listen for widget errors
        const errorHandler = (event) => {
            this.handleWidgetError(id, event.detail);
        };

        document.addEventListener(`widget:error`, errorHandler);

        // Store listener for cleanup
        this.globalEventListeners.set(`${id}_error`, {
            event: 'widget:error',
            handler: errorHandler
        });

        // Listen for widget destroyed events
        const destroyHandler = (event) => {
            if (event.detail.widget === widget) {
                this.unregisterWidget(id);
            }
        };

        document.addEventListener(`widget:destroyed`, destroyHandler);

        this.globalEventListeners.set(`${id}_destroyed`, {
            event: 'widget:destroyed',
            handler: destroyHandler
        });
    }

    handleWidgetError(widgetId, errorData) {
        this.log(`Widget error in ${widgetId}: ${errorData.message}`, 'error');

        // Emit global widget error event
        const event = new CustomEvent('widgetManager:error', {
            detail: {
                widgetId,
                errorData,
                timestamp: new Date().toISOString()
            }
        });

        document.dispatchEvent(event);
    }

    // Utility Methods
    async waitForWidget(id, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            const checkWidget = () => {
                if (this.hasWidget(id)) {
                    resolve(this.getWidget(id));
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Timeout waiting for widget: ${id}`));
                } else {
                    setTimeout(checkWidget, 100);
                }
            };

            checkWidget();
        });
    }

    findWidgetsByType(type) {
        return Array.from(this.widgets.entries())
            .filter(([id, widget]) => widget.constructor.name === type)
            .map(([id, widget]) => ({ id, widget }));
    }

    findWidgetsByContainer(containerId) {
        return Array.from(this.widgets.entries())
            .filter(([id, widget]) => widget.containerId === containerId)
            .map(([id, widget]) => ({ id, widget }));
    }

    getWidgetStats() {
        const stats = {
            total: this.widgets.size,
            types: {},
            initialized: 0,
            destroyed: 0
        };

        this.widgets.forEach((widget, id) => {
            const type = widget.constructor.name;
            stats.types[type] = (stats.types[type] || 0) + 1;

            if (widget.isInitialized) stats.initialized++;
            if (widget.isDestroyed) stats.destroyed++;
        });

        return stats;
    }

    // Debugging Methods
    debug() {
        const stats = this.getWidgetStats();

        console.group('🔧 WidgetManager Debug Info');
        console.log('Total widgets:', stats.total);
        console.log('Widget types:', stats.types);
        console.log('Initialized:', stats.initialized);
        console.log('Destroyed:', stats.destroyed);
        console.log('Widget IDs:', this.getWidgetIds());
        console.groupEnd();

        return stats;
    }

    listWidgets() {
        console.table(
            Array.from(this.widgets.entries()).map(([id, widget]) => ({
                id,
                type: widget.constructor.name,
                container: widget.containerId,
                initialized: widget.isInitialized,
                destroyed: widget.isDestroyed
            }))
        );
    }

    // State Management
    exportState() {
        const state = {
            widgets: {},
            timestamp: new Date().toISOString()
        };

        this.widgets.forEach((widget, id) => {
            if (typeof widget.getState === 'function') {
                state.widgets[id] = {
                    type: widget.constructor.name,
                    container: widget.containerId,
                    state: widget.getState()
                };
            }
        });

        return state;
    }

    async importState(state) {
        if (!state || !state.widgets) {
            throw new Error('Invalid state data');
        }

        const results = [];

        for (const [id, widgetData] of Object.entries(state.widgets)) {
            try {
                if (this.hasWidget(id)) {
                    const widget = this.getWidget(id);
                    if (typeof widget.setState === 'function') {
                        widget.setState(widgetData.state);
                    }
                }
                results.push({ id, success: true });
            } catch (error) {
                results.push({ id, success: false, error: error.message });
            }
        }

        return results;
    }

    // Cleanup
    destroy() {
        this.log('Destroying WidgetManager...');

        // Destroy all widgets
        this.destroyAll();

        // Remove global event listeners
        this.globalEventListeners.forEach((listener, key) => {
            document.removeEventListener(listener.event, listener.handler);
        });
        this.globalEventListeners.clear();

        // Clear factories
        this.widgetFactories.clear();

        // Mark as destroyed
        this.isDestroyed = true;

        this.log('WidgetManager destroyed');
    }

    // Logging
    log(message, level = 'info') {
        const prefix = '[WidgetManager]';
        switch (level) {
            case 'error':
                console.error(prefix, message);
                break;
            case 'warn':
                console.warn(prefix, message);
                break;
            default:
                console.log(prefix, message);
        }
    }
}

// Make WidgetManager globally available
window.WidgetManager = WidgetManager;
