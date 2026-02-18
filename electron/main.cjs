const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const http = require('http');
const os = require('os');

const isDev = !app.isPackaged;
const dataFileName = 'stone-inventory-data.json';
const LAN_PORT = Number(process.env.PALAT_LAN_PORT || 3210);

function getDataFilePath() {
  return path.join(app.getPath('userData'), dataFileName);
}

async function readDataFile() {
  const filePath = getDataFilePath();
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { stones: [], stoneTypes: ['Granite', 'Marble', 'Limestone'] };
    }
    throw error;
  }
}

async function writeDataFile(data) {
  const filePath = getDataFilePath();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return { success: true };
}

function resolveWindowIcon() {
  const pngIcon = path.join(__dirname, '../build/icon.png');
  return fsSync.existsSync(pngIcon) ? pngIcon : undefined;
}

function resolveMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.ico') return 'image/x-icon';
  return 'application/octet-stream';
}

async function startLanServer() {
  const distDir = path.join(__dirname, '../dist');

  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);

      if (requestUrl.pathname === '/api/data' && req.method === 'GET') {
        const data = await readDataFile();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data));
        return;
      }

      if (requestUrl.pathname === '/api/data' && req.method === 'POST') {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', async () => {
          try {
            const body = Buffer.concat(chunks).toString('utf-8') || '{}';
            const payload = JSON.parse(body);
            await writeDataFile(payload);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true }));
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, error: error.message }));
          }
        });
        return;
      }

      if (requestUrl.pathname === '/__health') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      const sanitizedPath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '');
      const fallbackIndex = path.join(distDir, 'index.html');
      const requestedPath = path.join(distDir, sanitizedPath);

      let fileToServe = fallbackIndex;
      if (sanitizedPath) {
        try {
          const stat = await fs.stat(requestedPath);
          if (stat.isFile()) fileToServe = requestedPath;
        } catch {
          fileToServe = fallbackIndex;
        }
      }

      const fileData = await fs.readFile(fileToServe);
      res.writeHead(200, { 'Content-Type': resolveMimeType(fileToServe) });
      res.end(fileData);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(LAN_PORT, '0.0.0.0', resolve);
  });

  const network = os.networkInterfaces();
  const urls = [`http://127.0.0.1:${LAN_PORT}`];
  Object.values(network).forEach((entries) => {
    (entries || []).forEach((entry) => {
      if (entry.family === 'IPv4' && !entry.internal) {
        urls.push(`http://${entry.address}:${LAN_PORT}`);
      }
    });
  });

  console.log('LAN server started:');
  urls.forEach((url) => console.log(`  ${url}`));

  return { server, urls };
}

function createWindow(startUrl) {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: resolveWindowIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://127.0.0.1:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadURL(startUrl);
  }
}

ipcMain.handle('data:load', readDataFile);
ipcMain.handle('data:save', async (_event, data) => writeDataFile(data));

let lanServer;

app.whenReady().then(async () => {
  if (!isDev) {
    const lan = await startLanServer();
    lanServer = lan.server;
    createWindow(`http://127.0.0.1:${LAN_PORT}`);
    return;
  }

  createWindow();
});

app.on('window-all-closed', () => {
  if (lanServer) {
    lanServer.close();
    lanServer = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow(isDev ? undefined : `http://127.0.0.1:${LAN_PORT}`);
  }
});
