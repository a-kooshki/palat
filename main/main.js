const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { Database } = require('./database');

// Security: Enable Electron security recommendations
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

// Database instance
let db;

// Main window reference
let mainWindow;

// Initialize database
function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'stone_inventory.db');
  db = new Database(dbPath);
  return db;
}

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    title: 'Stone Inventory Management',
    icon: path.join(__dirname, '../renderer/public/icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      enableRemoteModule: false,
      devTools: process.env.NODE_ENV === 'development'
    }
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/public/index.html'));
  }

  // Open dev tools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closing
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Setup IPC handlers
function setupIPC() {
  // Data operations
  ipcMain.handle('load-data', async () => {
    try {
      const stones = await db.getAllStones();
      const stoneTypes = await db.getAllStoneTypes();
      return { stones, stoneTypes };
    } catch (error) {
      console.error('Error loading data:', error);
      return { stones: [], stoneTypes: ['Granite', 'Marble', 'Limestone'] };
    }
  });

  ipcMain.handle('save-data', async (event, { stones, stoneTypes }) => {
    try {
      await db.saveAllStones(stones);
      await db.saveStoneTypes(stoneTypes);
      return { success: true };
    } catch (error) {
      console.error('Error saving data:', error);
      return { success: false, error: error.message };
    }
  });

  // Stone operations
  ipcMain.handle('add-stone', async (event, stone) => {
    try {
      const result = await db.addStone(stone);
      return { success: true, id: result.id };
    } catch (error) {
      console.error('Error adding stone:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-stone', async (event, stone) => {
    try {
      await db.updateStone(stone);
      return { success: true };
    } catch (error) {
      console.error('Error updating stone:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-stone', async (event, id) => {
    try {
      await db.deleteStone(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting stone:', error);
      return { success: false, error: error.message };
    }
  });

  // Stone type operations
  ipcMain.handle('add-stone-type', async (event, type) => {
    try {
      await db.addStoneType(type);
      return { success: true };
    } catch (error) {
      console.error('Error adding stone type:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-stone-type', async (event, type) => {
    try {
      await db.deleteStoneType(type);
      return { success: true };
    } catch (error) {
      console.error('Error deleting stone type:', error);
      return { success: false, error: error.message };
    }
  });

  // Backup operations
  ipcMain.handle('backup-database', async (event, backupPath) => {
    try {
      const result = await db.backup(backupPath);
      return { success: true, path: result.path };
    } catch (error) {
      console.error('Error creating backup:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('restore-database', async (event, backupPath) => {
    try {
      const result = await db.restore(backupPath);
      return { success: true, path: result.path };
    } catch (error) {
      console.error('Error restoring backup:', error);
      return { success: false, error: error.message };
    }
  });

  // Audit log operations
  ipcMain.handle('get-audit-logs', async (event, { limit = 100, offset = 0 }) => {
    try {
      const logs = await db.getAuditLogs(limit, offset);
      return { success: true, logs };
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return { success: false, error: error.message };
    }
  });

  // Search operations
  ipcMain.handle('search-stones', async (event, filters) => {
    try {
      const results = await db.searchStones(filters);
      return { success: true, stones: results };
    } catch (error) {
      console.error('Error searching stones:', error);
      return { success: false, error: error.message };
    }
  });

  // Get app info
  ipcMain.handle('get-app-info', () => {
    return {
      version: app.getVersion(),
      name: app.getName(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node
    };
  });
}

// App ready
app.whenReady().then(() => {
  // Initialize database
  db = initDatabase();

  // Setup IPC handlers
  setupIPC();

  // Create main window
  createWindow();

  // Handle app activation
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
