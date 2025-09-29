class BaseWidget {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = { ...this.getDefaultOptions(), ...options };
        this.container = null;
        this.isInitialized = false;
        this.isDestroyed = false;
        this.eventListeners = new Map();
        this.childWidgets = new Map();
        this.refreshTimer = null;

        // Bind methods to preserve 'this' context
        this.refresh = this.refresh.bind(this);
        this.destroy = this.destroy.bind(this);
    }

    getDefaultOptions() {
        return {
            autoRender: true,
            debug: false,
            className: '',
            timeout: 10000
        };
    }

    // Lifecycle Methods
    async initialize() {
        try {
            this.log('Initializing widget...');

            this.container = this.getContainer();
            if (!this.container) {
                throw new Error(`Container element '${this.containerId}' not found`);
            }

            // Add widget class for styling
            this.container.classList.add('widget');
            if (this.options.className) {
                this.container.classList.add(this.options.className);
            }

            // Load data first
            await this.loadData();

            // Render if auto-render is enabled
            if (this.options.autoRender) {
                await this.render();
            }

            this.isInitialized = true;
            this.log('Widget initialized successfully');

            return true;
        } catch (error) {
            this.handleError('Failed to initialize widget', error);
            throw error;
        }
    }

    async loadData() {
        // Override in subclasses to load widget data
        this.log('Loading data...');
    }

    async render() {
        try {
            if (this.isDestroyed) {
                this.log('Widget is destroyed, skipping render');
                return;
            }

            this.log('Rendering widget...');

            // Get template content
            const template = await this.getTemplate();

            // Update container content
            if (this.container) {
                this.container.innerHTML = template;

                // Call post-render hook
                await this.onAfterRender();

                this.log('Widget rendered successfully');
            }

        } catch (error) {
            this.handleError('Failed to render widget', error);
            this.renderError(error);
        }
    }

    async getTemplate() {
        // Override in subclasses to return HTML template
        return '<div class="widget-placeholder">Widget content not implemented</div>';
    }

    async onAfterRender() {
        // Override in subclasses for post-render logic
        this.log('Post-render hook called');
    }

    async refresh() {
        try {
            this.log('Refreshing widget...');

            if (!this.isInitialized || this.isDestroyed) {
                this.log('Widget not ready for refresh');
                return;
            }

            await this.loadData();
            await this.render();

            this.log('Widget refreshed successfully');
        } catch (error) {
            this.handleError('Failed to refresh widget', error);
        }
    }

    // DOM Helper Methods
    getContainer() {
        if (typeof this.containerId === 'string') {
            return document.getElementById(this.containerId);
        }
        return this.containerId; // Assume it's already a DOM element
    }

    $(selector) {
        if (!this.container) return null;
        return this.container.querySelector(selector);
    }

    $$(selector) {
        if (!this.container) return [];
        return Array.from(this.container.querySelectorAll(selector));
    }

    createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);

        Object.keys(attributes).forEach(key => {
            if (key === 'className') {
                element.className = attributes[key];
            } else if (key === 'dataset') {
                Object.keys(attributes[key]).forEach(dataKey => {
                    element.dataset[dataKey] = attributes[key][dataKey];
                });
            } else {
                element.setAttribute(key, attributes[key]);
            }
        });

        if (content) {
            element.innerHTML = content;
        }

        return element;
    }

    // Event Methods
    addEventListener(element, event, handler, options = {}) {
        if (!element || !event || !handler) return;

        const wrappedHandler = (e) => {
            try {
                handler.call(this, e);
            } catch (error) {
                this.handleError(`Event handler error for ${event}`, error);
            }
        };

        element.addEventListener(event, wrappedHandler, options);

        // Store for cleanup
        const listenerId = `${event}_${Date.now()}_${Math.random()}`;
        this.eventListeners.set(listenerId, {
            element,
            event,
            handler: wrappedHandler,
            options
        });

        return listenerId;
    }

    removeEventListener(listenerId) {
        const listener = this.eventListeners.get(listenerId);
        if (listener) {
            listener.element.removeEventListener(listener.event, listener.handler, listener.options);
            this.eventListeners.delete(listenerId);
        }
    }

    emit(eventName, data = {}) {
        const event = new CustomEvent(`widget:${eventName}`, {
            detail: { widget: this, ...data }
        });

        if (this.container) {
            this.container.dispatchEvent(event);
        }

        document.dispatchEvent(event);
    }

    on(eventName, handler) {
        const wrappedHandler = (e) => {
            if (e.detail.widget === this) {
                handler.call(this, e.detail);
            }
        };

        document.addEventListener(`widget:${eventName}`, wrappedHandler);

        return this.addEventListener(document, `widget:${eventName}`, wrappedHandler);
    }

    // Child Widget Management
    addChildWidget(id, widget) {
        this.childWidgets.set(id, widget);
        this.log(`Child widget added: ${id}`);
    }

    removeChildWidget(id) {
        const widget = this.childWidgets.get(id);
        if (widget && typeof widget.destroy === 'function') {
            widget.destroy();
        }
        this.childWidgets.delete(id);
        this.log(`Child widget removed: ${id}`);
    }

    getChildWidget(id) {
        return this.childWidgets.get(id);
    }

    // Error Handling
    handleError(message, error) {
        const errorInfo = {
            widget: this.constructor.name,
            container: this.containerId,
            message: message,
            error: error?.message || error,
            stack: error?.stack,
            timestamp: new Date().toISOString()
        };

        console.error('🔴 Widget Error:', errorInfo);

        // Emit error event
        this.emit('error', errorInfo);
    }

    renderError(error) {
        if (!this.container) return;

        const errorMessage = error?.message || 'An unknown error occurred';
        this.container.innerHTML = `
            <div class="widget-error">
                <div class="error-icon">⚠️</div>
                <div class="error-content">
                    <h4>Widget Error</h4>
                    <p>${errorMessage}</p>
                    <button class="btn-retry" onclick="this.closest('.widget').widget?.refresh()">
                        🔄 Retry
                    </button>
                </div>
            </div>
        `;

        // Store widget reference for retry button
        this.container.widget = this;
    }

    // Utility Methods
    log(message, level = 'info') {
        if (this.options.debug) {
            const prefix = `[${this.constructor.name}]`;
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

    formatCurrency(amount, currency = 'USD') {
        const safeAmount = parseFloat(amount) || 0;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(safeAmount);
    }

    formatNumber(number) {
        const safeNumber = parseFloat(number) || 0;
        return new Intl.NumberFormat('en-US').format(safeNumber);
    }

    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };

        const formatOptions = { ...defaultOptions, ...options };
        const dateObj = date instanceof Date ? date : new Date(date);

        return dateObj.toLocaleDateString('en-US', formatOptions);
    }

    formatDateTime(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };

        const formatOptions = { ...defaultOptions, ...options };
        const dateObj = date instanceof Date ? date : new Date(date);

        return dateObj.toLocaleString('en-US', formatOptions);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // State Management
    getState() {
        return {
            isInitialized: this.isInitialized,
            isDestroyed: this.isDestroyed,
            options: this.options
        };
    }

    setState(newState) {
        Object.assign(this, newState);
        this.log('State updated');
    }

    // Cleanup
    destroy() {
        try {
            this.log('Destroying widget...');

            // Mark as destroyed
            this.isDestroyed = true;

            // Clear refresh timer
            if (this.refreshTimer) {
                clearInterval(this.refreshTimer);
                this.refreshTimer = null;
            }

            // Destroy child widgets
            this.childWidgets.forEach((widget, id) => {
                this.removeChildWidget(id);
            });

            // Remove all event listeners
            this.eventListeners.forEach((listener, id) => {
                this.removeEventListener(id);
            });

            // Clear container
            if (this.container) {
                this.container.innerHTML = '';
                this.container.classList.remove('widget');
                if (this.options.className) {
                    this.container.classList.remove(this.options.className);
                }
                this.container.widget = null;
            }

            // Emit destroyed event
            this.emit('destroyed');

            this.log('Widget destroyed successfully');

        } catch (error) {
            console.error('Error during widget destruction:', error);
        }
    }
}

// Make BaseWidget globally available
window.BaseWidget = BaseWidget;
