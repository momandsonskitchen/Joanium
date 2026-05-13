import { app, BrowserWindow } from 'electron';
import process from 'node:process';
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

export async function createPackage({ rootDirectory }) {
  const stateManager = createAppSettingsStateManager({ rootDirectory });
  let cachedSettings = await stateManager.readSettings();

  function applySettings(settings, windowRef = null) {
    cachedSettings = settings;

    if (settings.keepAwake) startKeepAwake();
    else stopKeepAwake();

    if (settings.systemTray) enableTray(rootDirectory, windowRef);
    else disableTray();

    setAutoUpdateEnabled(settings.autoUpdate);

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
      setupAutoUpdates({ rootDirectory, enabled: cachedSettings.autoUpdate });
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
    ],
  };
}
