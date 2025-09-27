// Enhanced Electron print handler (optional)
class ElectronPrintHandler {
    static isElectron() {
        return typeof window !== 'undefined' && window.process && window.process.type === 'renderer';
    }

    static async printWithDialog() {
        if (this.isElectron() && window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                const result = await ipcRenderer.invoke('print-page');

                if (result.success) {
                    console.log('✅ Print completed successfully');
                } else {
                    console.error('❌ Print failed:', result.error);
                }

                return result;
            } catch (error) {
                console.error('❌ Electron print error:', error);
                // Fallback to standard print
                window.print();
            }
        } else {
            // Fallback to standard print
            window.print();
        }
    }
}

window.ElectronPrintHandler = ElectronPrintHandler;
