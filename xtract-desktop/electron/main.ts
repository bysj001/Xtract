import { app, BrowserWindow, ipcMain, shell, dialog, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const isDev = process.env.NODE_ENV === 'development';

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // ✅ Disable sandbox for full drag & drop functionality
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a1a',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// Handle getting MP3 files
ipcMain.handle('get-mp3-files', async (): Promise<Array<{ name: string; path: string }>> => {
  try {
    const assetsPath = isDev 
      ? path.resolve(__dirname, '../src/assets')
      : path.join(process.resourcesPath, 'assets');
    
    if (!fs.existsSync(assetsPath)) {
      console.warn('Assets path does not exist:', assetsPath);
      return [];
    }

    const files = fs.readdirSync(assetsPath);
    const mp3Files = files
      .filter(file => file.toLowerCase().endsWith('.mp3'))
      .map(file => ({
        name: file,
        path: path.resolve(assetsPath, file) // Ensure absolute path
      }));

  
    return mp3Files;
  } catch (error) {
    console.error('Error reading MP3 files:', error);
    return [];
  }
});

// Handle getting file URL for audio playback
ipcMain.handle('get-file-url', async (_, filePath: string): Promise<string> => {
  try {
    // Convert to safe URL for audio playback
    return `safe-file://${filePath}`;
  } catch (error) {
    console.error('Error getting file URL:', error);
    throw error;
  }
});

// Handle exporting file to user-chosen location
ipcMain.handle('export-file', async (_, filePath: string): Promise<boolean> => {
  try {
    const fileName = path.basename(filePath);
    const result = await dialog.showSaveDialog({
      title: 'Export MP3 File',
      defaultPath: fileName,
      filters: [
        { name: 'MP3 Files', extensions: ['mp3'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      // Copy the file to the chosen location
      fs.copyFileSync(filePath, result.filePath);
      
      // Show the exported file in Finder
      shell.showItemInFolder(result.filePath);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error exporting file:', error);
    throw error;
  }
});

// Clean implementation - only keeping what's needed

app.whenReady().then(() => {
  // Register custom protocol for safe file access
  protocol.registerFileProtocol('safe-file', (request, callback) => {
    const url = request.url.replace('safe-file://', '');
    try {
      return callback(decodeURIComponent(url));
    } catch (error) {
      console.error('Protocol error:', error);
      return callback({ error: -2 });
    }
  });

  createWindow();

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