import {
  readUserState,
  sanitizeDefaultModel,
  writeUserState,
} from '../../Shared/UserData/UserData.js';

const DEFAULT_SETTINGS = Object.freeze({
  runOnStartup: false,
  systemTray: false,
  keepAwake: false,
  completionSound: true,
  autoMemoryUpdates: true,
  autoUpdate: true,
  defaultView: 'chat',
  defaultModel: null,
});

const SUPPORTED_LOCALES = new Set([
  'en',
  'de',
  'ja',
  'ml',
  'sv',
  'ru',
  'ta',
  'fr',
  'hi',
  'nl',
  'es',
  'th',
  'ar',
  'pt',
  'it',
  'mr',
  'ko',
  'zh',
  'fi',
  'da',
  'cs',
  'kn',
  'te',
  'uk',
  'pl',
  'ro',
  'hu',
  'el',
  'he',
  'bg',
  'is',
  'cy',
  'ga',
  'tr',
]);

function normalizeLocale(candidate) {
  const locale = String(candidate ?? '').trim();
  return SUPPORTED_LOCALES.has(locale) ? locale : 'en';
}

function normalizeSettings(candidate = {}) {
  return {
    runOnStartup: Boolean(candidate.runOnStartup ?? DEFAULT_SETTINGS.runOnStartup),
    systemTray: Boolean(candidate.systemTray ?? DEFAULT_SETTINGS.systemTray),
    keepAwake: Boolean(candidate.keepAwake ?? DEFAULT_SETTINGS.keepAwake),
    completionSound: Boolean(candidate.completionSound ?? DEFAULT_SETTINGS.completionSound),
    autoMemoryUpdates: Boolean(candidate.autoMemoryUpdates ?? DEFAULT_SETTINGS.autoMemoryUpdates),
    autoUpdate: Boolean(candidate.autoUpdate ?? DEFAULT_SETTINGS.autoUpdate),
    defaultView: candidate.defaultView ?? DEFAULT_SETTINGS.defaultView,
    defaultModel: sanitizeDefaultModel(candidate.defaultModel),
  };
}

export function createAppSettingsStateManager({ rootDirectory }) {
  async function readSettings() {
    const userState = await readUserState(rootDirectory);
    return {
      ...normalizeSettings(userState.appSettings),
      locale: normalizeLocale(userState.locale),
    };
  }

  async function writeSettings(settings) {
    const normalized = normalizeSettings(settings);
    const userState = await readUserState(rootDirectory);
    const locale = normalizeLocale(settings.locale ?? userState.locale);
    await writeUserState(rootDirectory, { ...userState, locale, appSettings: normalized });
    return { ...normalized, locale };
  }

  return {
    readSettings,
    async updateSettings(patch = {}) {
      const current = await readSettings();
      return writeSettings({ ...current, ...patch });
    },
  };
}
