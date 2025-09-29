// Base Widget class for all UI components
class BaseWidget {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.options = { ...this.getDefaultOptions(), ...options };
        this.isInitialized = false;
        this.eventListeners = [];
        this.childWidgets = [];
        this.data = {};

        if (!this.container) {
            console.warn(`Container element with ID "${containerId}" not found. Widget will be created without container.`);
        }

        // Auto-bind methods
        this.render = this.render.bind(this);
        this.destroy = this.destroy.bind(this);
        this.update = this.update.bind(this);
    }

    getDefaultOptions() {
        return {
            autoRender: true,
            cacheable: true,
            loadingIndicator: true,
            errorHandling: true,
            debug: false
        };
    }

    async initialize() {
        if (this.isInitialized) {
            console.warn(`Widget ${this.constructor.name} already initialized`);
            return;
        }

        try {
            this.log('Initializing widget...');

            if (this.options.loadingIndicator && this.container) {
                this.showLoading();
            }

            await this.onBeforeRender();
            await this.loadData();
            await this.render();
            await this.onAfterRender();
            this.bindEvents();

            this.isInitialized = true;
            this.log('Widget initialized successfully');
            this.emit('initialized');
        } catch (error) {
            this.handleError('Failed to initialize widget', error);
        }
    }

    async loadData() {
        // Override in child classes to load required data
        this.log('Loading data...');
    }

    async render() {
        if (!this.container) {
            this.log('No container found, creating virtual widget');
            return;
        }

        try {
            const template = await this.getTemplate();
            this.container.innerHTML = template;
            this.log('Widget rendered');
        } catch (error) {
            this.handleError('Failed to render widget', error);
        }
    }

    async getTemplate() {
        return `<div class="widget ${this.constructor.name.toLowerCase()}">Base Widget</div>`;
    }

    async onBeforeRender() {
        // Override in child classes for pre-render logic
    }

    async onAfterRender() {
        // Override in child classes for post-render logic
    }

    bindEvents() {
        // Override in child classes to bind event listeners
    }

    showLoading() {
        if (this.container) {
            this.container.innerHTML = `
                <div class="widget-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading ${this.constructor.name}...</p>
                </div>
            `;
        }
    }

    showError(message, details = '') {
        if (this.container) {
            this.container.innerHTML = `
                <div class="widget-error">
                    <div class="error-icon">⚠️</div>
                    <h4>Error in ${this.constructor.name}</h4>
                    <p class="error-message">${message}</p>
                    ${details ? `<p class="error-details">${details}</p>` : ''}
                    <button onclick="this.parentElement.parentElement.widget?.initialize()" class="btn-retry">
                        🔄 Retry
                    </button>
                </div>
            `;
        }
    }

    showEmpty(message = 'No data available') {
        if (this.container) {
            this.container.innerHTML = `
                <div class="widget-empty">
                    <div class="empty-icon">📭</div>
                    <p class="empty-message">${message}</p>
                </div>
            `;
        }
    }

    addEventListener(element, event, handler, options = {}) {
        if (element && typeof handler === 'function') {
            const boundHandler = handler.bind(this);
            element.addEventListener(event, boundHandler, options);
            this.eventListeners.push({ element, event, handler: boundHandler, options });
        }
    }

    addChildWidget(widget) {
        if (widget instanceof BaseWidget) {
            this.childWidgets.push(widget);
        }
    }

    async update(newOptions = {}, forceRender = false) {
        try {
            this.options = { ...this.options, ...newOptions };

            if (forceRender || !this.isInitialized) {
                await this.loadData();
                await this.render();
                this.bindEvents();
            }

            this.log('Widget updated');
            this.emit('updated');
        } catch (error) {
            this.handleError('Failed to update widget', error);
        }
    }

    async refresh() {
        this.log('Refreshing widget...');
        await this.update({}, true);
    }

    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
        this.emit('hidden');
    }

    show() {
        if (this.container) {
            this.container.style.display = '';
        }
        this.emit('shown');
    }

    destroy() {
        try {
            this.log('Destroying widget...');

            // Destroy child widgets
            this.childWidgets.forEach(widget => {
                if (typeof widget.destroy === 'function') {
                    widget.destroy();
                }
            });
            this.childWidgets = [];

            // Remove event listeners
            this.eventListeners.forEach(({ element, event, handler, options }) => {
                element.removeEventListener(event, handler, options);
            });
            this.eventListeners = [];

            // Clear container
            if (this.container) {
                this.container.innerHTML = '';
                this.container.widget = null;
            }

            // Clear data
            this.data = {};
            this.isInitialized = false;

            this.log('Widget destroyed');
            this.emit('destroyed');
        } catch (error) {
            this.handleError('Error during widget destruction', error);
        }
    }

    // Event system
    emit(eventName, data = {}) {
        const event = new CustomEvent(`widget:${eventName}`, {
            detail: { widget: this, data }
        });
        if (this.container) {
            this.container.dispatchEvent(event);
        }
        document.dispatchEvent(event);
    }

    on(eventName, handler) {
        const eventTarget = this.container || document;
        eventTarget.addEventListener(`widget:${eventName}`, handler);
    }

    // Utility methods
    $(selector) {
        return this.container ? this.container.querySelector(selector) : null;
    }

    $$(selector) {
        return this.container ? this.container.querySelectorAll(selector) : [];
    }

    addClass(className) {
        if (this.container) {
            this.container.classList.add(className);
        }
    }

    removeClass(className) {
        if (this.container) {
            this.container.classList.remove(className);
        }
    }

    hasClass(className) {
        return this.container ? this.container.classList.contains(className) : false;
    }

    setData(key, value) {
        this.data[key] = value;
        this.emit('dataChanged', { key, value });
    }

    getData(key) {
        return this.data[key];
    }

    getAllData() {
        return { ...this.data };
    }

    // Error handling
    handleError(message, error) {
        console.error(`${this.constructor.name}: ${message}`, error);

        if (this.options.errorHandling) {
            this.showError(message, error.message);
        }

        this.emit('error', { message, error });
    }

    // Logging
    log(message, ...args) {
        if (this.options.debug) {
            console.log(`[${this.constructor.name}] ${message}`, ...args);
        }
    }

    // Template helpers
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    }

    formatDate(date, options = {}) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            ...options
        });
    }

    formatNumber(number, decimals = 0) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(number || 0);
    }
}

// Make available globally
window.BaseWidget = BaseWidget;
