import { app, BrowserWindow } from 'electron';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { getWritableDataDirectory } from '../Shared/Storage/ResourcePaths.js';
import { createAppSettingsStateManager } from './Core/AppSettingsState.js';
import { isKeepAwakeActive, startKeepAwake, stopKeepAwake } from './Core/PowerService.js';
import { disableTray, enableTray, isTrayActive, rememberWindow } from './Core/TrayService.js';
import {
  checkForAppUpdates,
  getAutoUpdateState,
  installDownloadedUpdate,
  setAutoUpdateEnabled,
  setupAutoUpdates,
} from './Core/AutoUpdateService.js';
import { exportData, importData } from './Core/DataPortabilityService.js';

function applyLoginItemSetting(enabled) {
  app.setLoginItemSettings({
    openAtLogin: Boolean(enabled),
    ...(process.platform === 'linux' ? {} : { openAsHidden: Boolean(enabled) }),
  });
}

function runtimeStatus(settings) {
  return {
    ...settings,
    keepAwakeActive: isKeepAwakeActive(),
    trayActive: isTrayActive(),
    autoUpdateState: getAutoUpdateState(),
  };
}

function ownerWindow(event) {
  return event?.sender?.getOwnerBrowserWindow?.() ?? BrowserWindow.getAllWindows()[0] ?? null;
}

const RESET_DATA_ENTRIES = [
  'Agents',
  'Avatar.avif',
  'Avatar.bmp',
  'Avatar.gif',
  'Avatar.jpeg',
  'Avatar.jpg',
  'Avatar.png',
  'Avatar.webp',
  'ChannelMessages',
  'Channels.json',
  'Chats',
  'Logs',
  'MCPServers.json',
  'Memories',
  'Models',
  'Projects',
  'Screenshots',
  'Security.json',
  'System.json',
  'Templates',
  'Usage.json',
  'User.json',
];

function restartApp(delayMs = 120) {
  setTimeout(() => {
    app.relaunch();
    app.exit(0);
  }, delayMs);

  return { ok: true, relaunching: true };
}

function quitApp(delayMs = 120) {
  setTimeout(() => {
    app.quit();
  }, delayMs);

  return { ok: true, quitting: true };
}

async function resetAppData(rootDirectory) {
  const dataDirectory = getWritableDataDirectory(rootDirectory);

  await Promise.all(
    RESET_DATA_ENTRIES.map((entry) =>
      rm(path.join(dataDirectory, entry), { recursive: true, force: true }),
    ),
  );

  return restartApp();
}

export async function createPackage({ rootDirectory }) {
  const stateManager = createAppSettingsStateManager({ rootDirectory });
  let cachedSettings = await stateManager.readSettings();

  function applySettings(settings, windowRef = null) {
    cachedSettings = settings;

    if (settings.keepAwake) startKeepAwake();
    else stopKeepAwake();

    if (settings.systemTray) enableTray(rootDirectory, windowRef);
    else disableTray();

    setAutoUpdateEnabled(true);

    return runtimeStatus(settings);
  }

  globalThis.JoaniumRuntime = {
    ...(globalThis.JoaniumRuntime ?? {}),
    shouldStayResident: () => Boolean(cachedSettings.systemTray && isTrayActive()),
  };

  app.on('browser-window-created', (_event, windowRef) => {
    rememberWindow(windowRef);
    if (cachedSettings.systemTray) enableTray(rootDirectory, windowRef);
  });

  app
    .whenReady()
    .then(() => {
      setupAutoUpdates({ rootDirectory, enabled: true });
      applySettings(cachedSettings, BrowserWindow.getAllWindows()[0] ?? null);
    })
    .catch(() => {});

  return {
    id: 'AppSettings',
    ipcHandlers: [
      {
        channel: 'app-settings:get',
        handler: async () => runtimeStatus(await stateManager.readSettings()),
      },
      {
        channel: 'app-settings:save',
        handler: async (event, patch) => {
          const saved = await stateManager.updateSettings(patch);

          if (patch && Object.prototype.hasOwnProperty.call(patch, 'runOnStartup')) {
            applyLoginItemSetting(saved.runOnStartup);
          }

          return applySettings(saved, ownerWindow(event));
        },
      },
      {
        channel: 'auto-update:get-state',
        handler: async () => getAutoUpdateState(),
      },
      {
        channel: 'auto-update:check',
        handler: async () => checkForAppUpdates(),
      },
      {
        channel: 'auto-update:install',
        handler: async () => installDownloadedUpdate(),
      },
      {
        channel: 'app-settings:reset-app',
        handler: async () => resetAppData(rootDirectory),
      },
      {
        channel: 'app-settings:restart-app',
        handler: async () => restartApp(),
      },
      {
        channel: 'app-settings:quit-app',
        handler: async () => quitApp(),
      },
      // ── Data portability ─────────────────────────────────────────────────
      {
        channel: 'data:export',
        handler: async () => exportData(rootDirectory),
      },
      {
        channel: 'data:import',
        handler: async () => importData(rootDirectory),
      },
    ],
  };
}
