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
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true,
            // ADD: Allow printing functionality
            printBackground: true,
            // ADD: Enable preload script for print functionality (optional)
            // preload: path.join(__dirname, 'preload.js')
        },
        icon: getIconPath(),
        title: 'IT Services Credit Management System',
        show: false, // Don't show until ready
        titleBarStyle: 'default',
        backgroundColor: '#ffffff'
    });

    // Load the app - wait for server to be ready
    const loadApp = () => {
        mainWindow.loadURL('http://localhost:3001')
            .catch(err => {
                console.error('Failed to load app:', err);
                // Retry after 1 second
                setTimeout(loadApp, 1000);
            });
    };

    loadApp();

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        console.log('🚀 IT Services Credit Management System Ready!');
        // Set window title with version
        mainWindow.setTitle('IT Services Credit Management v2.0.0');
    });

    // ADD: Setup print functionality
    setupPrintHandlers();

    // Handle window closed
    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    // Handle close attempt
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            const response = dialog.showMessageBoxSync(mainWindow, {
                type: 'question',
                buttons: ['Cancel', 'Minimize to Tray', 'Quit'],
                defaultId: 2,
                cancelId: 0,
                message: 'What would you like to do?',
                detail: 'You can minimize to system tray or completely quit the application.'
            });

            if (response === 1) {
                mainWindow.hide();
                event.preventDefault();
            } else if (response === 2) {
                isQuitting = true;
                app.quit();
            }
        }
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Handle navigation
    mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        if (parsedUrl.origin !== 'http://localhost:3001') {
            event.preventDefault();
            shell.openExternal(navigationUrl);
        }
    });

    // Development tools
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
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
