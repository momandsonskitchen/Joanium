import { getWritableDataDirectory, readJsonFile, writeJsonFile } from '../Storage/ResourcePaths.js';

// In dev, writable user data lives under Data/ in the project root.
// When packaged, Program Files is read-only — use the OS user-data directory instead.
// Windows: %APPDATA%\Joanium  |  macOS: ~/Library/Application Support/Joanium
export { getWritableDataDirectory };

const DEFAULT_ACTIVE_PERSONA = { namespace: 'Joanium', filename: 'Joana.md' };

export const VALID_SEARCH_ENGINES = new Set([
  'google',
  'bing',
  'duckduckgo',
  'yandex',
  'yahoo',
  'brave',
  'ecosia',
  'kagi',
  'perplexity',
  'startpage',
  'baidu',
  'naver',
  'qwant',
  'swisscows',
  'wolframalpha',
  'ask',
  'aol',
  'dogpile',
  'mojeek',
  'you',
]);

export function createDefaultUserState() {
  return {
    locale: 'en',
    consentAccepted: false,
    onboardingCompleted: false,
    completedAt: null,
    lastCompletedStep: 0,
    profile: {
      name: '',
      avatarPath: null,
      dateOfBirth: {
        day: '',
        month: '',
        year: '',
      },
    },
    customInstructions: '',
    providers: {
      selected: [],
      details: {},
    },
    connectors: {
      details: {},
    },
    usageModes: [],
    activePersona: { ...DEFAULT_ACTIVE_PERSONA },
    windowState: {
      bounds: { width: 1460, height: 960, x: null, y: null },
      isMaximized: true,
      isFullScreen: false,
    },
    appSettings: {
      runOnStartup: false,
      systemTray: false,
      keepAwake: false,
      completionSound: true,
      autoMemoryUpdates: true,
      autoUpdate: true,
      showTechFeed: true,
      showChangelog: true,
      defaultView: 'chat',
      defaultModel: null,
      defaultSearchEngine: 'google',
    },
    whatsNewSeenVersion: null,
    lastDreamt: null,
    theme: {
      mode: 'system',
      motion: 'full',
      font: 'system',
    },
  };
}

export function mergeUserStates(baseState, nextState = {}) {
  return {
    ...baseState,
    ...nextState,
    profile: {
      ...baseState.profile,
      ...(nextState.profile ?? {}),
      dateOfBirth: {
        ...baseState.profile.dateOfBirth,
        ...(nextState.profile?.dateOfBirth ?? {}),
      },
    },
    providers: {
      ...baseState.providers,
      ...(nextState.providers ?? {}),
      details: {
        ...baseState.providers.details,
        ...(nextState.providers?.details ?? {}),
      },
    },
    connectors: {
      ...baseState.connectors,
      ...(nextState.connectors ?? {}),
      details: {
        ...baseState.connectors.details,
        ...(nextState.connectors?.details ?? {}),
      },
    },
    customInstructions:
      nextState.customInstructions !== undefined
        ? nextState.customInstructions
        : baseState.customInstructions,
    usageModes: Array.isArray(nextState.usageModes) ? nextState.usageModes : baseState.usageModes,
    activePersona:
      nextState.activePersona !== undefined ? nextState.activePersona : baseState.activePersona,
    windowState:
      nextState.windowState !== undefined &&
      nextState.windowState !== null &&
      typeof nextState.windowState === 'object'
        ? { ...baseState.windowState, ...nextState.windowState }
        : baseState.windowState,
    appSettings:
      nextState.appSettings !== undefined &&
      nextState.appSettings !== null &&
      typeof nextState.appSettings === 'object'
        ? { ...baseState.appSettings, ...nextState.appSettings }
        : baseState.appSettings,
    whatsNewSeenVersion:
      nextState.whatsNewSeenVersion !== undefined
        ? nextState.whatsNewSeenVersion
        : baseState.whatsNewSeenVersion,
    lastDreamt: nextState.lastDreamt !== undefined ? nextState.lastDreamt : baseState.lastDreamt,
    theme:
      nextState.theme !== undefined &&
      nextState.theme !== null &&
      typeof nextState.theme === 'object'
        ? { ...baseState.theme, ...nextState.theme }
        : baseState.theme,
  };
}

function sanitizeArray(candidate) {
  return Array.isArray(candidate) ? candidate.filter((item) => typeof item === 'string') : [];
}

function sanitizeString(candidate) {
  return typeof candidate === 'string' ? candidate.trim() : '';
}

function sanitizeAvatarPath(candidate) {
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate.trim();
  }
  return null;
}

function sanitizeActivePersona(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    return { ...DEFAULT_ACTIVE_PERSONA };
  }
  const namespace = sanitizeString(candidate.namespace);
  const filename = sanitizeString(candidate.filename);
  if (!namespace || !filename) {
    return { ...DEFAULT_ACTIVE_PERSONA };
  }
  return { namespace, filename };
}

function sanitizeDetails(details) {
  if (!details || typeof details !== 'object') {
    return {};
  }

  const nextDetails = {};

  for (const [providerId, providerDetails] of Object.entries(details)) {
    if (!providerDetails || typeof providerDetails !== 'object') {
      continue;
    }

    nextDetails[providerId] = {};

    if (typeof providerDetails.apiKey === 'string') {
      nextDetails[providerId].apiKey = providerDetails.apiKey.trim();
    }

    if (typeof providerDetails.endpoint === 'string') {
      nextDetails[providerId].endpoint = providerDetails.endpoint.trim();
    }
  }

  return nextDetails;
}

function sanitizeConnectorDetails(details) {
  if (!details || typeof details !== 'object') {
    return {};
  }

  const nextDetails = {};

  for (const [connectorId, connectorDetails] of Object.entries(details)) {
    if (!connectorDetails || typeof connectorDetails !== 'object') {
      continue;
    }

    nextDetails[connectorId] = {};

    for (const [key, value] of Object.entries(connectorDetails)) {
      if (typeof value === 'string') {
        nextDetails[connectorId][key] = value.trim();
      } else if (typeof value === 'boolean' || Number.isFinite(value)) {
        nextDetails[connectorId][key] = value;
      }
    }
  }

  return nextDetails;
}

function sanitizeWindowState(candidate) {
  const defaults = createDefaultUserState().windowState;
  if (!candidate || typeof candidate !== 'object') {
    return defaults;
  }
  const bounds =
    candidate.bounds && typeof candidate.bounds === 'object' ? candidate.bounds : defaults.bounds;
  return {
    bounds: {
      width: Number.isFinite(bounds.width) ? bounds.width : defaults.bounds.width,
      height: Number.isFinite(bounds.height) ? bounds.height : defaults.bounds.height,
      x: Number.isFinite(bounds.x) ? bounds.x : defaults.bounds.x,
      y: Number.isFinite(bounds.y) ? bounds.y : defaults.bounds.y,
    },
    isMaximized: Boolean(candidate.isMaximized ?? defaults.isMaximized),
    isFullScreen: Boolean(candidate.isFullScreen ?? defaults.isFullScreen),
  };
}

const VALID_DEFAULT_VIEWS = new Set([
  'chat',
  'history',
  'projects',
  'memory',
  'templates',
  'agents',
  'skills',
  'personas',
  'marketplace',
  'events',
  'usage',
]);

export function sanitizeDefaultModel(candidate) {
  if (
    candidate &&
    typeof candidate === 'object' &&
    typeof candidate.providerId === 'string' &&
    candidate.providerId.trim() &&
    typeof candidate.modelId === 'string' &&
    candidate.modelId.trim()
  ) {
    return { providerId: candidate.providerId.trim(), modelId: candidate.modelId.trim() };
  }
  return null;
}

function sanitizeAppSettings(candidate) {
  const defaults = createDefaultUserState().appSettings;
  if (!candidate || typeof candidate !== 'object') {
    return defaults;
  }
  const rawView = candidate.defaultView ?? candidate.default_view ?? defaults.defaultView;
  return {
    runOnStartup: Boolean(
      candidate.runOnStartup ?? candidate.run_on_startup ?? defaults.runOnStartup,
    ),
    systemTray: Boolean(candidate.systemTray ?? candidate.system_tray ?? defaults.systemTray),
    keepAwake: Boolean(candidate.keepAwake ?? candidate.keep_awake ?? defaults.keepAwake),
    completionSound: Boolean(
      candidate.completionSound ?? candidate.completion_sound ?? defaults.completionSound,
    ),
    autoMemoryUpdates: Boolean(
      candidate.autoMemoryUpdates ?? candidate.auto_memory_updates ?? defaults.autoMemoryUpdates,
    ),
    autoUpdate: Boolean(candidate.autoUpdate ?? candidate.auto_update ?? defaults.autoUpdate),
    showTechFeed: Boolean(candidate.showTechFeed ?? defaults.showTechFeed),
    showChangelog: Boolean(candidate.showChangelog ?? defaults.showChangelog),
    defaultView: VALID_DEFAULT_VIEWS.has(rawView) ? rawView : defaults.defaultView,
    defaultModel: sanitizeDefaultModel(candidate.defaultModel),
    defaultSearchEngine: VALID_SEARCH_ENGINES.has(candidate.defaultSearchEngine)
      ? candidate.defaultSearchEngine
      : defaults.defaultSearchEngine,
  };
}

const THEME_MODES = new Set(['system', 'light', 'dark']);
const MOTION_MODES = new Set(['full', 'reduced']);
const FONT_MODES = new Set([
  'system',
  'sora',
  'dm-sans',
  'nunito',
  'plus-jakarta',
  'outfit',
  'manrope',
  'poppins',
]);

export function sanitizeTheme(candidate) {
  const defaults = createDefaultUserState().theme;
  if (!candidate || typeof candidate !== 'object') {
    return defaults;
  }
  return {
    mode: THEME_MODES.has(candidate.mode) ? candidate.mode : defaults.mode,
    motion: MOTION_MODES.has(candidate.motion) ? candidate.motion : defaults.motion,
    font: FONT_MODES.has(candidate.font) ? candidate.font : defaults.font,
  };
}

function sanitizeCleanupTimestamp(candidate) {
  if (typeof candidate !== 'string' || !candidate.trim()) return null;
  const ms = Date.parse(candidate);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

export function sanitizeIncomingUserState(candidateState) {
  const baseState = createDefaultUserState();

  return mergeUserStates(baseState, {
    locale:
      sanitizeString(
        candidateState?.locale ??
          candidateState?.appSettings?.locale ??
          candidateState?.appSettings?.app_language,
      ) || baseState.locale,
    onboardingCompleted: Boolean(candidateState?.onboardingCompleted),
    consentAccepted: Boolean(candidateState?.consentAccepted),
    completedAt: candidateState?.completedAt ?? null,
    lastCompletedStep: Number.isInteger(candidateState?.lastCompletedStep)
      ? candidateState.lastCompletedStep
      : 0,
    profile: {
      name: sanitizeString(candidateState?.profile?.name),
      avatarPath: sanitizeAvatarPath(candidateState?.profile?.avatarPath),
      dateOfBirth: {
        day: sanitizeString(candidateState?.profile?.dateOfBirth?.day),
        month: sanitizeString(candidateState?.profile?.dateOfBirth?.month),
        year: sanitizeString(candidateState?.profile?.dateOfBirth?.year),
      },
    },
    customInstructions: sanitizeString(
      candidateState?.customInstructions ?? candidateState?.custom_instructions,
    ),
    providers: {
      selected: sanitizeArray(candidateState?.providers?.selected),
      details: sanitizeDetails(candidateState?.providers?.details),
    },
    connectors: {
      details: sanitizeConnectorDetails(candidateState?.connectors?.details),
    },
    usageModes: sanitizeArray(candidateState?.usageModes),
    activePersona: sanitizeActivePersona(candidateState?.activePersona),
    windowState: sanitizeWindowState(candidateState?.windowState),
    appSettings: sanitizeAppSettings(candidateState?.appSettings),
    whatsNewSeenVersion:
      typeof candidateState?.whatsNewSeenVersion === 'string'
        ? candidateState.whatsNewSeenVersion.trim()
        : null,
    lastDreamt: sanitizeCleanupTimestamp(candidateState?.lastDreamt),
    theme: sanitizeTheme(candidateState?.theme),
  });
}

export async function readUserState(rootDirectory) {
  try {
    const data = await readJsonFile(rootDirectory, 'User.json', 'Data', {
      writable: true,
      optional: true,
      defaultValue: createDefaultUserState(),
    });
    return sanitizeIncomingUserState(data);
  } catch {
    return createDefaultUserState();
  }
}

// Serialise all disk writes so concurrent save-draft IPC calls never race
// over the same .tmp file on Windows (EPERM on rename when the file is still
// open / locked by the previous write).
let _writeQueue = Promise.resolve();

async function _doWriteUserState(rootDirectory, nextState) {
  await writeJsonFile(rootDirectory, 'User.json', 'Data', nextState);
  return nextState;
}

export function writeUserState(rootDirectory, nextState) {
  // Chain onto the current tail of the queue. Use the same callback for both
  // fulfilled and rejected so a failed write never stalls subsequent ones.
  const task = () => _doWriteUserState(rootDirectory, nextState);
  _writeQueue = _writeQueue.then(task, task);
  return _writeQueue;
}
