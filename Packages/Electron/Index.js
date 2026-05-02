import path from 'node:path';
import { appendFileSync, mkdirSync } from 'node:fs';
import { app, BrowserWindow, ipcMain } from 'electron';

let mainWindow = null;

function writeBootLog(message, details = '') {
  try {
    const logDirectory = path.join(process.cwd(), 'Build', 'Logs');
    mkdirSync(logDirectory, { recursive: true });
    const suffix = details ? ` ${details}` : '';
    appendFileSync(
      path.join(logDirectory, 'electron-boot.log'),
      `[${new Date().toISOString()}] ${message}${suffix}\n`,
      'utf8'
    );
  } catch {
    // Ignore logging failures during boot diagnostics.
  }
}

function registerIpcHandlers(handlerDefinitions = []) {
  writeBootLog('registerIpcHandlers:start', String(handlerDefinitions.length));
  for (const definition of handlerDefinitions) {
    ipcMain.removeHandler(definition.channel);
    ipcMain.handle(definition.channel, definition.handler);
    writeBootLog('registerIpcHandlers:channel', definition.channel);
  }
}

async function createMainWindow(entryPackage) {
  writeBootLog('createMainWindow:start', entryPackage.rendererPath);
  const browserWindow = new BrowserWindow({
    width: 1460,
    height: 960,
    minWidth: 1160,
    minHeight: 780,
    show: true,
    center: true,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#f4ebe5',
    webPreferences: {
      preload: entryPackage.preloadPath,
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
      spellcheck: false
    },
    ...entryPackage.window
  });

  const ensureVisible = () => {
    if (browserWindow.isDestroyed()) {
      return;
    }

    if (browserWindow.isMinimized()) {
      browserWindow.restore();
    }

    browserWindow.center();
    browserWindow.maximize();
    browserWindow.show();
    browserWindow.focus();
    browserWindow.moveTop();
    browserWindow.flashFrame(true);
    browserWindow.setAlwaysOnTop(true);
    setTimeout(() => {
      if (!browserWindow.isDestroyed()) {
        browserWindow.setAlwaysOnTop(false);
        browserWindow.flashFrame(false);
      }
    }, 1500);
  };

  browserWindow.once('ready-to-show', ensureVisible);
  browserWindow.webContents.once('did-finish-load', ensureVisible);
  browserWindow.on('show', () => {
    writeBootLog('browserWindow:show');
  });
  browserWindow.on('focus', () => {
    writeBootLog('browserWindow:focus');
  });
  browserWindow.webContents.on('did-start-loading', () => {
    writeBootLog('webContents:did-start-loading');
  });
  browserWindow.webContents.on('did-finish-load', () => {
    writeBootLog('webContents:did-finish-load');
  });
  browserWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl) => {
    writeBootLog(
      'webContents:did-fail-load',
      JSON.stringify({ errorCode, errorDescription, validatedUrl })
    );
    console.error('Renderer failed to load:', {
      errorCode,
      errorDescription,
      validatedUrl
    });
    ensureVisible();
  });
  browserWindow.webContents.on('render-process-gone', (_event, details) => {
    writeBootLog('webContents:render-process-gone', JSON.stringify(details));
    console.error('Renderer process exited:', details);
    ensureVisible();
  });

  await browserWindow.loadFile(entryPackage.rendererPath);
  writeBootLog('createMainWindow:loadFile-resolved');
  ensureVisible();
  return browserWindow;
}

export async function bootElectron({ entryPackage }) {
  writeBootLog('bootElectron:start');
  writeBootLog('bootElectron:process-type', process.type ?? 'browser');
  writeBootLog('bootElectron:app-isReady-initial', String(app.isReady()));
  registerIpcHandlers(entryPackage.ipcHandlers);

  app.on('activate', async () => {
    writeBootLog('app:activate');
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = await createMainWindow(entryPackage);
      writeBootLog('app:activate-window-recreated');
    }
  });

  app.on('window-all-closed', () => {
    writeBootLog('app:window-all-closed');
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('web-contents-created', () => {
    writeBootLog('app:web-contents-created');
  });

  app.on('browser-window-created', () => {
    writeBootLog('app:browser-window-created');
  });

  const launchMainWindow = async () => {
    writeBootLog('launchMainWindow:start');
    mainWindow = await createMainWindow(entryPackage);
    writeBootLog('launchMainWindow:complete');
  };

  if (app.isReady()) {
    writeBootLog('bootElectron:app-ready-immediate');
    await launchMainWindow();
  } else {
    writeBootLog('bootElectron:waiting-for-ready-event');
    app.once('ready', () => {
      writeBootLog('app:ready-event');
      launchMainWindow().catch((error) => {
        writeBootLog('launchMainWindow:error', error?.stack ?? String(error));
        throw error;
      });
    });
  }
}
