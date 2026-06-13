export function clampInteger(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
}

export function compactObject(value = {}) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null),
  );
}

export function optionalText(value) {
  return String(value ?? '').trim();
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function toBoolean(value, fallback = false) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return fallback;
}

export function formatBytes(bytes = 0) {
  const value = Number(bytes) || 0;
  if (value <= 0) return '';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let nextValue = value;
  let unitIndex = 0;

  while (nextValue >= 1024 && unitIndex < units.length - 1) {
    nextValue /= 1024;
    unitIndex += 1;
  }

  const decimals = nextValue >= 10 || unitIndex === 0 ? 0 : 1;
  return `${nextValue.toFixed(decimals)} ${units[unitIndex]}`;
}
