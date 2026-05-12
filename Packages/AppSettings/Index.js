import { app, BrowserWindow } from 'electron';
import { createAppSettingsStateManager } from './Core/AppSettingsState.js';
import { isKeepAwakeActive, startKeepAwake, stopKeepAwake } from './Core/PowerService.js';
import { disableTray, enableTray, isTrayActive, rememberWindow } from './Core/TrayService.js';

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
    ],
  };
}
