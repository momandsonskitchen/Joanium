/**
 * Toolset Catalogue
 *
 * Two always-in-context tools that give the AI lazy access to every connector
 * package without flooding the context window upfront.
 *
 * ─── Flow ───────────────────────────────────────────────────────────────────
 *  1. AI calls `list_available_tools`  → connector ids + one-line hints
 *  2. AI calls `get_tool_schemas`      → full JSON schemas for what it needs
 *  3. AI executes the specific tool directly via the normal tool-call path
 *
 * ─── Fuzzy matching (fully dynamic, zero hardcoding) ────────────────────────
 * Aliases are derived at runtime from each package's connector metadata:
 *   • connector.id          exact match
 *   • connector.label       normalised (e.g. "Google Workspace" → "googleworkspace")
 *   • tool name prefixes    e.g. "gmail_*" tools → alias "gmail" → package "google"
 *   • label words           e.g. "Workspace" → alias "workspace" → package "google"
 *
 * No connector name, alias, or hint is ever written by hand in this file.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a string to a compact lowercase key used for fuzzy comparison.
 * Strips all non-alphanumeric characters so "Google Workspace" → "googleworkspace".
 *
 * @param {string} value
 * @returns {string}
 */
function normalise(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Build a Map<alias → packageId> purely from connector metadata and tool name
 * prefixes. Called once at createCatalogue() time with the live package list.
 *
 * Sources (in priority order, higher-priority entries win on collision):
 *   1. connector.id                    (e.g. "github")
 *   2. normalised connector.label      (e.g. "googleworkspace")
 *   3. individual words in label ≥ 4ch (e.g. "workspace", "google")
 *   4. tool-name prefixes              (e.g. tools named "gmail_*" → alias "gmail")
 *
 * @param {object[]} connectorPackages
 * @returns {Map<string, string>}  alias → package id
 */
function buildAliasMap(connectorPackages) {
  // Lower priority first so higher-priority entries overwrite them.
  const map = new Map();

  for (const pkg of connectorPackages) {
    // A package may expose a single `connector` or a `connectors` array
    const connectorList = pkg.connectors ?? [];

    // ── Priority 4: tool-name prefixes ─────────────────────────────────────
    // e.g. a tool named "gmail_get_message" contributes alias "gmail"
    for (const tool of pkg.toolDefinitions ?? []) {
      const underscoreIndex = tool.name?.indexOf('_');
      if (underscoreIndex > 0) {
        const prefix = tool.name.slice(0, underscoreIndex).toLowerCase();
        if (prefix.length >= 2) map.set(prefix, pkg.id);
      }
    }

    for (const connector of connectorList) {
      const pkgId = pkg.id;

      // ── Priority 3: individual label words ─────────────────────────────
      const words = String(connector.label ?? '')
        .split(/\s+/)
        .map(normalise)
        .filter((w) => w.length >= 4);
      for (const word of words) map.set(word, pkgId);

      // ── Priority 2: full normalised label ──────────────────────────────
      const normLabel = normalise(connector.label);
      if (normLabel) map.set(normLabel, pkgId);

      // ── Priority 1 (highest): connector id ─────────────────────────────
      const normId = normalise(connector.id);
      if (normId) map.set(normId, pkgId);
    }
  }

  return map;
}

/**
 * Resolve a user-supplied name to a connector package.
 * Resolution order:
 *   1. Exact package id match (case-insensitive)
 *   2. Alias map lookup (derived from connector metadata + tool prefixes)
 *   3. Substring match on package id or any connector label
 *
 * @param {string}   name
 * @param {object[]} connectorPackages
 * @param {Map}      aliasMap
 * @returns {object|null}
 */
function resolvePackage(name, connectorPackages, aliasMap) {
  const key = normalise(name);
  if (!key) return null;

  // 1. Exact package id
  const exact = connectorPackages.find((pkg) => normalise(pkg.id) === key);
  if (exact) return exact;

  // 2. Alias map
  const aliasedId = aliasMap.get(key);
  if (aliasedId) {
    const aliased = connectorPackages.find((pkg) => pkg.id === aliasedId);
    if (aliased) return aliased;
  }

  // 3. Substring fallback on id or label
  return (
    connectorPackages.find((pkg) => {
      if (pkg.id.toLowerCase().includes(key)) return true;
      return pkg.connectors.some((c) => normalise(c.label).includes(key));
    }) ?? null
  );
}

/**
 * Returns whether a package has at least one active (credentialed / public) connector.
 *
 * @param {object}   pkg
 * @param {object[]} connectorViewModels  from ConnectorState.listConnectors()
 * @returns {boolean}
 */
function isActive(pkg, connectorViewModels) {
  return pkg.connectors.some((c) => {
    const vm = connectorViewModels.find((v) => v.id === c.id);
    return vm && (vm.credentialSaved || vm.publicTool || vm.noCredential || c.optional);
  });
}

/**
 * Build a compact one-line hint for list_available_tools output.
 * Derived entirely from connector.label and connector.description — no hardcoding.
 *
 * @param {object} pkg
 * @returns {string}
 */
function buildHint(pkg) {
  // For packages with multiple connectors (e.g. Productivity), join their labels.
  const parts = pkg.connectors
    .map((c) => {
      const label = c.label ?? pkg.id;
      const desc = c.description ? ` — ${c.description}` : '';
      return `${label}${desc}`;
    })
    .filter(Boolean);

  return parts.join(' | ') || pkg.id;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Creates the two catalogue tool definitions and their handlers.
 *
 * @param {object}   options
 * @param {object[]} options.connectorPackages  Non-core tool packages
 * @param {Function} options.listConnectors     () => Promise<connectorViewModel[]>
 * @returns {{ toolDefinitions: object[], toolHandlers: object }}
 */
export function createCatalogue({ connectorPackages, listConnectors }) {
  // Build the alias map once from live package metadata — fully dynamic.
  const aliasMap = buildAliasMap(connectorPackages);

  // ── Tool definitions ─────────────────────────────────────────────────────

  const toolDefinitions = [
    {
      name: 'list_available_tools',
      description:
        'List all connector services the user has connected that have tools available. ' +
        'Returns connector ids and a one-line description of what each service can do. ' +
        'Call this first when you need to do something not covered by your built-in tools ' +
        '(terminal, files, git, knowledge, public data, location).',
      parameters: {},
    },
    {
      name: 'get_tool_schemas',
      description:
        'Retrieve the full JSON tool schemas for one or more connector services so you can ' +
        'call those tools. Pass an array of connector ids returned by list_available_tools, ' +
        'or ["*"] to get all available schemas at once. ' +
        'After receiving schemas, call the specific tool directly via the normal tool-call ' +
        'mechanism using the exact tool name and parameters described in the schema.',
      parameters: {
        connectors: {
          type: 'array',
          required: true,
          description:
            'Array of connector ids to fetch schemas for (e.g. ["github", "google"]), ' +
            'or ["*"] to get everything. Fuzzy names are accepted.',
        },
      },
    },
  ];

  // ── Tool handlers ─────────────────────────────────────────────────────────

  const toolHandlers = {
    /**
     * list_available_tools
     * Filters to connected packages and returns id + hint per package.
     */
    async list_available_tools() {
      const connectorViewModels = await listConnectors();

      const available = connectorPackages
        .filter((pkg) => isActive(pkg, connectorViewModels))
        .map((pkg) => ({ id: pkg.id, hint: buildHint(pkg) }));

      if (available.length === 0) {
        return (
          'No connector services are currently connected. ' +
          'Ask the user to connect a service via Settings → Connectors.'
        );
      }

      const lines = available.map(({ id, hint }) => `- ${id}: ${hint}`);
      return [
        `Available connector services (${available.length}):`,
        ...lines,
        '',
        'Call get_tool_schemas with the ids you need to retrieve their full tool schemas.',
      ].join('\n');
    },

    /**
     * get_tool_schemas
     * Returns full tool definitions for the requested connectors.
     */
    async get_tool_schemas({ connectors: requested } = {}) {
      if (!Array.isArray(requested) || requested.length === 0) {
        throw new Error('connectors must be a non-empty array of connector ids or ["*"].');
      }

      const connectorViewModels = await listConnectors();
      const activePackages = connectorPackages.filter((pkg) => isActive(pkg, connectorViewModels));

      // "*" → all active packages
      const wantAll = requested.length === 1 && requested[0].trim() === '*';
      const targetPackages = wantAll
        ? activePackages
        : [
            // Deduplicate by package id in case two aliases resolve to the same package
            ...new Map(
              requested
                .map((name) => resolvePackage(name, activePackages, aliasMap))
                .filter(Boolean)
                .map((pkg) => [pkg.id, pkg]),
            ).values(),
          ];

      if (targetPackages.length === 0) {
        return (
          `No matching connected services found for: ${requested.join(', ')}. ` +
          'Call list_available_tools to see what is connected.'
        );
      }

      // Format schemas
      const sections = targetPackages.map((pkg) => {
        const connectorLabel =
          pkg.connectors
            .map((c) => c.label)
            .filter(Boolean)
            .join(' / ') || pkg.id;
        const header = `=== ${connectorLabel} (id: ${pkg.id}) ===`;

        const tools = pkg.toolDefinitions.map((tool) => {
          const params = Object.entries(tool.parameters ?? {})
            .map(([key, value]) => {
              const req = value.required ? 'required' : 'optional';
              return `      ${key} (${value.type ?? 'string'}, ${req}): ${value.description ?? ''}`;
            })
            .join('\n');

          return [
            `  Tool: ${tool.name}`,
            `  Description: ${tool.description}`,
            params ? `  Parameters:\n${params}` : '  Parameters: none',
          ].join('\n');
        });

        return [header, ...tools].join('\n\n');
      });

      return [
        `Schemas for ${targetPackages.length} service(s): ${targetPackages.map((p) => p.id).join(', ')}`,
        '',
        ...sections,
        '',
        'Now call the specific tool using its exact name and the parameters described above.',
      ].join('\n');
    },
  };

  return { toolDefinitions, toolHandlers };
}
