import { parseResponseJson } from '../../../Core/ConnectorHttp.js';
import strings from '../I18n/en.js';

export function readText(value, label) {
  const text = String(value ?? '').trim();
  if (!text) {
    throw new Error(strings.errors.missingParameter.replace('{label}', label));
  }
  return text;
}

export function optionalText(value) {
  return String(value ?? '').trim();
}

export function compactObject(value = {}) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null),
  );
}

export function parseLimit(value, fallback = 20, min = 1, max = 100) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
}

export function toBoolean(value, fallback = false) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return fallback;
}

export function parseObject(value, label) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value ?? ''));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {
    // Handled by the common error below.
  }
  throw new Error(strings.errors.invalidJsonObject.replace('{label}', label));
}

export async function readServiceJson(response, service) {
  const { data, text } = await parseResponseJson(response);
  if (!response.ok) {
    const fallback = strings.errors.requestFailed.replace('{service}', service);
    const message =
      data?.error?.message ?? data?.description ?? data?.message ?? data?.error ?? text ?? fallback;
    throw new Error(`${response.status} ${response.statusText}: ${message}`);
  }
  return data ?? {};
}

export function formatList(title, rows) {
  return rows.length
    ? [title, '', ...rows].join('\n')
    : [title, '', strings.output.noResults].join('\n');
}

export function truncate(value, limit = 800) {
  const text = String(value ?? '');
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}
