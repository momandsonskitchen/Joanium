import { TOOLSET_PROMPTS } from './Prompts.js';

function formatText(template, values = {}) {
  return String(template ?? '').replace(/\{(\w+)\}/g, (_match, key) => values[key] ?? '');
}

// Maps tool category names to their parent connector ID.
// Needed for connectors (like Google Workspace) where a single connector
// covers many tool sub-categories (gmail, slides, sheets, docs, etc.).
const CONNECTOR_CATEGORY_MAP = new Map([
  ['gmail', 'google'],
  ['slides', 'google'],
  ['sheets', 'google'],
  ['docs', 'google'],
  ['drive', 'google'],
  ['calendar', 'google'],
  ['contacts', 'google'],
  ['tasks', 'google'],
  ['forms', 'google'],
  ['meet', 'google'],
  ['chat', 'google'],
  ['photos', 'google'],
  ['youtube', 'google'],
  ['classroom', 'google'],
  ['admin_directory', 'google'],
]);

/**
 * Resolves a tool's category to the connector ID that owns it.
 * Falls back to the category itself when there is no mapping.
 *
 * @param {string} category
 * @returns {string}
 */
function resolveConnectorId(category) {
  return CONNECTOR_CATEGORY_MAP.get(category) ?? category;
}

/**
 * Partitions a connector list into active IDs and disconnected labels.
 *
 * A connector is always-active when it needs no credential (publicTool / noCredential).
 * A connector is active when at least one credential has been saved (credentialSaved).
 * Everything else is disconnected and the user must connect it via Settings → Connectors.
 *
 * @param {Array<object>} connectors - View-model connectors from ConnectorState.listConnectors()
 * @returns {{ activeIds: Set<string>, activeLabels: string[], disconnectedLabels: string[] }}
 */
export function partitionConnectors(connectors = []) {
  const activeIds = new Set();
  const disconnectedLabels = [];
  const activeLabels = [];

  for (const connector of connectors) {
    const isPublic = connector.publicTool === true || connector.noCredential === true;
    if (isPublic || connector.credentialSaved) {
      activeIds.add(connector.id);
      activeLabels.push(connector.label ?? connector.id);
    } else {
      disconnectedLabels.push(connector.label ?? connector.id);
    }
  }

  return { activeIds, activeLabels, disconnectedLabels };
}

/**
 * Filters a flat tool-definitions array to only tools whose category is active.
 * Tools with no category (built-ins) are always included.
 * Sub-categories (e.g. 'gmail', 'slides') are resolved to their parent connector
 * ID via CONNECTOR_CATEGORY_MAP before checking activeIds.
 *
 * @param {Array<object>} toolDefinitions
 * @param {Set<string>} activeIds
 * @returns {Array<object>}
 */
export function filterToolsByConnectors(toolDefinitions, activeIds) {
  return toolDefinitions.filter((tool) => {
    if (!tool?.category) return true;
    return activeIds.has(resolveConnectorId(tool.category));
  });
}

/**
 * Filters prompt sections by walking each tool package's connector list.
 * A package's prompt sections are included only when every one of its non-public
 * connectors is active.  Packages with no connectors (built-ins, LiveBrowser) are
 * always included.
 *
 * @param {Array<object>} packages - Raw tool packages from discoverToolPackages()
 * @param {Set<string>} activeIds
 * @returns {string[]}
 */
export function filterPromptSectionsByPackages(packages, activeIds) {
  const sections = [];
  for (const pkg of packages) {
    if (!pkg.connectors.length) {
      sections.push(...pkg.promptSections);
      continue;
    }

    const allActive = pkg.connectors.every((connector) => activeIds.has(connector.id));
    if (allActive) {
      sections.push(...pkg.promptSections);
    }
  }
  return sections;
}

/**
 * Builds the "not connected" context hint that lets the AI tell the user which
 * connectors are available but not yet set up.
 *
 * @param {string[]} disconnectedLabels - Human-readable connector names
 * @returns {string}
 */
export function buildDisconnectedHint(disconnectedLabels) {
  if (disconnectedLabels.length === 0) return '';
  return formatText(TOOLSET_PROMPTS.disconnectedHint, {
    services: disconnectedLabels.join(', '),
  });
}

/**
 * Builds the "connected" context hint that tells the AI which
 * connectors are successfully authenticated and available.
 *
 * @param {string[]} activeLabels - Human-readable connector names
 * @returns {string}
 */
export function buildConnectedHint(activeLabels) {
  if (activeLabels.length === 0) return '';
  return formatText(TOOLSET_PROMPTS.connectedHint, {
    services: activeLabels.join(', '),
  });
}
