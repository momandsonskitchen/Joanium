import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const DEFAULT_ACTIVE_PERSONA = { namespace: 'Joanium', filename: 'Joana.md' };

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
        year: ''
      }
    },
    customInstructions: '',
    providers: {
      selected: [],
      details: {}
    },
    connectors: {
      details: {}
    },
    usageModes: [],
    activePersona: { ...DEFAULT_ACTIVE_PERSONA },
    windowState: {
      bounds: { width: 1460, height: 960, x: null, y: null },
      isMaximized: true,
      isFullScreen: false
    },
    appSettings: {
      runOnStartup: false,
      systemTray: false,
      keepAwake: false,
      completionSound: true
    },
    theme: {
      mode: 'system',
      motion: 'full'
    }
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
        ...(nextState.profile?.dateOfBirth ?? {})
      }
    },
    providers: {
      ...baseState.providers,
      ...(nextState.providers ?? {}),
      details: {
        ...baseState.providers.details,
        ...(nextState.providers?.details ?? {})
      }
    },
    connectors: {
      ...baseState.connectors,
      ...(nextState.connectors ?? {}),
      details: {
        ...baseState.connectors.details,
        ...(nextState.connectors?.details ?? {})
      }
    },
    customInstructions: nextState.customInstructions !== undefined
      ? nextState.customInstructions
      : baseState.customInstructions,
    usageModes: Array.isArray(nextState.usageModes) ? nextState.usageModes : baseState.usageModes,
    activePersona: nextState.activePersona !== undefined ? nextState.activePersona : baseState.activePersona,
    windowState: (nextState.windowState !== undefined && nextState.windowState !== null && typeof nextState.windowState === 'object')
      ? { ...baseState.windowState, ...nextState.windowState }
      : baseState.windowState,
    appSettings: (nextState.appSettings !== undefined && nextState.appSettings !== null && typeof nextState.appSettings === 'object')
      ? { ...baseState.appSettings, ...nextState.appSettings }
      : baseState.appSettings,
    theme: (nextState.theme !== undefined && nextState.theme !== null && typeof nextState.theme === 'object')
      ? { ...baseState.theme, ...nextState.theme }
      : baseState.theme
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
  if (!candidate || typeof candidate !== 'object') return { ...DEFAULT_ACTIVE_PERSONA };
  const namespace = sanitizeString(candidate.namespace);
  const filename  = sanitizeString(candidate.filename);
  if (!namespace || !filename) return { ...DEFAULT_ACTIVE_PERSONA };
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

    if (typeof connectorDetails.apiKey === 'string') {
      nextDetails[connectorId].apiKey = connectorDetails.apiKey.trim();
    }

    if (typeof connectorDetails.token === 'string') {
      nextDetails[connectorId].token = connectorDetails.token.trim();
    }
  }

  return nextDetails;
}

function sanitizeWindowState(candidate) {
  const defaults = createDefaultUserState().windowState;
  if (!candidate || typeof candidate !== 'object') return defaults;
  const bounds = (candidate.bounds && typeof candidate.bounds === 'object') ? candidate.bounds : defaults.bounds;
  return {
    bounds: {
      width: Number.isFinite(bounds.width) ? bounds.width : defaults.bounds.width,
      height: Number.isFinite(bounds.height) ? bounds.height : defaults.bounds.height,
      x: Number.isFinite(bounds.x) ? bounds.x : defaults.bounds.x,
      y: Number.isFinite(bounds.y) ? bounds.y : defaults.bounds.y
    },
    isMaximized: Boolean(candidate.isMaximized ?? defaults.isMaximized),
    isFullScreen: Boolean(candidate.isFullScreen ?? defaults.isFullScreen)
  };
}

function sanitizeAppSettings(candidate) {
  const defaults = createDefaultUserState().appSettings;
  if (!candidate || typeof candidate !== 'object') return defaults;
  return {
    runOnStartup: Boolean(candidate.runOnStartup ?? candidate.run_on_startup ?? defaults.runOnStartup),
    systemTray: Boolean(candidate.systemTray ?? candidate.system_tray ?? defaults.systemTray),
    keepAwake: Boolean(candidate.keepAwake ?? candidate.keep_awake ?? defaults.keepAwake),
    completionSound: Boolean(candidate.completionSound ?? candidate.completion_sound ?? defaults.completionSound)
  };
}

const THEME_MODES = new Set(['system', 'light', 'dark']);
const MOTION_MODES = new Set(['full', 'reduced']);

function sanitizeTheme(candidate) {
  const defaults = createDefaultUserState().theme;
  if (!candidate || typeof candidate !== 'object') return defaults;
  return {
    mode: THEME_MODES.has(candidate.mode) ? candidate.mode : defaults.mode,
    motion: MOTION_MODES.has(candidate.motion) ? candidate.motion : defaults.motion
  };
}

export function sanitizeIncomingUserState(candidateState) {
  const baseState = createDefaultUserState();

  return mergeUserStates(baseState, {
    locale: sanitizeString(candidateState?.locale) || baseState.locale,
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
        year: sanitizeString(candidateState?.profile?.dateOfBirth?.year)
      }
    },
    customInstructions: sanitizeString(candidateState?.customInstructions ?? candidateState?.custom_instructions),
    providers: {
      selected: sanitizeArray(candidateState?.providers?.selected),
      details: sanitizeDetails(candidateState?.providers?.details)
    },
    connectors: {
      details: sanitizeConnectorDetails(candidateState?.connectors?.details)
    },
    usageModes: sanitizeArray(candidateState?.usageModes),
    activePersona: sanitizeActivePersona(candidateState?.activePersona),
    windowState: sanitizeWindowState(candidateState?.windowState),
    appSettings: sanitizeAppSettings(candidateState?.appSettings),
    theme: sanitizeTheme(candidateState?.theme)
  });
}

function getUserDataFilePath(rootDirectory) {
  return path.join(rootDirectory, 'Data', 'User.json');
}

export async function readUserState(rootDirectory) {
  const userFilePath = getUserDataFilePath(rootDirectory);

  try {
    const fileContents = await readFile(userFilePath, 'utf8');

    if (!fileContents.trim()) {
      return createDefaultUserState();
    }

    return sanitizeIncomingUserState(JSON.parse(fileContents));
  } catch {
    return createDefaultUserState();
  }
}

export async function writeUserState(rootDirectory, nextState) {
  const userFilePath = getUserDataFilePath(rootDirectory);
  await mkdir(path.dirname(userFilePath), { recursive: true });
  await writeFile(userFilePath, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8');
  return nextState;
}
