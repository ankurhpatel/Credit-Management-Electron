// Settings UI management
class SettingsUI {
    static currentLogoData = '';

    static async init() {
        console.log('⚙️ Initializing Settings UI...');
        const config = await SettingsAPI.load();
        this.populateForm(config);
        this.applyGlobalSettings();
    }

    static populateForm(config) {
        if (!config) return;

        console.log('📝 Populating settings form with:', config);

        // Map all fields correctly
        const fields = {
            'settingCompanyName': config.company_name,
            'settingCompanyEmail': config.company_email,
            'settingCompanyPhone': config.company_phone,
            'settingCompanyAddress': config.company_address,
            'settingReceiptInstructions': config.receipt_instructions,
            'settingCurrency': config.currency_symbol
        };

        Object.entries(fields).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        });
        
        if (config.company_logo) {
            this.currentLogoData = config.company_logo;
            const elLogo = document.getElementById('logoPreview');
            const elPlaceholder = document.getElementById('logoPlaceholder');
            if (elLogo) {
                elLogo.src = config.company_logo;
                elLogo.style.display = 'block';
            }
            if (elPlaceholder) elPlaceholder.style.display = 'none';
        }
    }

    static previewLogo(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentLogoData = e.target.result;
            const elLogo = document.getElementById('logoPreview');
            const elPlaceholder = document.getElementById('logoPlaceholder');
            
            if (elLogo) {
                elLogo.src = this.currentLogoData;
                elLogo.style.display = 'block';
            }
            if (elPlaceholder) elPlaceholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    static clearLogo() {
        this.currentLogoData = '';
        const elLogo = document.getElementById('logoPreview');
        const elPlaceholder = document.getElementById('logoPlaceholder');
        const elInput = document.getElementById('settingLogoFile');

        if (elLogo) {
            elLogo.src = '';
            elLogo.style.display = 'none';
        }
        if (elPlaceholder) elPlaceholder.style.display = 'block';
        if (elInput) elInput.value = '';
    }

    // Unified save method to prevent data loss - gathers ALL fields every time
    static async saveAll() {
        const settings = {
            company_name: document.getElementById('settingCompanyName').value,
            company_logo: this.currentLogoData,
            company_email: document.getElementById('settingCompanyEmail').value,
            company_phone: document.getElementById('settingCompanyPhone').value,
            company_address: document.getElementById('settingCompanyAddress').value,
            receipt_instructions: document.getElementById('settingReceiptInstructions').value,
            currency_symbol: document.getElementById('settingCurrency').value
        };

        try {
            console.log('💾 Committing all settings to database...');
            await SettingsAPI.save(settings);
            
            // Re-apply globally after save
            this.applyGlobalSettings();
            Alerts.showSuccess('Settings Saved', 'Business information updated across the system.');
        } catch (err) {
            console.error('❌ Save error:', err);
            Alerts.showError('Save Error', 'Failed to save settings: ' + err.message);
        }
    }

    static async saveAppSettings(event) {
        if (event) event.preventDefault();
        await this.saveAll();
    }

    static async saveReceiptSettings(event) {
        if (event) event.preventDefault();
        await this.saveAll();
    }

    static applyGlobalSettings() {
        const config = Store.getSettings();
        if (!config || typeof config !== 'object') return;

        console.log('🌐 Synchronizing global branding...');

        // 1. Update Header Company Name
        const headerName = document.querySelector('.header-logo h1');
        if (headerName) {
            const name = config.company_name || 'IT Services Management';
            headerName.textContent = name.startsWith('💳') ? name : `💳 ${name}`;
        }

        // 2. Update Header Logo
        const headerLogo = document.getElementById('headerLogo');
        if (headerLogo) {
            if (config.company_logo) {
                headerLogo.src = config.company_logo;
                headerLogo.style.display = 'block';
            } else {
                headerLogo.style.display = 'none';
            }
        }

        // 3. Update page title
        document.title = config.company_name || 'IT Services Management';
    }

    static showLivePreview() {
        // Use live form values for the preview
        const liveConfig = {
            company_name: document.getElementById('settingCompanyName').value,
            company_logo: this.currentLogoData,
            company_email: document.getElementById('settingCompanyEmail').value,
            company_phone: document.getElementById('settingCompanyPhone').value,
            company_address: document.getElementById('settingCompanyAddress').value,
            receipt_instructions: document.getElementById('settingReceiptInstructions').value,
            currency_symbol: document.getElementById('settingCurrency').value
        };

        const dummyData = {
            customer: { name: 'Sample Customer', email: 'customer@example.com', phone: '555-0199' },
            subscriptions: [{ service_name: 'Premium IT Service', amount_paid: 120.00, credits_used: 12, item_type: 'subscription', classification: 'Living Room' }],
            summary: { totalPaid: 120.00 }
        };

        const receiptHTML = ReceiptUI.generateProfessionalHTML(dummyData, liveConfig);
        ReceiptUI.showReceiptModal(receiptHTML, 'Style Preview');
    }

    static showTab(tabId) {
        document.querySelectorAll('.settings-section').forEach(s => s.style.display = 'none');
        document.querySelectorAll('#settings .tab-button').forEach(b => b.classList.remove('active'));
        
        const target = document.getElementById(tabId);
        if (target) target.style.display = 'block';
        
        const btn = document.querySelector(`#settings .tab-button[onclick*="${tabId}"]`);
        if (btn) btn.classList.add('active');
    }

    static async resetDatabase() {
        if (!confirm('⚠️ WARNING: This will DELETE ALL DATA (Customers, Sales, Inventory).\n\nAre you sure you want to proceed?')) {
            return;
        }

        if (!confirm('🛑 FINAL CONFIRMATION: This action cannot be undone.\n\nClick OK to permanently erase the database.')) {
            return;
        }

        const password = prompt('Please enter the admin password to confirm reset:');
        if (password !== '1234') {
            Alerts.showError('Access Denied', 'Incorrect password.');
            return;
        }

        try {
            const response = await fetch('/api/database/reset', {
                method: 'POST',
                headers: { 'password': password }
            });

            if (response.ok) {
                alert('✅ Database has been reset successfully. The application will now reload.');
                window.location.reload();
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Failed to reset database');
            }
        } catch (error) {
            console.error('❌ Reset Error:', error);
            Alerts.showError('Reset Failed', error.message);
        }
    }
}

// Global wrappers
function saveAppSettings(e) { SettingsUI.saveAppSettings(e); }
function saveReceiptSettings(e) { SettingsUI.saveReceiptSettings(e); }
function showSettingsTab(id) { SettingsUI.showTab(id); }
// No separate wrapper needed since we call SettingsUI.resetDatabase() directly in HTML
// But adding it just in case I used the global function pattern elsewhere (I didn't, I used SettingsUI.resetDatabase() in HTML)

window.SettingsUI = SettingsUI;