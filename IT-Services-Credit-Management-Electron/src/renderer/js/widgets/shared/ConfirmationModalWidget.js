class ConfirmationModalWidget extends BaseWidget {
    constructor(containerId, options = {}) {
        super(containerId, options);
        this.currentConfirmation = null;
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            backdrop: true,
            keyboard: true
        };
    }

    async getTemplate() {
        return `
            <div class="modal-overlay" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4 class="modal-title" id="modalTitle">Confirm Action</h4>
                        <button class="modal-close" id="modalClose">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="modal-icon" id="modalIcon">❓</div>
                        <div class="modal-message" id="modalMessage">Are you sure?</div>
                        <div class="modal-details" id="modalDetails"></div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" id="modalCancel">Cancel</button>
                        <button class="btn-primary" id="modalConfirm">Confirm</button>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Close button
        const closeBtn = this.$('.modal-close');
        if (closeBtn) {
            this.addEventListener(closeBtn, 'click', () => this.hide());
        }

        // Cancel button
        const cancelBtn = this.$('#modalCancel');
        if (cancelBtn) {
            this.addEventListener(cancelBtn, 'click', () => this.cancel());
        }

        // Confirm button
        const confirmBtn = this.$('#modalConfirm');
        if (confirmBtn) {
            this.addEventListener(confirmBtn, 'click', () => this.confirm());
        }

        // Backdrop click
        if (this.options.backdrop) {
            const overlay = this.$('.modal-overlay');
            if (overlay) {
                this.addEventListener(overlay, 'click', (e) => {
                    if (e.target === overlay) {
                        this.hide();
                    }
                });
            }
        }

        // Keyboard events
        if (this.options.keyboard) {
            this.addEventListener(document, 'keydown', (e) => {
                if (this.isVisible) {
                    if (e.key === 'Escape') {
                        this.cancel();
                    } else if (e.key === 'Enter') {
                        this.confirm();
                    }
                }
            });
        }
    }

    show(options = {}) {
        const {
            title = 'Confirm Action',
            message = 'Are you sure?',
            details = '',
            icon = '❓',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            confirmClass = 'btn-primary',
            onConfirm = null,
            onCancel = null
        } = options;

        this.currentConfirmation = { onConfirm, onCancel };

        // Update content
        this.$('#modalTitle').textContent = title;
        this.$('#modalMessage').textContent = message;
        this.$('#modalDetails').textContent = details;
        this.$('#modalIcon').textContent = icon;
        this.$('#modalConfirm').textContent = confirmText;
        this.$('#modalCancel').textContent = cancelText;

        // Update button class
        const confirmBtn = this.$('#modalConfirm');
        confirmBtn.className = `btn ${confirmClass}`;

        // Show modal
        const overlay = this.$('.modal-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            this.isVisible = true;
        }

        // Focus confirm button
        setTimeout(() => {
            confirmBtn.focus();
        }, 100);
    }

    hide() {
        const overlay = this.$('.modal-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            this.isVisible = false;
        }
        this.currentConfirmation = null;
    }

    confirm() {
        if (this.currentConfirmation?.onConfirm) {
            this.currentConfirmation.onConfirm();
        }
        this.hide();
    }

    cancel() {
        if (this.currentConfirmation?.onCancel) {
            this.currentConfirmation.onCancel();
        }
        this.hide();
    }

    // Convenience methods for different types of confirmations
    confirmDelete(itemName, onConfirm) {
        this.show({
            title: 'Delete Confirmation',
            message: `Are you sure you want to delete "${itemName}"?`,
            details: 'This action cannot be undone.',
            icon: '🗑️',
            confirmText: 'Delete',
            confirmClass: 'btn-danger',
            onConfirm
        });
    }

    confirmSave(onConfirm) {
        this.show({
            title: 'Save Changes',
            message: 'Do you want to save your changes?',
            icon: '💾',
            confirmText: 'Save',
            confirmClass: 'btn-success',
            onConfirm
        });
    }

    confirmLogout(onConfirm) {
        this.show({
            title: 'Logout Confirmation',
            message: 'Are you sure you want to logout?',
            details: 'Any unsaved changes will be lost.',
            icon: '🚪',
            confirmText: 'Logout',
            confirmClass: 'btn-warning',
            onConfirm
        });
    }
}

window.ConfirmationModalWidget = ConfirmationModalWidget;
