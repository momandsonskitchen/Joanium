export const setupStepIds = ['consent', 'name', 'dob', 'providers', 'usage', 'welcome'];

function cloneState(value) {
  return JSON.parse(JSON.stringify(value));
}

function isValidDate({ day, month, year }) {
  const normalizedDay = Number.parseInt(day, 10);
  const normalizedMonth = Number.parseInt(month, 10);
  const normalizedYear = Number.parseInt(year, 10);

  if (!normalizedDay || !normalizedMonth || !normalizedYear) {
    return false;
  }

  const date = new Date(Date.UTC(normalizedYear, normalizedMonth - 1, normalizedDay));

  if (
    date.getUTCFullYear() !== normalizedYear ||
    date.getUTCMonth() !== normalizedMonth - 1 ||
    date.getUTCDate() !== normalizedDay
  ) {
    return false;
  }

  return date.getTime() <= Date.now();
}

function providerHasRequirements(provider, details) {
  for (const requirement of provider.requirements) {
    const value =
      typeof details?.[requirement.key] === 'string' ? details[requirement.key].trim() : '';

    if (!value) {
      return false;
    }

    if (requirement.kind === 'url') {
      try {
        new URL(value);
      } catch {
        return false;
      }
    }
  }

  return true;
}

function buildProviderDetails(providers, persistedDetails = {}) {
  const details = {};

  for (const provider of providers) {
    const existing = persistedDetails[provider.id] ?? {};
    details[provider.id] = {};

    for (const requirement of provider.requirements) {
      details[provider.id][requirement.key] = existing[requirement.key] || requirement.defaultValue;
    }
  }

  return details;
}

export function validateStep(stepId, state, providersById) {
  if (stepId === 'consent') {
    return state.consentAccepted;
  }

  if (stepId === 'name') {
    return state.profile.name.trim().length >= 2;
  }

  if (stepId === 'dob') {
    return isValidDate(state.profile.dateOfBirth);
  }

  if (stepId === 'providers') {
    if (state.providers.selected.length === 0) {
      return false;
    }

    return state.providers.selected.every((providerId) => {
      const provider = providersById.get(providerId);

      if (!provider) {
        return false;
      }

      return providerHasRequirements(provider, state.providers.details[providerId]);
    });
  }

  if (stepId === 'usage') {
    return state.usageModes.length > 0;
  }

  return true;
}

export function calculateLastCompletedStep(state, providersById) {
  let completed = 0;

  for (const stepId of setupStepIds.slice(0, -1)) {
    if (!validateStep(stepId, state, providersById)) {
      break;
    }

    completed += 1;
  }

  return completed;
}

export function findInitialScene(state, providersById) {
  for (const stepId of setupStepIds.slice(0, -1)) {
    if (!validateStep(stepId, state, providersById)) {
      return stepId;
    }
  }

  return 'welcome';
}

export function hydrateSetupState({ persistedState, providers }) {
  const state = cloneState(persistedState);
  state.providers.details = buildProviderDetails(providers, state.providers.details);
  return state;
}

export function serializeSetupState(state, providersById) {
  return {
    locale: state.locale,
    consentAccepted: state.consentAccepted,
    onboardingCompleted: state.onboardingCompleted,
    completedAt: state.completedAt,
    lastCompletedStep: calculateLastCompletedStep(state, providersById),
    profile: cloneState(state.profile),
    providers: cloneState(state.providers),
    usageModes: [...state.usageModes],
  };
}
