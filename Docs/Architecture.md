# Architecture

Joanium is a **local-first AI desktop assistant** built with Electron and vanilla JavaScript (ESM). No React, no frameworks. Node.js >= 24. Cross-platform: Windows, macOS, Linux.

---

## Core Principles

- **Local-first**: User data lives on the user's machine. No telemetry, no cloud sync unless opt-in.
- **Provider-agnostic**: No single AI vendor is a dependency. Swap models freely.
- **Composable**: Capabilities, features, skills, and personas are modular and independently extensible.
- **Desktop-grade UX**: Native desktop app, not a web app wrapped in a frame.
- **Developer-friendly**: Readable, well-structured vanilla JavaScript — no heavy build toolchain.

---

## Tech Stack

- **Runtime**: Node.js >= 22, Electron 42.4.0
- **Language**: JavaScript (ESM only — no CommonJS)
- **UI**: Vanilla JS, CSS, custom DOM utilities
- **Build**: electron-builder, custom build scripts
- **Linting**: ESLint, Prettier, markdownlint
- **Testing**: Fast-check (fuzz), manual

---

## Folder Roles

| Folder | Purpose | Read/Write | Packaging |
|---|---|---|---|
| `Packages/` | All features. Each is an independent package. | Read (code) | Inside asar |
| `Packages/Shared/` | Code used by more than one package. | Read (code) | Inside asar |
| `Assets/` | Images, audio, video. | Read-only | Inside asar |
| `Config/` | App config files (model catalogs, etc.). | Read-only | Inside asar |
| `Data/` | User data. | Read-write | Outside asar |
| `Datasets/` | Static datasets. | Read-only | Inside asar |
| `Personas/` | AI persona markdown files. | Read-write | Outside asar |
| `Prompts/` | System prompt markdown files. | Read-only | Inside asar |
| `Scripts/` | Build scripts only. | Read-only | N/A |
| `Skills/` | AI skill markdown files. | Read-write | Outside asar |
| `Docs/` | Developer documentation. | Read-only | N/A |

---

## Package Internal Structure

Every package follows this layout:

```text
Packages/<Name>/
├── Index.js       ← Only public entry point. Other packages import ONLY this.
├── Core/          ← Backend logic (state, services, business rules)
├── UI/            ← Renderer process (HTML, CSS, JS)
├── IPC/           ← Inter-process communication handlers
├── I18n/          ← All user-facing strings (English is default/fallback)
└── Utils.js       ← Helpers for this package (only if needed)
```

### Why this structure?

- **Index.js isolation**: Every package exposes a single entry point. Nothing outside a package imports its inner files. This enforces the microservice boundary.
- **Core/UI/IPC separation**: Backend logic, frontend presentation, and IPC handlers are cleanly separated.
- **I18n ownership**: All user-facing strings live in `I18n/` files. No hardcoded text in JS or HTML.
- **Utils.js**: Helper functions supporting main logic live alongside the main file, not scattered.

---

## Architectural Pattern: Feature-Based / Vertical Slice

Each package owns its complete vertical slice — backend, UI, IPC, and i18n. Packages communicate exclusively via IPC. The only shared code lives in `Packages/Shared/`.

### IPC Composition

The Shell package declares all other packages as `ipcCompanions`. This merges every package's IPC handlers into a single BrowserWindow without cross-package imports:

```text
Shell BrowserWindow
├── Shell's own IPC handlers
├── Chat's IPC handlers (merged via companions)
├── Memory's IPC handlers (merged via companions)
├── Toolset's IPC handlers (merged via companions)
├── ... (all other packages)
```

### Package Communication Rules

1. **Never import across packages** — if something is shared, it lives in `Packages/Shared/`.
2. **IPC for cross-package signals** — packages communicate through IPC channels.
3. **Shared events** — `Packages/Shared/Events/` defines custom DOM events for renderer-side communication.

---

## Path Resolution (Critical for Packaged Builds)

In production builds, `extraResources` files live at `process.resourcesPath`, not the app root:

```js
const dataRoot = app.isPackaged ? process.resourcesPath : rootDirectory;
```

| Path | Dev | Packaged |
|---|---|---|
| `rootDirectory` | Project root | Inside asar |
| `process.resourcesPath` | Undefined | `resources/` folder |
| `app.getPath('userData')` | OS user data dir | OS user data dir |

Files in `extraResources` (Data, Skills, Personas) must be resolved via `process.resourcesPath` when `app.isPackaged` is `true` for bundled reads. Writable Data uses `app.getPath('userData')`.

---

## File Packaging Strategy

### Inside asar (`files` in electron-builder)

- `App.js` — main entry point
- `Assets/` — images, audio, video
- `Packages/` — all package code
- `Datasets/` — static datasets
- `Prompts/` — system prompts
- `Config/` — model catalogs

### Outside asar (`extraResources` in electron-builder)

- `Data/` — user data (ships only seed/static files)
- `Skills/` — AI skill markdown files
- `Personas/` — AI persona markdown files

User-generated data (chats, memories, agents, channels, projects, security, avatar, usage, templates, channel messages, model cache, logs, screenshots, MCP servers, system info) is excluded from the build via filters.

---

## Data Storage

User data is stored in the `Data/` folder:

| Path | Purpose |
|---|---|
| `Data/Chats/` | Chat session files |
| `Data/Memories/` | Long-term memory markdown files |
| `Data/Agents/` | Agent definitions and run logs |
| `Data/Channels.json` | Channel configurations |
| `Data/ChannelMessages/` | Channel message history |
| `Data/Projects/` | Project workspace records |
| `Data/Templates/` | Prompt templates |
| `Data/Usage/` | Token usage analytics |
| `Data/Browsing/` | Browser history |
| `Data/Screenshots/` | Browser screenshots |
| `Data/Dreams/` | Dream journal (memory consolidation) |
| `Data/User.json` | User profile and settings |
| `Data/Security.json` | App lock configuration |
| `Data/System.json` | System info snapshot |
| `Data/Avatar.jpg` | User avatar image |

---

## Project Workspace

The projects view behaves like a native workspace browser with searchable project cards and visually rich previews. Opening a project makes that workspace context visible to the user inside chat. Project records preserve the selected workspace folder as `folderPath` / `rootPath`; Chat includes it in the system context and uses it as the default working directory for terminal, Git, and project checks.

---

## Ported Features from Original App

### Chat

- Attachments and completion sound (file picking, validation, extraction, drag-and-drop)
- Slash commands (inline `/` command palette)
- Terminal drawer and terminal tool loop

### Channels

- External messaging: Telegram, WhatsApp, Discord, Slack, Zulip, Mattermost, ntfy
- Uses shared assistant pipeline for replies

### Toolset

- Tool discovery, connector state, built-in chat tools
- 28 tool packages (Cloudflare, GitHub, Google, Jira, Linear, Notion, etc.)
- Public data tools (Wikipedia, weather, crypto, NASA, etc.)

### Other

- Browser Preview (Electron browser view with AI tools)
- App Settings (persisted behavior, keep-awake, auto-update)
- Window State (persisted bounds and maximized/fullscreen restore)
- Memory (long-term personal memory with auto-updates)
- Scheduled Agents (background execution with full tool access)
- MCP (Model Context Protocol server connections)
- About/System Info (app metadata and system snapshot)
- Custom Instructions (user-written behavior hints)
- Birthday Card (celebratory overlay on user's birthday)

---

## Must Follow

1. Always use `CustomScrollbar` from `Packages/Shared` for scrollable areas.
2. Keep code clean and organized. No dead code, no commented-out blocks.
3. Small single-line prompts go in `Prompts/Prompts.js`; longer ones go in `Prompts/` folder.
4. No package imports from another package — use `Packages/Shared`.
5. No HTML attributes that expose the DOM (`data-*`, `title`).
6. Scalable, maintainable, upgradable, easy-to-debug architecture.
7. Documentation updated when changes are made.
8. Auto-discovery for packages — no hardcoding.
9. ESM only — no CommonJS.
10. No hardcoded text in JS or HTML — all from i18n files.
11. App should feel like a native macOS app.
12. Helpers go in `Utils.js`.
