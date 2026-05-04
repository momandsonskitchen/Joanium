import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

export function createDefaultUserState() {
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
