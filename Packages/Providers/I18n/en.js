const en = {
  cloud: 'Cloud',
  local: 'Local',
  connected: 'Connected',
  notConnected: 'Not connected',
  savedSecret: '••••••••••••••••',
  apiKeyLabel: 'API Key',
  apiKeyPlaceholder: 'Paste your API key',
  endpointLabel: 'Local endpoint',
  connect: 'Connect',
  connecting: 'Saving...',
  disconnect: 'Disconnect',
  expand: 'Expand',
  collapse: 'Collapse',
  required: 'This field is required.',
  apiKeyTooShort: 'API key looks too short. Please check it and try again.',
  saveFailed: 'Failed to save. Please try again.',
  disconnectFailed: 'Failed to disconnect. Please try again.',
  lastProvider: 'This is your only connected provider. Add another before removing this one.',
  connected_feedback: 'Provider connected.',
  disconnected_feedback: 'Provider removed.',
  models: (count) => `${count} model${count === 1 ? '' : 's'}`
};

export default en;
