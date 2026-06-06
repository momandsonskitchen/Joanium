import { createConnectorCredentialHelpers } from '../Core/ConnectorUtils.js';

export const GOOGLE_NOT_CONNECTED_MESSAGE =
  'Google Workspace not connected - connect it in Settings -> Connectors';

export function requireParam(params, key) {
  const value = params[key];
  if (null == value || (typeof value === 'string' && !value.trim())) {
    throw new Error(`Missing required param: ${key}`);
  }
  return typeof value === 'string' ? value.trim() : value;
}

export function formatGoogleDate(value) {
  if (!value) return 'unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function appendCsvParams(params, key, value) {
  String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => params.append(key, item));
}

export function googlePageSize(value, fallback = 25, max = 100) {
  const parsed = Number(value);
  const size = Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
  return String(Math.min(size, max));
}

export function normalizeGoogleResourceName(value, prefix, paramName) {
  const name = String(value ?? '').trim();
  if (!name) throw new Error(`${paramName} is required`);
  return name.startsWith(`${prefix}/`) ? name : `${prefix}/${name}`;
}

const {
  getCredentials: getGoogleCredentials,
  requireCredentials: requireGoogleCredentials,
  notConnected: googleNotConnected,
  withCredentials: withGoogle,
} = createConnectorCredentialHelpers({
  connectorId: 'google',
  credentialKey: ['clientId', 'clientSecret', 'refreshToken'],
  requiredErrorMessage: GOOGLE_NOT_CONNECTED_MESSAGE,
  notConnectedErrorMessage: GOOGLE_NOT_CONNECTED_MESSAGE,
});

export { getGoogleCredentials, requireGoogleCredentials, googleNotConnected, withGoogle };
