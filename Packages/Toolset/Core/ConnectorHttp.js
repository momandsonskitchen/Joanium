import { readUserState } from '../../Shared/UserData/UserData.js';

export function requireText(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`Missing required parameter: ${label}.`);
  return text;
}

export function optionalText(value) {
  return String(value ?? '').trim();
}

export function clampInteger(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
}

export function parseJsonObject(value, fallback = {}) {
  if (!value) return fallback;
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    throw new Error('Expected a valid JSON object.');
  }
}

export function parseCommaList(value = '') {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

export function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(value);
  }
}

export function truncateText(value = '', limit = 4000) {
  const text = String(value ?? '');
  return text.length > limit ? `${text.slice(0, limit)}\n...(truncated)` : text;
}

export function formatList(title, rows, empty = 'No results found.') {
  return rows.length ? [title, '', ...rows].join('\n') : [title, '', empty].join('\n');
}

export async function readConnectorDetails(rootDirectory, connectorId) {
  const state = await readUserState(rootDirectory);
  return state.connectors?.details?.[connectorId] ?? {};
}

export async function requireConnectorCredentials(rootDirectory, connectorId, keys = ['token'], label = connectorId) {
  const details = await readConnectorDetails(rootDirectory, connectorId);
  const missing = keys.find((key) => !String(details[key] ?? '').trim());
  if (missing) throw new Error(`${label} is not configured in Settings > Connectors.`);
  return details;
}

export async function readJsonResponse(response) {
  const rawText = await response.text();
  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.message
      || data?.error
      || data?.error_description
      || data?.errors?.[0]?.message
      || rawText
      || response.statusText;
    throw new Error(`${response.status} ${response.statusText}: ${message}`);
  }

  return data;
}

export async function fetchJson(url, { headers = {}, ...options } = {}) {
  return readJsonResponse(await fetch(url, {
    ...options,
    headers: {
      accept: 'application/json',
      ...headers
    }
  }));
}
