# Toolset System

The toolset system discovers, manages, and executes AI-callable tools. It handles tool discovery, connector credentials, OAuth flows, and tool execution.

---

## Architecture

```text
Toolset Package
├── Core/
│   ├── ToolsetService.js       (2228 lines — built-in tool executor)
│   ├── ToolDiscovery.js        (auto-discovers tool packages)
│   ├── ConnectorState.js       (persists connector credentials)
│   ├── ConnectorFilter.js      (filters tools by connector availability)
│   ├── ConnectorCatalog.js     (connector metadata)
│   ├── ConnectorHttp.js        (HTTP client for connectors)
│   ├── ConnectorToolAdapter.js (bridges connector executor code)
│   ├── GoogleOAuth.js          (Google OAuth 2.0 flow)
│   ├── Prompts.js              (tool-related prompt fragments)
│   └── Utils.js                (summarizeToolDefinitions, withTimeout)
├── UI/
│   └── ConnectorSettings.js    (connector settings panel)
├── I18n/
│   ├── en.js                   (tool strings)
│   └── Connectors.en.js        (connector strings)
├── Tools/
│   └── <ToolName>/             (27 local tool packages)
└── Catalogue.js                (dynamic fuzzy-matching catalogue)
```

---

## Tool Package Standard

Each tool package under `Tools/<ToolName>/` follows a standard shape:

```text
Tools/<ToolName>/
├── Index.js       ← Only file Toolset discovery imports
├── Tools.js       ← Tool definitions
├── Executors.js   ← Tool execution handlers
├── Prompt.js      ← Tool-specific prompt sections
├── Core/          ← Backend logic
├── I18n/          ← Tool-specific strings
└── UI/            ← Tool-specific UI (optional, rarely used)
```

AI-facing prompt text, tool descriptions, parameter descriptions, and tool schemas must not live
in `I18n/`. Put prompt sections in `Prompt.js`; put tool definitions in `Tools.js` or, for large
tool lists, `Core/Chat/Tools.js` re-exported by `Tools.js`. Keep `I18n/` for user-facing UI text,
connector labels, and runtime result/error strings.

### Tool Package Exports

Each `Index.js` exports:

- `createToolPackage()` — Returns tool definitions, handlers, and prompt sections
- Standard tool discovery shape

---

## Tool Discovery

`ToolDiscovery.js` scans `Tools/` for subdirectories with `Index.js`. It also discovers tool packages from external packages (e.g., `LiveBrowser`).

Discovery returns:

- Tool definitions (name, description, parameters)
- Tool handlers (execution functions)
- Prompt sections (additional system prompt content)

---

## Built-in Tools (in ToolsetService.js)

`ToolsetService.js` (2228 lines) contains built-in tools that don't need separate packages:

| Category | Tools |
|---|---|
| **Math** | Calculations, unit conversion |
| **Date/Time** | Local date/time utilities, timezone lookup |
| **URL** | URL parsing/formatting helpers |
| **Geospatial** | Geospatial math/conversion helpers |
| **UUID** | UUID generation |
| **Crypto** | Hashing (MD5, SHA-256, etc.) |
| **Encoding** | Base64 encode/decode |
| **JSON** | JSON formatting |
| **Text** | Text transforms, text stats |
| **Security** | Password generation |
| **Misc** | Zodiac lookup, weather |

---

## Tool Packages (27)

| Package | Description |
|---|---|
| Cloudflare | Cloudflare API tools |
| Command | Local command execution |
| ComputerUse | OS-level screen, mouse, keyboard, clipboard, and window tools |
| Directory | Workspace inspection |
| Figma | Figma design tools |
| Git | Git operations |
| GitHub | GitHub API tools |
| GitLab | GitLab API tools |
| Google | Google API tools |
| HubSpot | HubSpot CRM tools |
| Jira | Jira project management |
| Knowledge | Knowledge base tools |
| Linear | Linear issue tracking |
| Location | Geolocation tools |
| Netlify | Netlify deployment tools |
| Notion | Notion workspace tools |
| OpenWeather | Weather data tools |
| Productivity | Productivity tools |
| PublicData | Wikipedia, Stack Overflow, npm, weather, etc. |
| Security | Security utilities |
| Sentry | Sentry error tracking |
| Spotify | Spotify API tools |
| Stripe | Stripe payment tools |
| SubAgents | Sub-agent spawning |
| Supabase | Supabase database tools |
| Unsplash | Unsplash image search |
| Vercel | Vercel deployment tools |

---

## Computer Use Tools

`ComputerUse` provides local OS interaction tools for screenshots, display/cursor inspection, mouse
movement, clicking, dragging, scrolling, keyboard input, clipboard inspection and editing, window
focus/state/bounds control, opening local targets, and short waits between UI actions. These are
local tools, not connector tools, so their tool definitions must not set connector-gated
`category` values.

---

## Public Data Tools

No-key public lookup tools:

- Wikipedia
- Stack Overflow
- npm
- Open-Meteo weather
- Dictionary
- Country facts
- Quotes
- Jokes
- Hacker News
- Wikimedia Commons image search
- Exchange rates
- CoinGecko crypto data
- NASA APOD
- ISS location

---

## Connector System

Connectors are API-key-backed credentials for external services.

### Connector State

`ConnectorState.js` persists credentials in `Data/Connectors.json`.

### Connector Filtering

`ConnectorFilter.js` filters tools and prompt sections based on which connectors are configured. Tools that require a missing connector are hidden from the AI.

### Connector Catalog

`ConnectorCatalog.js` maps connectors to their tools and metadata.

### Google OAuth

`GoogleOAuth.js` implements Google OAuth 2.0 for Google Workspace tools (Gmail, Drive, Calendar, Contacts, Docs, Forms, Photos, Sheets, Slides, Tasks, YouTube).

---

## Tool Execution Flow

```text
AI response contains tool call
    ↓
RendererToolLoop parses tool call block
    ↓
toolset:execute-tool IPC call
    ↓
ToolsetService.execute(toolName, params)
    ↓
Route to built-in handler or tool package handler
    ↓
Return result to renderer
    ↓
Result injected into AI context
    ↓
AI continues with tool result
```

---

## Tool Loop

The tool loop is implemented in `Packages/Shared/ToolLoop/RendererToolLoop.js` (879 lines):

1. AI response is parsed for `joanium-terminal` and `joanium-tool` blocks
2. Each tool call is executed via IPC
3. Results are fed back to the AI
4. Loop repeats up to `maxToolCalls`
5. Final response is rendered

---

## Catalogue System

`Catalogue.js` implements a dynamic fuzzy-matching catalogue:

- Two always-in-context tools: `list_available_tools` and `get_tool_schemas`
- Give the AI lazy access to every connector without flooding context
- AI can discover tools on-demand

---

## Tool Prompt Sections

Each tool package can provide prompt sections that are added to the AI's system context. These are collected during discovery and merged into the system prompt.

---

## Tool Execution Timeout

Tools are executed with a timeout via `withTimeout()`. Long-running tools are aborted if they exceed the timeout.

---

## Tool Definition Format

```js
{
  name: 'tool_name',
  description: 'What the tool does',
  parameters: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: 'Description' }
    },
    required: ['param1']
  }
}
```
