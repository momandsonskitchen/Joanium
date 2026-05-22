/**
 * Partitions a connector list into active IDs and disconnected labels.
 *
 * A connector is always-active when it needs no credential (publicTool / noCredential).
 * A connector is active when at least one credential has been saved (credentialSaved).
 * Everything else is disconnected and the user must connect it via Settings → Connectors.
 *
 * @param {Array<object>} connectors - View-model connectors from ConnectorState.listConnectors()
 * @returns {{ activeIds: Set<string>, disconnectedLabels: string[] }}
 */
export function partitionConnectors(connectors = []) {
  const activeIds = new Set();
  const disconnectedLabels = [];

  for (const connector of connectors) {
    const isPublic = connector.publicTool === true || connector.noCredential === true;
    if (isPublic || connector.credentialSaved) {
      activeIds.add(connector.id);
    } else {
      disconnectedLabels.push(connector.label ?? connector.id);
    }
  }

  return { activeIds, disconnectedLabels };
}

/**
 * Filters a flat tool-definitions array to only tools whose category is active.
 * Tools with no category (built-ins) are always included.
 *
 * @param {Array<object>} toolDefinitions
 * @param {Set<string>} activeIds
 * @returns {Array<object>}
 */
export function filterToolsByConnectors(toolDefinitions, activeIds) {
  return toolDefinitions.filter((tool) => {
    if (!tool?.category) return true;
    return activeIds.has(tool.category);
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
  const list = disconnectedLabels.join(', ');
  return (
    `You can also assist with ${list}, but the user needs to connect them via` +
    ' Settings \u2192 Connectors first. If the user asks about one of these services,' +
    ' let them know they need to connect the relevant connector and guide them there.'
  );
}
