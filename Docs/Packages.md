# Packages Reference

Detailed reference for every package in `Packages/`. Each package is an independent microservice with a single `Index.js` entry point.

---

## Package List

| Package | Type | Description |
|---|---|---|
| [Boot](#boot) | Infrastructure | Package auto-discovery engine |
| [Electron](#electron) | Infrastructure | Electron main process shell |
| [Shell](#shell) | Infrastructure | Main app shell and SPA router |
| [Shared](#shared) | Library | Cross-package shared utilities |
| [Chat](#chat) | Feature | Conversation engine |
| [Toolset](#toolset) | Feature | AI tools and connectors |
| [Providers](#providers) | Feature | AI provider management |
| [Memory](#memory) | Feature | Long-term personal memory |
| [Agents](#agents) | Feature | Scheduled background agents |
| [Channels](#channels) | Feature | External messaging gateway |
| [MCP](#mcp) | Feature | Model Context Protocol |
| [Setup](#setup) | Feature | Onboarding wizard |
| [History](#history) | Feature | Chat session persistence |
| [Themes](#themes) | Feature | UI theme management |
| [Security](#security) | Feature | App lock and password |
| [User](#user) | Feature | User profile and instructions |
| [About](#about) | Feature | App metadata and what's new |
| [Projects](#projects) | Feature | Project workspace management |
| [Templates](#templates) | Feature | Prompt template storage |
| [Skills](#skills) | Feature | AI skill documents |
| [Personas](#personas) | Feature | AI persona management |
| [SlashCommands](#slashcommands) | Feature | Chat slash command registry |
| [Events](#events) | Feature | Event feed panel |
| [Usage](#usage) | Feature | Token usage analytics |
| [Leaderboard](#leaderboard) | Feature | Usage leaderboard |
| [LiveBrowser](#livebrowser) | Feature | Embedded browser preview |
| [Marketplace](#marketplace) | Feature | Marketplace installer |
| [AppSettings](#appsettings) | Feature | Application settings + runtime |

---

## Boot

**Path**: `Packages/Boot/`
**Files**: `Index.js` only (53 lines)
**Type**: Infrastructure

Auto-discovers packages by scanning `Packages/` for directories with non-empty `Index.js`.

### Exports

- `discoverPackages(packagesDirectory)` → `Map<name, { id, entryPath }>`
- `loadPackageModule(registry, packageName)` → dynamic `import()`
- `createBootLogger(logFilePath)` → timestamped logging function

---

## Electron

**Path**: `Packages/Electron/`
**Type**: Infrastructure

Electron main process configuration. Creates BrowserWindow, manages IPC registration, enforces production security.

### Public API (`Index.js`, 397 lines)

- `bootElectron(entryPackage)` — Creates window, registers IPC, starts app
- `createPackage()` — Standard package factory

### Internal

- `Core/WindowState.js` — Reads/writes window bounds to `Data/WindowState.json`

### Key Behaviors

- Registers `app://` protocol for cross-origin resources
- Frameless window with titlebar overlay
- Blocks reload/devtools in packaged builds
- Geolocation permission handler
- Power save blocker

---

## Shell

**Path**: `Packages/Shell/`
**Type**: Infrastructure

Main app container. Declares all other packages as `ipcCompanions`, merging their IPC handlers into one BrowserWindow.

### Public API (`Index.js`, 56 lines)

- `createPackage()` — Returns package config with `ipcCompanions` resolved dynamically
- `shell:bootstrap` IPC handler — Returns user state for renderer

### Internal

- `UI/App.html` — Main app shell HTML
- `UI/Preload.js` — Preload script
- `UI/ShellApp.js` — SPA router
- `UI/ShellApp.css` — Main styles
- `UI/Shortcuts.js` — Keyboard shortcuts
- `UI/ShortcutsPanel.js` — Shortcuts reference panel

### ipcCompanions

Dynamically resolves ALL other packages (except Boot, Electron, LiveBrowser, Setup, Shared, Shell itself) as companions.

---

## Shared

**Path**: `Packages/Shared/`
**Type**: Library

The ONLY package other packages may import from. Contains 27+ public modules.

See [SharedLibrary.md](SharedLibrary.md) for full details.

---

## Chat

**Path**: `Packages/Chat/`
**Type**: Feature

Core conversation engine. Builds AI system prompts, handles streaming completions, manages attachments.

### Public API (`Index.js`, 237 lines)

**IPC Handlers** (11 channels):

| Channel | Purpose |
|---|---|
| `chat:bootstrap` | Initial chat state for renderer |
| `chat:stream-message` | Streams AI response with chunk/done/error events |
| `chat:cancel-stream` | Aborts a specific stream |
| `chat:cancel-all-streams` | Aborts all active streams |
| `chat:stream-message-agent` | Routes streaming to agent channels |
| `chat:complete-message` | Non-streaming completion |
| `chat:enhance-prompt` | AI-powered prompt rewriting |
| `chat:select-attachments` | Native file picker with multi-select |
| `chat:process-dropped-files` | Drag-and-drop file processing |
| `chat:get-terminal-prompt` | Terminal prompt context |
| `chat:fetch-url` | Proxies HTTP GET (CSP bypass) |

### Internal

- `Core/ChatState.js` (1164 lines) — AI request builder. Builds system prompts from `Prompts/System.md`, persona, memory, terminal tools, Toolset prompts, skills, project context, custom instructions.
- `Core/ChatAttachments.js` — File extraction for PDF, DOCX, XLSX, PPTX, code, images.
- `UI/` (19 files) — ChatApp.js, MessageElements.js, ThinkingBlock.js, TerminalPanel.js, SubAgentSections.js, ModelPickerPanel.js, AttachmentPill.js, BrowserPreviewPanel.js, DropZoneOverlay.js, FileDiffTracker.js, GitBranchPickerPanel.js, TechFeedPanel.js, DiagnosticPanel.js, CompletionSound.js, WhatsNewOverlay.js, Utils.js, Shared/
- `Prompts/Prompts.js` — Chat-specific prompt templates

---

## Toolset

**Path**: `Packages/Toolset/`
**Type**: Feature

Discovers, manages, and executes AI-callable tools. Handles connector credentials and OAuth.

### Public API (`Index.js`, 104 lines)

**IPC Handlers** (6 channels):

| Channel | Purpose |
|---|---|
| `toolset:list-tools` | Active tools filtered by connector state |
| `toolset:execute-tool` | Execute a tool by name with parameters |
| `connectors:list` | All connectors with status |
| `connectors:save` | Save connector credentials |
| `connectors:remove` | Remove a connector |
| `connectors:google-oauth` | Google OAuth flow |

### Internal

- `Core/ToolsetService.js` (2228 lines) — The massive tool executor with built-in tools
- `Core/ToolDiscovery.js` — Auto-discovers tool packages
- `Core/ConnectorState.js` — Persists connector credentials
- `Core/ConnectorFilter.js` — Filters tools by connector availability
- `Core/GoogleOAuth.js` — Google OAuth 2.0 flow
- `Catalogue.js` — Dynamic fuzzy-matching catalogue
- `Tools/` — 28 tool packages
- `UI/ConnectorsPanel.js` — Connector settings UI

### Tool Packages (28)

Cloudflare, Command, Core, Directory, Figma, Git, GitHub, GitLab, Google, GoogleWorkspace, HubSpot, Jira, Knowledge, Linear, Location, Netlify, Notion, OpenWeather, Productivity, PublicData, Security, Sentry, Spotify, Stripe, SubAgents, Supabase, Unsplash, Vercel

### Built-in Tools (in ToolsetService.js)

Calculations, unit conversion, date/time, URL parsing, geospatial math, timezone lookup, UUID generation, hashing, Base64, JSON formatting, text transforms, text stats, password generation, zodiac, weather, and more.

See [Toolset.md](Toolset.md) for full details.

---

## Providers

**Path**: `Packages/Providers/`
**Type**: Feature

Manages AI provider configuration — API keys, endpoints, model lists.

### Public API (`Index.js`, 51 lines)

**IPC Handlers** (4 channels):

| Channel | Purpose |
|---|---|
| `providers:list-catalog` | Full provider catalog with model lists |
| `providers:list-configured` | Only configured providers |
| `providers:save` | Save provider config + trigger model sync |
| `providers:remove` | Remove provider config |

### Internal

- `Core/ProviderState.js` — Reads/writes provider state. Background sync with 24-hour TTL.

See [Providers.md](Providers.md) for full details.

---

## Memory

**Path**: `Packages/Memory/`
**Type**: Feature

Long-term personal memory stored as markdown files in `Data/Memories/`.

### Public API (`Index.js`, 88 lines)

**IPC Handlers** (15+ channels):

| Channel | Purpose |
|---|---|
| `memory:list` | List all memory files |
| `memory:read` | Read a memory file |
| `memory:save` | Save/update a memory file |
| `memory:search` | Search memories by query |
| `memory:get-context` | Get memory context for AI (max chars) |
| `memory:get-catalog` | Memory catalog |
| `memory:get-export-prompt` | Prompt for exporting memory |
| `memory:get-triage-prompt` | Prompt for triaging memory |
| `memory:get-import-prompt` | Prompt for importing memory |
| `memory:apply-updates` | Apply AI-generated memory updates |
| `memory:delete` | Delete a memory file |
| `memory:cleanup-ai-reply` | Handle AI cleanup response |
| `memory:cleanup-renderer-ready` | Renderer ready for cleanup |
| `memory:run-cleanup` | Trigger memory cleanup |
| `memory:list-dreams` / `memory:read-dream` | Dream journal (periodic AI consolidation) |

### Internal

- `Core/MemoryState.js` — CRUD operations
- `Core/MemoryCleanup.js` — Automatic deduplication/cleanup

See [Memory.md](Memory.md) for full details.

---

## Agents

**Path**: `Packages/Agents/`
**Type**: Feature

Background agent scheduling and execution. Uses renderer-delegated tool loop pattern.

### Public API (`Index.js`, 374 lines)

**IPC Handlers** (10+ channels):

| Channel | Purpose |
|---|---|
| `agents:renderer-ready` | Handshake — unblocks startup agents |
| `agents:tool-reply` | Resolves pending agent runs |
| `agents:progress` | Streaming progress to run log |
| `agents:save-agent` / `agents:list-agents` / `agents:load-agent` / `agents:delete-agent` | Agent CRUD |
| `agents:run-agent` | Manual agent execution |
| `agents:list-runs` / `agents:clear-runs` | Run history |
| `agents:list-avatars` | Agent avatar images |
| Replay handlers | Execution replay |

### Internal

- `Core/AgentState.js` — CRUD + run management
- `Core/AgentScheduler.js` — Cron-like scheduling
- `Core/ReplayStore.js` — Run replay storage
- `IPC/ReplayIpc.js` — Replay IPC handlers
- `UI/` — Agent UI panels
- `I18n/` — Agent strings

### Architecture

Uses the same renderer-delegated tool loop as Channels:

1. Main process scheduler sends `agents:run-with-tools` to the renderer
2. `AgentGateway.js` runs the shared assistant pipeline using `chat:complete-message`
3. Resolves back via `agents:tool-reply` IPC handler
4. 30-minute timeout per agent

---

## Channels

**Path**: `Packages/Channels/`
**Type**: Feature

Multi-platform messaging gateway. Supports Telegram, WhatsApp, Discord, Slack, Mattermost, Zulip, ntfy.

### Public API (`Index.js`, 198 lines)

**IPC Handlers** (12 channels):

| Channel | Purpose |
|---|---|
| `channels:icon-paths` | Channel icon file paths |
| `channels:list` / `channels:get` / `channels:save` / `channels:remove` | CRUD |
| `channels:toggle` | Enable/disable a channel |
| `channels:validate` | Validate credentials per channel type |
| `channels:reply` | Send reply to a channel message |
| `channels:save-message` / `channels:list-messages` / `channels:delete-message` / `channels:clear-messages` | Message history |

### Internal

- `Core/ChannelState.js` — Channel configuration
- `Core/ChannelRuntime.js` — Polling, validation, reply dispatch

See [Channels.md](Channels.md) for full details.

---

## MCP

**Path**: `Packages/MCP/`
**Type**: Feature

Manages Model Context Protocol server connections.

### Public API (`Index.js`, 91 lines)

**IPC Handlers** (8 channels):

| Channel | Purpose |
|---|---|
| `mcp:list-servers` | List all MCP servers with connection status |
| `mcp:save-server` / `mcp:remove-server` | CRUD |
| `mcp:set-enabled` | Enable/disable (auto-connects/disconnects) |
| `mcp:connect-server` / `mcp:disconnect-server` | Manual connect/disconnect |
| `mcp:list-tools` | List tools from all connected servers |
| `mcp:call-tool` | Execute an MCP tool |

### Internal

- `Core/MCPState.js` — Server configuration
- `Core/MCPRegistry.js` — Manages stdio/SSE connections
- `UI/` — MCP server UI
- `I18n/` — MCP strings

---

## Setup

**Path**: `Packages/Setup/`
**Type**: Feature

First-run onboarding wizard. Has its own BrowserWindow (separate from Shell).

### Public API (`Index.js`, 38 lines)

- `createPackage()` — Standard package factory
- `resolveLaunchPackage()` — Returns `'Setup'` or `'Shell'` based on onboarding state

**IPC Handlers** (3 channels):

| Channel | Purpose |
|---|---|
| `setup:bootstrap` | Current onboarding state |
| `setup:save-draft` | Save partial onboarding state |
| `setup:complete` | Mark onboarding complete |

### Onboarding Flow

1. Greet user, accept terms and conditions
2. Ask for user's name
3. Ask for user's age
4. AI model selection (API or local)
5. "Congrats" confirmation → navigate to chat

---

## History

**Path**: `Packages/History/`
**Type**: Feature

Chat session persistence. Backend-only (no renderer).

### Public API (`Index.js`, 54 lines)

**IPC Handlers** (10 channels):

| Channel | Purpose |
|---|---|
| `history:save-session` | Save a chat session |
| `history:list-sessions` | List sessions (project-filtered) |
| `history:load-session` | Load a session |
| `history:delete-session` / `history:delete-all-sessions` | Delete |
| `history:rename-session` | Rename |
| `history:pin-session` | Pin/unpin |
| `history:list-memory-pending` | Sessions pending memory sync |
| `history:mark-memory-synced` | Mark session as memory-synced |
| `history:fork-session` | Fork session at a message index |

### Internal

- `Core/HistoryState.js` — Session storage

---

## Themes

**Path**: `Packages/Themes/`
**Type**: Feature

UI theme management (light/dark mode, reduced motion, interface font).

### Public API (`Index.js`, 19 lines)

**IPC Handlers**: `themes:get`, `themes:save`

### Internal

- `Core/ThemeState.js` — Theme state persistence

---

## Security

**Path**: `Packages/Security/`
**Type**: Feature

Password protection and app lock.

### Public API (`Index.js`, 56 lines)

**IPC Handlers** (10 channels):

| Channel | Purpose |
|---|---|
| `security:get-status` | Lock status |
| `security:enable` / `security:disable` | Enable/disable lock |
| `security:verify-password` / `security:verify-answer` | Auth verification |
| `security:get-auto-lock-timeout` / `security:set-auto-lock-timeout` | Auto-lock config |
| `security:change-password` | Password change |
| `security:get-backup-state` / `security:restore-from-backup` | Tamper detection |

### Internal

- `Core/SecurityState.js` — Security configuration

---

## User

**Path**: `Packages/User/`
**Type**: Feature

User identity management and custom instructions.

### Public API (`Index.js`, 51 lines)

**IPC Handlers** (7 channels):

| Channel | Purpose |
|---|---|
| `user:get-profile` / `user:save-profile` | Profile CRUD |
| `user:get-custom-instructions` / `user:save-custom-instructions` | Custom AI behavior |
| `user:pick-avatar` | Native file picker for avatar |
| `user:save-avatar` / `user:remove-avatar` | Avatar management |

### Internal

- `Core/UserState.js` — User state management
- `UI/BirthdayCard.js` — Birthday celebration overlay

---

## About

**Path**: `Packages/About/`
**Type**: Feature

App metadata, external links, and what's new.

### Public API (`Index.js`, 37 lines)

**IPC Handlers** (4 channels):

| Channel | Purpose |
|---|---|
| `about:get-info` | App version, system info |
| `about:open-external` | Opens URLs in system browser |
| `whats-new:get` / `whats-new:mark-seen` | Changelog display tracking |

### Internal

- `Core/AboutState.js` — App metadata

---

## Projects

**Path**: `Packages/Projects/`
**Type**: Feature

Project workspace management.

### Public API (`Index.js`, 63 lines)

**IPC Handlers** (7 channels):

| Channel | Purpose |
|---|---|
| `projects:save-project` / `projects:list-projects` / `projects:load-project` / `projects:delete-project` | CRUD |
| `projects:select-cover` | Image picker for project cover |
| `projects:read-project-docs` | Reads and formats project documentation |
| `projects:select-directory` | Directory picker |

### Internal

- `Core/ProjectState.js` — Project storage
- `Core/ProjectDocReader.js` — Documentation reader

---

## Templates

**Path**: `Packages/Templates/`
**Type**: Feature

Prompt template storage. Backend-only.

### Public API (`Index.js`, 32 lines)

**IPC Handlers** (4 channels): `templates:save-template`, `templates:list-templates`, `templates:load-template`, `templates:delete-template`

### Internal

- `Core/TemplateState.js` — Template storage

---

## Skills

**Path**: `Packages/Skills/`
**Type**: Feature

Read-only AI skill documents (markdown files in `Skills/`).

### Public API (`Index.js`, 25 lines)

**IPC Handlers** (3 channels): `skills:list-skills`, `skills:load-skill`, `skills:delete-skill`

### Internal

- `Core/SkillsState.js` — Skill file management

---

## Personas

**Path**: `Packages/Personas/`
**Type**: Feature

AI persona documents (markdown files in `Personas/`).

### Public API (`Index.js`, 34 lines)

**IPC Handlers** (5 channels):

| Channel | Purpose |
|---|---|
| `personas:list-personas` / `personas:load-persona` / `personas:delete-persona` | CRUD |
| `personas:get-active-persona` / `personas:set-active-persona` | Active persona selection |

### Internal

- `Core/PersonasState.js` — Persona management

---

## SlashCommands

**Path**: `Packages/SlashCommands/`
**Type**: Feature

Slash command registry for chat input.

### Public API (`Index.js`, 19 lines)

**IPC Handlers** (2 channels): `slash-commands:list`, `slash-commands:get-mode-instruction`

### Internal

- `Core/SlashRegistry.js` — Command registry
- Modes include 101 personas from `Prompts/Modes/`

---

## Events

**Path**: `Packages/Events/`
**Type**: Feature

Event feed panel. UI-only.

### Public API (`Index.js`, 6 lines)

Returns `{ id: 'Events', ipcHandlers: [] }` — minimal stub.

### Internal

- `UI/` — Event feed display components

---

## Usage

**Path**: `Packages/Usage/`
**Type**: Feature

Token usage analytics.

### Public API (`Index.js`, 15 lines)

**IPC Handler**: `usage:get-data` — Returns aggregated usage data.

---

## Leaderboard

**Path**: `Packages/Leaderboard/`
**Type**: Feature

Usage leaderboard. UI-only stub.

### Public API (`Index.js`, 6 lines)

Returns empty IPC handlers.

---

## LiveBrowser

**Path**: `Packages/LiveBrowser/`
**Type**: Feature

Embedded Chromium browser view with AI tools.

### Public API (`Index.js`, 131 lines)

Dual export pattern:

- `createPackage()` — Standard package with IPC handlers
- `createToolPackage()` — Toolset discovery shape

**IPC Handlers** (17 channels):

| Channel | Purpose |
|---|---|
| `browser-preview:get-state` / `browser-preview:load-url` / `browser-preview:set-visible` / `browser-preview:set-bounds` | View management |
| `browser-preview:hide` / `browser-preview:hide-native-view` / `browser-preview:show-native-view` | Visibility |
| `browser-preview:go-back` / `browser-preview:go-forward` / `browser-preview:reload` | Navigation |
| `browser-preview:pause` / `browser-preview:resume` / `browser-preview:close` | Lifecycle |
| `browser-preview:get-history` / `browser-preview:clear-history` / `browser-preview:delete-history-entry` | History |
| `browser-preview:execute-tool` | Browser AI tools |

### Internal

- `Core/BrowserPreviewService.js` — Browser view management
- `Core/BrowserRuntime.js` — Browser runtime

---

## Marketplace

**Path**: `Packages/Marketplace/`
**Type**: Feature

Installs marketplace items (skills, personas).

### Public API (`Index.js`, 16 lines)

**IPC Handler**: `marketplace:install-item` — Writes markdown to appropriate directory.

### Internal

- `Core/MarketplaceState.js` — Installation logic

---

## AppSettings

**Path**: `Packages/AppSettings/`
**Type**: Feature

Application settings with runtime side effects. The most complex settings package.

### Public API (`Index.js`, 182 lines)

**IPC Handlers** (10 channels):

| Channel | Purpose |
|---|---|
| `app-settings:get` / `app-settings:save` | Settings CRUD with runtime side effects |
| `auto-update:get-state` / `auto-update:check` / `auto-update:install` | Auto-update |
| `app-settings:reset-app` | Factory reset |
| `app-settings:restart-app` / `app-settings:quit-app` | App lifecycle |
| `data:export` / `data:import` | Data portability (ZIP) |

### Internal

- `Core/AppSettingsState.js` — Settings persistence
- `Core/PowerService.js` — Keep-awake
- `Core/TrayService.js` — System tray
- `Core/AutoUpdateService.js` — electron-updater
- `Core/DataPortabilityService.js` — ZIP export/import

### Runtime Side Effects

- Keep-awake mode
- System tray behavior
- Auto-update checks
- Run-on-startup (`app.setLoginItemSettings`)
- App reset (deletes user data, relaunches)
