import { readUserState, writeUserState } from '../../../Shared/UserData/UserData.js';
import { CONNECTOR_CATALOG, getConnectorDefinition } from './ConnectorCatalog.js';

function sanitizeCredential(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function hasCredential(connector, details = {}) {
  if (connector.optional) {
    return true;
  }

  return Boolean(sanitizeCredential(details[connector.credentialKey]));
}

export function createConnectorStateManager({ rootDirectory }) {
  async function readState() {
    return readUserState(rootDirectory);
  }

  async function writeState(updater) {
    const state = await readState();
    return writeUserState(rootDirectory, updater(state));
  }

  function toViewModel(connector, details = {}) {
    const credentialValue = sanitizeCredential(details[connector.credentialKey]);
    return {
      ...connector,
      configured: hasCredential(connector, details),
      credentialSaved: Boolean(credentialValue),
      credentialKey: connector.credentialKey
    };
  }

  return {
    async listConnectors() {
      const state = await readState();
      const details = state.connectors?.details ?? {};
      return CONNECTOR_CATALOG.map((connector) => toViewModel(connector, details[connector.id] ?? {}));
    },

    async saveConnector(connectorId, incoming = {}) {
      const connector = getConnectorDefinition(connectorId);
      if (!connector) throw new Error('Unknown connector.');

      const credential = sanitizeCredential(incoming.credential);
      if (!credential && !connector.optional) throw new Error('Credential is required.');

      await writeState((state) => {
        const currentDetails = state.connectors?.details ?? {};
        const existing = currentDetails[connectorId] ?? {};
        const nextDetails = { ...existing };

        if (credential) {
          nextDetails[connector.credentialKey] = credential;
        }

        return {
          ...state,
          connectors: {
            ...(state.connectors ?? {}),
            details: {
              ...currentDetails,
              [connectorId]: nextDetails
            }
          }
        };
      });

      const updated = await this.listConnectors();
      return updated.find((item) => item.id === connectorId) ?? null;
    },

    async removeConnector(connectorId) {
      await writeState((state) => {
        const currentDetails = state.connectors?.details ?? {};
        return {
          ...state,
          connectors: {
            ...(state.connectors ?? {}),
            details: Object.fromEntries(
              Object.entries(currentDetails).filter(([id]) => id !== connectorId)
            )
          }
        };
      });
      return { ok: true };
    }
  };
}
