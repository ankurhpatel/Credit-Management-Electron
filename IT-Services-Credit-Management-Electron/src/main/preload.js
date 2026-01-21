const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    printPage: (options) => ipcRenderer.invoke('print-page', options),
    printToPDF: (options) => ipcRenderer.invoke('print-to-pdf', options),
    savePDF: (filename) => ipcRenderer.invoke('save-pdf', filename),
    showPrintPreview: () => ipcRenderer.invoke('show-print-preview')
});
