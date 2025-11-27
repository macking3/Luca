
import { app, BrowserWindow, screen, globalShortcut, Tray, Menu, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let serverProcess;
let mainWindow;
let tray;

// Toggle Window Visibility (Siri Style)
function toggleWindow() {
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    // Recenter on current screen
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    mainWindow.setBounds({ x: 0, y: 0, width, height });
    mainWindow.show();
    mainWindow.focus();
  }
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    frame: false, // No border
    transparent: true, // CRITICAL: Allows seeing the desktop behind
    alwaysOnTop: true, // Float over other apps
    hasShadow: false,
    skipTaskbar: true, // Don't show in taskbar (like Siri)
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    icon: path.join(__dirname, 'public/icon.png')
  });

  // Load the App
  const isDev = !app.isPackaged;
  const url = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, 'dist/index.html')}`;
  
  mainWindow.loadURL(url);

  // --- PERMISSION HANDLER (CRITICAL FOR MEDIA) ---
  // Automatically grant permissions for microphone, camera
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback, details) => {
    console.log(`[ELECTRON] Permission Request: ${permission}`);
    const allowedPermissions = ['media', 'audio-capture', 'video-capture', 'geolocation', 'notifications'];
    if (allowedPermissions.includes(permission)) {
      callback(true); // Approve
    } else {
      callback(false); // Deny others
    }
  });

  // Hide initially (wait for hotkey)
  // mainWindow.hide(); 
  // For dev, we keep it shown, but in prod, you might want it hidden on boot
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'public/icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Toggle LUCA (Alt+Space)', click: toggleWindow },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setToolTip('LUCA Autonomous Agent');
  tray.setContextMenu(contextMenu);
  tray.on('click', toggleWindow);
}

// Start the Local Core (server.js) automatically
function startLocalCore() {
    const serverPath = path.join(__dirname, 'server.js');
    
    serverProcess = spawn('node', [serverPath], {
        cwd: __dirname,
        stdio: 'inherit' 
    });
    
    serverProcess.on('error', (err) => {
        console.error('[ELECTRON] Failed to start Local Core:', err);
    });
}

app.whenReady().then(() => {
  startLocalCore();
  createWindow();
  createTray();

  // REGISTER GLOBAL HOTKEY (Alt+Space or Option+Space)
  globalShortcut.register('Alt+Space', toggleWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    if (serverProcess) {
        serverProcess.kill();
    }
});
