import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { readProviderCatalog } from './ProviderCatalog.js';

function createDefaultState() {
  return {
    locale: 'en',
    consentAccepted: false,
    onboardingCompleted: false,
    completedAt: null,
    lastCompletedStep: 0,
    profile: {
      name: '',
      dateOfBirth: {
        day: '',
        month: '',
        year: ''
      }
    },
    providers: {
      selected: [],
      details: {}
    },
    usageModes: []
  };
}

function mergeStates(baseState, nextState = {}) {
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
    usageModes: Array.isArray(nextState.usageModes) ? nextState.usageModes : baseState.usageModes
  };
}

function sanitizeArray(candidate) {
  return Array.isArray(candidate) ? candidate.filter((item) => typeof item === 'string') : [];
}

function sanitizeString(candidate) {
  return typeof candidate === 'string' ? candidate.trim() : '';
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

function sanitizeIncomingState(candidateState) {
  const baseState = createDefaultState();

  return mergeStates(baseState, {
    locale: sanitizeString(candidateState?.locale) || baseState.locale,
    onboardingCompleted: Boolean(candidateState?.onboardingCompleted),
    consentAccepted: Boolean(candidateState?.consentAccepted),
    completedAt: candidateState?.completedAt ?? null,
    lastCompletedStep: Number.isInteger(candidateState?.lastCompletedStep)
      ? candidateState.lastCompletedStep
      : 0,
    profile: {
      name: sanitizeString(candidateState?.profile?.name),
      dateOfBirth: {
        day: sanitizeString(candidateState?.profile?.dateOfBirth?.day),
        month: sanitizeString(candidateState?.profile?.dateOfBirth?.month),
        year: sanitizeString(candidateState?.profile?.dateOfBirth?.year)
      }
    },
    providers: {
      selected: sanitizeArray(candidateState?.providers?.selected),
      details: sanitizeDetails(candidateState?.providers?.details)
    },
    usageModes: sanitizeArray(candidateState?.usageModes)
  });
}

export function createSetupStateManager({ rootDirectory }) {
  const userFilePath = path.join(rootDirectory, 'Data', 'User.json');

  async function readPersistedState() {
    try {
      const fileContents = await readFile(userFilePath, 'utf8');

      if (!fileContents.trim()) {
        return createDefaultState();
      }

      return sanitizeIncomingState(JSON.parse(fileContents));
    } catch {
      return createDefaultState();
    }
  }

  async function writePersistedState(nextState) {
    await mkdir(path.dirname(userFilePath), { recursive: true });
    await writeFile(userFilePath, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8');
    return nextState;
  }

  return {
    async getBootstrapPayload() {
      const [state, providers] = await Promise.all([
        readPersistedState(),
        readProviderCatalog(rootDirectory)
      ]);

      return {
        state,
        providers,
        logoPath: pathToFileURL(path.join(rootDirectory, 'Assets', 'Logo', 'Logo.png')).href
      };
    },
    async saveDraft(draftState) {
      const currentState = await readPersistedState();
      const mergedState = mergeStates(currentState, sanitizeIncomingState(draftState));
      mergedState.onboardingCompleted = false;
      mergedState.completedAt = null;
      return writePersistedState(mergedState);
    },
    async completeOnboarding(completedState) {
      const currentState = await readPersistedState();
      const mergedState = mergeStates(currentState, sanitizeIncomingState(completedState));
      mergedState.onboardingCompleted = true;
      mergedState.completedAt = new Date().toISOString();
      return writePersistedState(mergedState);
    }
  };
}
