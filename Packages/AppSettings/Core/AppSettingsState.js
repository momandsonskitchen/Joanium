import {
  readUserState,
  sanitizeDefaultModel,
  writeUserState,
} from '../../Shared/UserData/UserData.js';
import { VALID_SEARCH_ENGINES } from '../../Shared/UserData/UserData.js';

const DEFAULT_SETTINGS = Object.freeze({
  runOnStartup: false,
  keepAwake: false,
  completionSound: true,
  autoMemoryUpdates: true,
  autoUpdate: true,
  showTechFeed: true,
  showChangelog: true,
  defaultView: 'chat',
  defaultModel: null,
  defaultSearchEngine: 'google',
});

function normalizeSettings(candidate = {}) {
  return {
    runOnStartup: Boolean(candidate.runOnStartup ?? DEFAULT_SETTINGS.runOnStartup),
    keepAwake: Boolean(candidate.keepAwake ?? DEFAULT_SETTINGS.keepAwake),
    completionSound: Boolean(candidate.completionSound ?? DEFAULT_SETTINGS.completionSound),
    autoMemoryUpdates: Boolean(candidate.autoMemoryUpdates ?? DEFAULT_SETTINGS.autoMemoryUpdates),
    autoUpdate: true, // always on — not user-configurable
    showTechFeed: Boolean(candidate.showTechFeed ?? DEFAULT_SETTINGS.showTechFeed),
    showChangelog: Boolean(candidate.showChangelog ?? DEFAULT_SETTINGS.showChangelog),
    defaultView: candidate.defaultView ?? DEFAULT_SETTINGS.defaultView,
    defaultModel: sanitizeDefaultModel(candidate.defaultModel),
    defaultSearchEngine: VALID_SEARCH_ENGINES.has(candidate.defaultSearchEngine)
      ? candidate.defaultSearchEngine
      : DEFAULT_SETTINGS.defaultSearchEngine,
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
    },
  };
}
