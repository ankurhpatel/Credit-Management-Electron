class AppHeaderWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            title: '💳 IT Services Credit Management',
            subtitle: 'Track credits, manage vendors, and monitor profit margins',
            showVersion: true,
            version: '2.0.0'
        };
    }

    async getTemplate() {
        return `
            <header class="app-header">
                <h1>${this.options.title}</h1>
                <p>${this.options.subtitle}</p>
                ${this.options.showVersion ? `<div class="version">Version ${this.options.version}</div>` : ''}
            </header>
        `;
    }

    bindEvents() {
        // Add click handler for header if needed
        const header = this.$('h1');
        if (header) {
            this.addEventListener(header, 'click', () => {
                console.log('Header clicked');
            });
        }
    }
}

window.AppHeaderWidget = AppHeaderWidget;
