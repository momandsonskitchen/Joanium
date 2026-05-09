import path from 'node:path';
import { app, BrowserWindow, ipcMain, powerSaveBlocker } from 'electron';
import { createBootLogger } from '../Boot/Index.js';
import {
  applyWindowState,
  attachWindowStatePersistence,
  readWindowState
} from './Core/WindowState.js';

// Prevent Chromium from throttling timers, IPC, and JS execution when the
// window is in the background. Without these the app becomes unresponsive
// after being backgrounded for an extended period.
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('force-color-profile', 'srgb');

// Disable Windows' native window occlusion tracker. Chromium uses this OS
// signal to throttle occluded windows through a separate code path that
// disable-backgrounding-occluded-windows alone does not cover.
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

// Speed up GPU channel establishment so the first frame renders immediately
// when the user switches back to the app after a long absence.
app.commandLine.appendSwitch('enable-features', 'EarlyEstablishGpuChannel,EstablishGpuChannelAsync');

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
  const rootDirectory = process.cwd();
  const windowState = await readWindowState(rootDirectory);
  const browserWindow = new BrowserWindow({
    ...windowState.bounds,
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
      spellcheck: false,
      backgroundThrottling: false
    },
    ...entryPackage.window
  });
  applyWindowState(browserWindow, windowState);
  attachWindowStatePersistence(browserWindow, rootDirectory);

  const ensureVisible = () => {
    if (browserWindow.isDestroyed()) {
      return;
    }

    if (browserWindow.isMinimized()) {
      browserWindow.restore();
    }

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

  // ── Production hardening ───────────────────────────────────────────────────
  // Only active in packaged builds. During development these stay open so you
  // can use DevTools and reload normally.
  if (app.isPackaged) {
    // Disable DevTools entirely — prevents Ctrl+Shift+I / F12 from opening it.
    // The keydown events still reach the renderer so app shortcuts still fire.
    browserWindow.webContents.setDevToolsEnabled(false);

    // Block reload shortcuts at the input level before Electron/Chromium acts
    // on them. Ctrl+R, Ctrl+Shift+R and F5 would otherwise reload the page
    // and wipe all in-memory state.
    browserWindow.webContents.on('before-input-event', (event, input) => {
      const key = input.key.toLowerCase();
      const ctrl = input.control || input.meta;

      const isReload     = ctrl && !input.shift && key === 'r';
      const isHardReload = ctrl &&  input.shift && key === 'r';
      const isF5         = key === 'f5';

      if (isReload || isHardReload || isF5) {
        event.preventDefault();
      }
    });
  }

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
    if (globalThis.JoaniumRuntime?.shouldStayResident?.()) {
      return;
    }
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
    powerSaveBlocker.start('prevent-app-suspension');
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
