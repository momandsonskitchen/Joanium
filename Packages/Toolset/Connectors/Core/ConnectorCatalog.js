export const CONNECTOR_CATALOG = Object.freeze([]);

function normalizeConnector(connector = {}) {
  const credentialKey = connector.credentialKey ?? connector.fields?.[0]?.key ?? 'token';
  const fields = Array.isArray(connector.fields) && connector.fields.length
    ? connector.fields
    : [{
        key: credentialKey,
        label: connector.credentialLabel ?? 'Credential',
        placeholder: connector.credentialPlaceholder ?? '',
        type: 'password',
        required: !connector.optional
      }];

  return {
    ...connector,
    credentialKey,
    fields: fields.map((field) => ({
      type: 'password',
      required: !connector.optional,
      ...field
    }))
  };
}

export function createConnectorCatalog(connectors = []) {
  const byId = new Map();
  for (const connector of connectors) {
    if (connector?.id) byId.set(connector.id, normalizeConnector(connector));
  }
  return [...byId.values()].sort((left, right) => left.label.localeCompare(right.label));
}

export function getConnectorDefinition(connectorId, connectorCatalog = CONNECTOR_CATALOG) {
  return connectorCatalog.find((connector) => connector.id === connectorId) ?? null;
}
