export function hasExplicitValue(value) {
  return value !== undefined && value !== null;
}

export function normalizeString(value) {
  return typeof value === 'string' ? value : '';
}

export function resolveRuntimeValue(explicitValue, loadedValue, fallbackValue = '') {
  if (hasExplicitValue(explicitValue)) {
    return normalizeString(explicitValue);
  }

  return normalizeString(loadedValue) || normalizeString(fallbackValue);
}

export function applyOptionalRequestValue(request, key, value) {
  if (value !== undefined && value !== null && value !== '') {
    request[key] = value;
  }
}
