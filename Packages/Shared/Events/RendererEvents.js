export const EVENTS = {
  PROVIDERS_CHANGED: 'joanium:providers-changed',
  CONNECTORS_CHANGED: 'joanium:connectors-changed',
  APP_SETTINGS_CHANGED: 'joanium:app-settings-changed',
  MEMORY_SYNC: 'joanium:memory-sync',
  TRIGGER_MEMORY_SYNC: 'joanium:trigger-memory-sync',
  THEME_CHANGED: 'joanium:theme-changed',
  NETWORK_STATUS_CHANGED: 'joanium:network-status-changed',
};

export function dispatchEvent(eventName, detail = undefined) {
  const options = detail !== undefined ? { detail } : {};
  window.dispatchEvent(new CustomEvent(eventName, options));
}
