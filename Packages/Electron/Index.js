import path from 'node:path';
import { app, BrowserWindow, ipcMain } from 'electron';
import { createBootLogger } from '../Boot/Index.js';

let mainWindow = null;
let currentPackage = null;
let packageLoader = null;
let registeredChannels = new Set();
let navigationSequence = Promise.resolve();

const writeBootLog = createBootLogger(
  path.join(process.cwd(), 'Build', 'Logs', 'electron-boot.log')
);

function registerIpcHandlers(handlerDefinitions = []) {
  writeBootLog('registerIpcHandlers:start', String(handlerDefinitions.length));
  const nextChannels = new Set(handlerDefinitions.map((definition) => definition.channel));

  for (const channel of registeredChannels) {
    if (!nextChannels.has(channel)) {
      ipcMain.removeHandler(channel);
    }
  }

  for (const definition of handlerDefinitions) {
    ipcMain.removeHandler(definition.channel);
    ipcMain.handle(definition.channel, definition.handler);
    writeBootLog('registerIpcHandlers:channel', definition.channel);
  }

  registeredChannels = nextChannels;
}

async function createMainWindow(entryPackage) {
  writeBootLog('createMainWindow:start', entryPackage.rendererPath);
  const browserWindow = new BrowserWindow({
    width: 1460,
    height: 960,
    minWidth: 1160,
    minHeight: 780,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#f2eafa',
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

function queueNavigation(navigate) {
  const nextTask = navigationSequence.then(navigate, navigate);
  navigationSequence = nextTask.catch(() => {});
  return nextTask;
}

async function navigateToPackage(packageId) {
  if (!packageLoader) {
    throw new Error('Package loader is not available.');
  }

  if (currentPackage?.id === packageId) {
    return { packageId };
  }

  writeBootLog('navigateToPackage:start', packageId);
  const previousPackage = currentPackage;
  const previousWindow = mainWindow;
  const nextPackage = await packageLoader(packageId);

  // Register next handlers immediately so the new renderer can call them on boot.
  // Old handlers are kept alive until the old window is destroyed.
  for (const definition of nextPackage.ipcHandlers ?? []) {
    ipcMain.removeHandler(definition.channel);
    ipcMain.handle(definition.channel, definition.handler);
  }

  try {
    const nextWindow = await createMainWindow(nextPackage);
    mainWindow = nextWindow;
    currentPackage = nextPackage;

    if (previousWindow && !previousWindow.isDestroyed()) {
      previousWindow.destroy();
    }

    // Now that the old window is gone, remove any stale handlers it owned.
    registerIpcHandlers(nextPackage.ipcHandlers);

    writeBootLog('navigateToPackage:complete', packageId);
    return { packageId };
  } catch (error) {
    if (previousPackage) {
      registerIpcHandlers(previousPackage.ipcHandlers);
      currentPackage = previousPackage;
    }

    mainWindow = previousWindow;
    writeBootLog('navigateToPackage:error', error?.stack ?? String(error));
    throw error;
  }
}

export async function bootElectron({ entryPackage, loadPackage }) {
  writeBootLog('bootElectron:start');
  writeBootLog('bootElectron:process-type', process.type ?? 'browser');
  writeBootLog('bootElectron:app-isReady-initial', String(app.isReady()));
  currentPackage = entryPackage;
  packageLoader = loadPackage;
  registerIpcHandlers(entryPackage.ipcHandlers);
  ipcMain.removeHandler('app:navigate');
  ipcMain.handle('app:navigate', async (_event, packageId) => {
    if (typeof packageId !== 'string' || !packageId.trim()) {
      throw new Error('A valid package id is required for navigation.');
    }

    return queueNavigation(() => navigateToPackage(packageId.trim()));
  });

  app.on('activate', async () => {
    writeBootLog('app:activate');
    if (BrowserWindow.getAllWindows().length === 0) {
      const packageToOpen = currentPackage ?? entryPackage;
      mainWindow = await createMainWindow(packageToOpen);
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
