import { readUserState, writeUserState } from '../../Shared/UserData/UserData.js';

const DEFAULT_SETTINGS = Object.freeze({
  runOnStartup: false,
  systemTray: false,
  keepAwake: false,
  completionSound: true,
  animations: true
});

function normalizeSettings(candidate = {}) {
  return {
    runOnStartup: Boolean(candidate.runOnStartup ?? candidate.run_on_startup ?? DEFAULT_SETTINGS.runOnStartup),
    systemTray: Boolean(candidate.systemTray ?? candidate.system_tray ?? DEFAULT_SETTINGS.systemTray),
    keepAwake: Boolean(candidate.keepAwake ?? candidate.keep_awake ?? DEFAULT_SETTINGS.keepAwake),
    completionSound: Boolean(candidate.completionSound ?? candidate.completion_sound ?? DEFAULT_SETTINGS.completionSound),
    animations: Boolean(candidate.animations ?? DEFAULT_SETTINGS.animations)
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
