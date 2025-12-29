// Settings API calls
class SettingsAPI {
    static async load() {
        try {
            const response = await fetch('/api/settings');
            const config = await response.json();
            Store.setSettings(config);
            return config;
        } catch (error) {
            console.error('❌ Error loading settings:', error);
            return {};
        }
    }

    static async save(settingsData) {
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settingsData)
            });
            const result = await response.json();
            
            if (result.success) {
                // Refresh local store
                await this.load();
                // Apply visual changes immediately
                SettingsUI.applyGlobalSettings();
            }
            
            return result;
        } catch (error) {
            console.error('❌ Error saving settings:', error);
            throw error;
        }
    }
}

window.SettingsAPI = SettingsAPI;