import { readUserState, writeUserState } from '../../Shared/UserData/UserData.js';

const DEFAULT_SETTINGS = Object.freeze({
  runOnStartup: false,
  systemTray: false,
  keepAwake: false,
  completionSound: true,
  defaultView: 'chat'
});

function normalizeSettings(candidate = {}) {
  return {
    runOnStartup: Boolean(candidate.runOnStartup ?? DEFAULT_SETTINGS.runOnStartup),
    systemTray: Boolean(candidate.systemTray ?? DEFAULT_SETTINGS.systemTray),
    keepAwake: Boolean(candidate.keepAwake ?? DEFAULT_SETTINGS.keepAwake),
    completionSound: Boolean(candidate.completionSound ?? DEFAULT_SETTINGS.completionSound),
    defaultView: candidate.defaultView ?? DEFAULT_SETTINGS.defaultView
  };
}

export function createAppSettingsStateManager({ rootDirectory }) {
  async function readSettings() {
    const userState = await readUserState(rootDirectory);
    return normalizeSettings(userState.appSettings);
  }

  async function writeSettings(settings) {
    const normalized = normalizeSettings(settings);
    const userState = await readUserState(rootDirectory);
    await writeUserState(rootDirectory, { ...userState, appSettings: normalized });
    return normalized;
  }

  return {
    readSettings,
    async updateSettings(patch = {}) {
      const current = await readSettings();
      return writeSettings({ ...current, ...patch });
    }
  };
}
