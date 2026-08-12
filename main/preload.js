const { contextBridge, ipcRenderer } = require('electron');

// Security: Expose only necessary APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Data operations
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),

  // Stone operations
  addStone: (stone) => ipcRenderer.invoke('add-stone', stone),
  updateStone: (stone) => ipcRenderer.invoke('update-stone', stone),
  deleteStone: (id) => ipcRenderer.invoke('delete-stone', id),

  // Stone type operations
  addStoneType: (type) => ipcRenderer.invoke('add-stone-type', type),
  deleteStoneType: (type) => ipcRenderer.invoke('delete-stone-type', type),

  // Backup operations
  backupDatabase: (backupPath) => ipcRenderer.invoke('backup-database', backupPath),
  restoreDatabase: (backupPath) => ipcRenderer.invoke('restore-database', backupPath),

  // Audit log operations
  getAuditLogs: (options) => ipcRenderer.invoke('get-audit-logs', options),

  // Search operations
  searchStones: (filters) => ipcRenderer.invoke('search-stones', filters),

  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // Utility functions
  on: (channel, func) => {
    const validChannels = [
      'data-updated',
      'backup-complete',
      'restore-complete',
      'error'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  removeListener: (channel, func) => {
    const validChannels = [
      'data-updated',
      'backup-complete',
      'restore-complete',
      'error'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, func);
    }
  }
});

// Security: Prevent exposure of Node.js APIs
// This is enforced by contextIsolation in main.js
