const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const DatabaseManager = require('./database');
const EmbeddedServer = require('./server');

// Keep global references
let mainWindow;
let database;
let server;
let isQuitting = false;

function createWindow() {
    // Create a smaller "Controller" window instead of the full app frame
    mainWindow = new BrowserWindow({
        width: 400,
        height: 300,
        resizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true
        },
        icon: getIconPath(),
        title: 'IT Services Server',
        show: false,
        backgroundColor: '#ffffff'
    });

    // Provide a simple HTML page for the controller window
    const controllerHtml = `
        <html>
            <body style="font-family: sans-serif; text-align: center; padding: 20px; background: #f8fafc;">
                <h2 style="color: #667eea;">🚀 Server is Running</h2>
                <p>The application is now open in your <strong>default web browser</strong>.</p>
                <div style="margin-top: 20px;">
                    <button onclick="window.openLink()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Re-open in Browser
                    </button>
                </div>
                <p style="font-size: 12px; color: #718096; margin-top: 20px;">
                    URL: <a href="http://localhost:3001" target="_blank">http://localhost:3001</a>
                </p>
                <p style="font-size: 11px; color: #a0aec0;">Keep this window open to keep the database active.</p>
                <script>
                    window.openLink = () => { window.location.href = 'http://localhost:3001'; };
                </script>
            </body>
        </html>
    `;
    
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(controllerHtml)}`);

    // When ready, open the browser and show the small controller
    mainWindow.once('ready-to-show', () => {
        console.log('🌐 Opening app in default system browser...');
        shell.openExternal('http://localhost:3001');
        
        mainWindow.show();
        mainWindow.setTitle('IT Services - Server Controller');
    });

    // Handle external links in the controller (like the localhost link)
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Handle window closed
    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    // Handle close attempt - actually quit if the controller is closed
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            isQuitting = true;
            app.quit();
        }
    });
}

// ADD: Print functionality handlers
function setupPrintHandlers() {
    console.log('🖨️ Setting up print functionality...');

    // Handle print requests from renderer
    ipcMain.handle('print-page', async (event, options = {}) => {
        try {
            console.log('🖨️ Print request received');

            const printOptions = {
                silent: false,
                printBackground: true,
                deviceName: '',
                color: false,
                margins: {
                    marginType: 'minimum'
                },
                landscape: false,
                scaleFactor: 100,
                pagesPerSheet: 1,
                collate: false,
                copies: 1,
                ...options // Allow custom options
            };

            await mainWindow.webContents.print(printOptions);
            console.log('✅ Print completed successfully');
            return { success: true };

        } catch (error) {
            console.error('❌ Print error:', error);
            return { success: false, error: error.message };
        }
    });

    // Handle print to PDF requests
    ipcMain.handle('print-to-pdf', async (event, options = {}) => {
        try {
            console.log('📄 Print to PDF request received');

            const pdfOptions = {
                marginsType: 0,
                pageSize: 'Letter',
                printBackground: true,
                printSelectionOnly: false,
                landscape: false,
                ...options
            };

            const pdfData = await mainWindow.webContents.printToPDF(pdfOptions);
            console.log('✅ PDF generated successfully');
            return { success: true, data: pdfData };

        } catch (error) {
            console.error('❌ PDF generation error:', error);
            return { success: false, error: error.message };
        }
    });

    // Handle save PDF requests
    ipcMain.handle('save-pdf', async (event, filename = 'document.pdf') => {
        try {
            const result = await dialog.showSaveDialog(mainWindow, {
                title: 'Save PDF',
                defaultPath: filename,
                filters: [
                    { name: 'PDF Files', extensions: ['pdf'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (!result.canceled && result.filePath) {
                const pdfResult = await mainWindow.webContents.printToPDF({
                    marginsType: 0,
                    pageSize: 'Letter',
                    printBackground: true,
                    printSelectionOnly: false,
                    landscape: false
                });

                fs.writeFileSync(result.filePath, pdfResult);

                dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: 'PDF Saved',
                    message: 'PDF saved successfully!',
                    detail: `Saved to: ${result.filePath}`
                });

                return { success: true, filePath: result.filePath };
            }

            return { success: false, error: 'Save cancelled' };

        } catch (error) {
            console.error('❌ Save PDF error:', error);
            dialog.showErrorBox('Save Error', `Failed to save PDF: ${error.message}`);
            return { success: false, error: error.message };
        }
    });

    // ADD: Print preview handler
    ipcMain.handle('show-print-preview', async () => {
        try {
            // This will show the system print preview dialog
            await mainWindow.webContents.print({ silent: false });
            return { success: true };
        } catch (error) {
            console.error('❌ Print preview error:', error);
            return { success: false, error: error.message };
        }
    });

    console.log('✅ Print handlers setup complete');
}

// Get appropriate icon path
function getIconPath() {
    const iconPath = path.join(__dirname, '../../assets/icon.png');
    if (fs.existsSync(iconPath)) {
        return iconPath;
    }
    return null;
}

// Initialize database and server
async function initializeApp() {
    try {
        console.log('🗄️ Initializing database...');
        database = new DatabaseManager();
        await database.initialize();

        console.log('🌐 Starting embedded server...');
        server = new EmbeddedServer(database);
        await server.start();

        console.log('✅ Application initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        const response = dialog.showMessageBoxSync({
            type: 'error',
            title: 'Startup Error',
            message: 'Failed to initialize application',
            detail: `Error: ${error.message}\n\nWould you like to try again?`,
            buttons: ['Retry', 'Quit'],
            defaultId: 0
        });

        if (response === 0) {
            return await initializeApp();
        } else {
            app.quit();
            return false;
        }
    }
}

// App event handlers
app.whenReady().then(async () => {
    const initialized = await initializeApp();
    if (initialized) {
        createWindow();
        createMenu();
    }

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        } else if (mainWindow && !mainWindow.isVisible()) {
            mainWindow.show();
        }
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        isQuitting = true;
        app.quit();
    }
});

app.on('before-quit', (event) => {
    isQuitting = true;
    console.log('🛑 Shutting down application...');
    if (server) {
        server.close();
    }
    if (database) {
        database.close();
    }
});

// Create application menu
function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Export Database',
                    accelerator: 'CmdOrCtrl+E',
                    click: async () => {
                        if (!database) return;
                        const result = await dialog.showSaveDialog(mainWindow, {
                            title: 'Export Database',
                            defaultPath: `it-services-backup-${new Date().toISOString().split('T')[0]}.db`,
                            filters: [
                                { name: 'Database Files', extensions: ['db'] },
                                { name: 'All Files', extensions: ['*'] }
                            ]
                        });

                        if (!result.canceled && result.filePath) {
                            try {
                                fs.copyFileSync(database.getDbPath(), result.filePath);
                                dialog.showMessageBox(mainWindow, {
                                    type: 'info',
                                    title: 'Export Successful',
                                    message: 'Database exported successfully!',
                                    detail: `Saved to: ${result.filePath}`
                                });
                            } catch (error) {
                                dialog.showErrorBox('Export Error', `Failed to export database: ${error.message}`);
                            }
                        }
                    }
                },
                { type: 'separator' },
                // ADD: Print menu items
                {
                    label: 'Print',
                    accelerator: 'CmdOrCtrl+P',
                    click: async () => {
                        try {
                            await mainWindow.webContents.print({ silent: false });
                        } catch (error) {
                            dialog.showErrorBox('Print Error', `Failed to print: ${error.message}`);
                        }
                    }
                },
                {
                    label: 'Save as PDF',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: async () => {
                        try {
                            const result = await dialog.showSaveDialog(mainWindow, {
                                title: 'Save as PDF',
                                defaultPath: `report-${new Date().toISOString().split('T')[0]}.pdf`,
                                filters: [
                                    { name: 'PDF Files', extensions: ['pdf'] },
                                    { name: 'All Files', extensions: ['*'] }
                                ]
                            });

                            if (!result.canceled && result.filePath) {
                                const pdfData = await mainWindow.webContents.printToPDF({
                                    marginsType: 0,
                                    pageSize: 'Letter',
                                    printBackground: true,
                                    printSelectionOnly: false,
                                    landscape: false
                                });

                                fs.writeFileSync(result.filePath, pdfData);

                                dialog.showMessageBox(mainWindow, {
                                    type: 'info',
                                    title: 'PDF Saved',
                                    message: 'PDF saved successfully!',
                                    detail: `Saved to: ${result.filePath}`
                                });
                            }
                        } catch (error) {
                            dialog.showErrorBox('PDF Error', `Failed to save PDF: ${error.message}`);
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        isQuitting = true;
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectall' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About IT Services Credit Management',
                            message: 'IT Services Credit Management System v2.0.0',
                            detail: `Electron: ${process.versions.electron}\nNode.js: ${process.versions.node}\n\nA comprehensive solution for managing IT service subscriptions.\n\n🖨️ Print functionality enabled`
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Handle app crashes
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    if (mainWindow) {
        dialog.showErrorBox('Application Error', `An unexpected error occurred: ${error.message}`);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
