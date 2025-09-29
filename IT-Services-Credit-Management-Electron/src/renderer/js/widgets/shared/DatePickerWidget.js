class DatePickerWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.selectedDate = null;
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            format: 'YYYY-MM-DD',
            placeholder: 'Select date...',
            minDate: null,
            maxDate: null,
            defaultToToday: false,
            showTime: false,
            required: false
        };
    }

    async getTemplate() {
        const today = new Date().toISOString().split('T')[0];
        const defaultValue = this.options.defaultToToday ? today : '';

        return `
            <div class="date-picker-wrapper">
                <input type="date" 
                       class="date-input"
                       value="${defaultValue}"
                       ${this.options.required ? 'required' : ''}
                       ${this.options.minDate ? `min="${this.options.minDate}"` : ''}
                       ${this.options.maxDate ? `max="${this.options.maxDate}"` : ''}>
                <div class="date-display">${this.options.placeholder}</div>
            </div>
        `;
    }

    bindEvents() {
        const dateInput = this.$('.date-input');
        if (dateInput) {
            this.addEventListener(dateInput, 'change', (e) => {
                this.selectedDate = e.target.value;
                this.updateDisplay();
                this.emit('dateChanged', { date: this.selectedDate });
            });
        }
    }

    updateDisplay() {
        const display = this.$('.date-display');
        if (display && this.selectedDate) {
            display.textContent = this.formatDate(this.selectedDate);
        }
    }

    getValue() {
        return this.selectedDate;
    }

    setValue(date) {
        this.selectedDate = date;
        const input = this.$('.date-input');
        if (input) {
            input.value = date;
            this.updateDisplay();
        }
    }

    clear() {
        this.selectedDate = null;
        const input = this.$('.date-input');
        if (input) {
            input.value = '';
        }
        const display = this.$('.date-display');
        if (display) {
            display.textContent = this.options.placeholder;
        }
    }
}

window.DatePickerWidget = DatePickerWidget;
