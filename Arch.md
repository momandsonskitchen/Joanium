# About

* Project: Joanium
* Codename: Project Joana
* Author: Joel Jolly
* Tag: AI, Agent, Personal AI, Digital Companion, Personal Assistant, AI Companion, AI Assistant

## Tech Stack

* Node.js
* Electron.js
* CSS
* JavaScript
* No react, no frameworks, no libraries other than the ones that are mentioned above. ( Vanilla JS )

## System Files Structure

* Assets: only for images, audios, videos only.
* Docs: only for markdown documents only (about the system and it workings).
* Data: only for user data and model data only.
* Shared: for files/features/functions that are used across packages.
* Build: only for build scripts only.
* Config: only for configuration files only (files that the AI agent requires but cannot or should not be exposed to the user).
* Data/Memories: markdown files that should be updated based on user's interactions with the AI.
* Data/Models: AI models (ollama models, api models, etc) related information.
* Packages/Boot: for files related to auto discovery of packages (the Index.js files that are kept in every package).
* Skills: markdown files that contains the skills of the AI agent.
* Personas: markdown files that contains the personas of the AI agent (Joana is the default set persona).
* Packages: that contains the features.

## Flow

### First time interaction

* Greet the user and ask the user to accept our terms and conditions and privacy policy.
* Ask for the user's name.
* Ask for the user's age.
* take them to the AI model selection screen (where they can select the AI model they want to use API models, local models).
* then in the next page  say "congrats you have setup your AI assistant" and then take them to the chat screen.

### After setup and the next time the user opens the app, they should be taken directly to the chat screen

## Folder Structure

* We follow and should use only feature-based architecture or vertical slice architecture.
* Core: Backend logic
* UI: Frontend logic and view (includes css and js)
* IPC: Inter-Process Communication
* I18n: For language translations.

## Expected working

* Should work in all 3 OS (Windows, Linux, Mac)
* In every package i have kept index.js file that should be the main entry point of that package. (as we are treating all the packages as microservices, they should be independently runnable)
  * example: if the ai needs to use telegram, then the ai should call the telegram package's index.js file alone and should not call any of its inner files directly. (inner files mean Core/, UI/, IPC/, ..)

## Read Only Files

* All files inside Assets, Config, Datasets are read only and needs to be inside the asar (for production).
* All files inside Data are read and write only.

## Ported Features From The Original App

* Chat attachments and completion sound: `Packages/Chat` owns file picking, validation, extraction, composer chips, prompt context assembly, and the response completion chime. Attachments support text/code files plus PDF, DOCX, XLSX/XLSM, and PPTX extraction without importing from other packages. Drag-and-drop onto the chat view is supported — the drop overlay is scoped exclusively to the chat view element and never appears on other Shell pages. The overlay label and accepted file types update dynamically based on whether the active model supports image inputs (`model.inputs.image`). Dropped file paths are processed via the `chat:process-dropped-files` IPC channel, which shares the same `readAttachmentFiles` backend as the dialog-based picker.
* Chat slash commands: `Packages/Chat` owns the inline `/` command palette for chat actions, Shell navigation, prompt templates, and agent prompts. Connector slash scopes from the original app are intentionally not ported.
* Channels: `Packages/Channels` owns channel state, runtime polling/replies, validation, reply history, and channel-specific system prompts for Telegram, WhatsApp, Discord, Slack, Zulip, and Mattermost. The channel gateway uses the shared assistant pipeline in `Packages/Shared/AssistantRuntime`, so external channel replies use the same prompt/context assembly and bounded tool loop as chat before sending the final message.
* Browser Preview: `Packages/LiveBrowser` owns the Electron browser view, browser-preview IPC, and live browser AI tools; `Packages/Chat` only provides the visible right-side host panel and bounds syncing.
* App Settings: `Packages/AppSettings` owns persisted app behavior settings plus keep-awake, tray, assistant language, default model/view, auto memory update, app auto update, and reset runtime side effects. Shell only mounts its settings panel.
* App Auto Update: `Packages/AppSettings/Core/AutoUpdateService.js` owns packaged-app update checks, download/install state, and update IPC. Packaged release builds resolve updates from the GitHub Releases feed for `Joanium/Joanium`; development builds report updates as unavailable. The App settings panel owns the persisted toggle, while the About page shows live download progress and install readiness.
* Window State: `Packages/Electron` owns persisted native window bounds and maximized/fullscreen restore in `Data/WindowState.json`.
* Terminal: `Packages/Toolset/Tools/Command`, `Packages/Toolset/Tools/Directory`, and `Packages/Toolset/Tools/Git` own local command execution, process streaming, workspace inspection, file utilities, and Git helpers. Chat owns the embedded terminal drawer and terminal tool loop through Toolset-provided IPC, so command work stays inside the conversation instead of a separate Shell route. Project-aware Git helpers now include status, diff, branch listing, branch creation/checkout/deletion, pull, commit, push, and pull-then-push sync; mutating Git tools require the model to set `allow_risky=true` and should only be used after explicit user intent. The chat composer shows the active project and project Git controls in one V2 container: project name/folder on the left, branch/status plus refresh, status, pull/push/sync, and commit dropdown actions on the right. Commit, commit-and-push, and commit-and-sync open an inline commit message editor with an AI-generated message button powered by the current model and the project Git diff.
* Toolset: `Packages/Toolset` owns tool discovery, connector state, and built-in chat tools for calculations, unit conversion, local date/time utilities, local URL parsing/formatting helpers, local geospatial math/conversion helpers, timezone lookup, UUIDs, hashing, Base64, JSON formatting, text transforms, text stats, terminal-backed workspace tools, public data tools, and connector-backed tools. Service and public lookup tool packages are discovered from `Packages/Toolset/Tools/<ToolName>/Index.js`, while package-level tool exports such as `Packages/LiveBrowser/Index.js` can also participate in discovery. Each tool keeps backend code in `Core`, user-facing tool/connector strings in `I18n`, and UI assets in `UI` only when needed. Password generation and similar password/security utilities live under `Packages/Toolset/Tools/Security`. Chat loads the tool prompt and executes requests through Toolset IPC. The full original connector tool inventory is now represented in V2 Toolset, with newer V2 handlers taking precedence for overlapping tool names.
* Tool package standard: Toolset discovery supports package-level prompt sections in addition to tool definitions and executors. Tool packages use `Packages/Toolset/Tools/<ToolName>/API.js`, `Tools.js`, `Executors.js`, `Prompt.js`, and `Index.js`; `Index.js` is the only file Toolset discovery imports directly. Connector executor code is bridged through the shared Toolset adapter so credentials come from V2 connector state while packages remain dynamically discovered.
* Sub Agents: `Packages/Toolset/Tools/SubAgents` publishes the `spawn_sub_agents` chat tool using the standard tool package shape. The Chat package executes delegation so each sub-agent inherits the active conversation, persona, memory, selected model, project context, terminal tools, and Toolset tools through the same bounded tool loop as chat, then returns structured handoffs to the coordinator for the final answer.
* Shared Assistant Pipeline: `Packages/Shared/AssistantRuntime/AssistantPipeline.js` is the single prompt execution pipeline used by Chat, Channels, and Agents. It loads memory, terminal tool prompts, Toolset prompts, persona context, project context, mode instructions, provider/model choices, and source metadata, then routes non-chat surfaces through the shared bounded renderer tool loop. Chat keeps its rich streaming UI, but it builds the same pipeline request shape.
* Scheduled Agent Tool Loop: `Packages/Agents` uses the same renderer-delegated tool loop pattern as Channels. The main-process scheduler sends `agents:run-with-tools` to the renderer window; `Packages/Agents/UI/AgentGateway.js` runs the shared assistant pipeline (terminal, Toolset, connector, memory, and MCP tools) using `chat:complete-message` then resolves back to the main process via the `agents:tool-reply` IPC handler. This gives scheduled agents the same full tool access as chat and channel replies without violating the no-cross-package-import rule.
* Public Data Tools: `Packages/Toolset/PublicData` owns no-key public lookup tools ported from original chat capabilities, including Wikipedia, Stack Overflow, npm, Open-Meteo weather, dictionary, country facts, quotes, jokes, Hacker News, Wikimedia Commons image search, exchange rates, CoinGecko crypto data, NASA APOD, and ISS location.
* Connectors: `Packages/Toolset/Core`, `Packages/Toolset/UI`, and `Packages/Toolset/I18n` own API-key-backed tool credentials, connector runtime state, and the shared settings UI. Connector-backed tool packages such as GitHub and OpenWeather live under `Packages/Toolset/Tools`, publish their connector metadata from their own `I18n` files, and are discovered by Toolset during boot. Google Workspace OAuth now requests the broad scopes needed by the ported Gmail, Drive, Calendar, Contacts, Docs, Forms, Photos, Sheets, Slides, Tasks, and YouTube tools.
* Memory: `Packages/Memory` owns long-term personal memory files in `Data/Memories`, exposes a Shell editor route, imports profile summaries through the current chat model, and provides compact chat context through IPC.
* Auto Memory Updates: `Packages/Chat` schedules private background memory syncs after saved non-private sessions. It uses `Prompts/Memory.md`, pending session fingerprints from `Packages/History`, and `memory:apply-updates` so only durable user facts are written back to `Data/Memories`.
* System Prompts: `Packages/Chat/Core/ChatState.js` builds the model system context from `Prompts/System.md`, compact runtime facts, active persona, custom user instructions, active project workspace context, memory, terminal tools, and Toolset prompt sections. `Prompts/System.md` contains the V2-safe port of the original agent behavior contract without naming tools that V2 does not expose. Project-oriented prompt templates live in `Prompts/ProjectContext.md`, `Prompts/GitCommit.md`, and `Prompts/GitCommitDiff.md` so workspace-specific model instructions stay out of UI/i18n code. Longer tool, browser, location, skills, knowledge, and slash-mode prompts live under `Prompts/` as markdown or dedicated prompt modules; short reusable prompt snippets live in `Prompts/Prompts.js`.
* About/System Info: `Packages/About` owns app metadata, live app update presentation (status, progress, install action), and a local system snapshot persisted to `Data/System.json`.
* Custom Instructions: `Packages/User` stores user-written behavior instructions in `Data/User.json`; `Packages/Chat` adds them to the model system context.
* Birthday Card: `Packages/User/UI/BirthdayCard.js` mounts a full-viewport celebratory overlay with canvas confetti on the user's birthday (day + month match from `Data/User.json`). Shows the user's avatar photo when one is set; omits the image slot otherwise. Mounted by `Packages/Shell` after the initial route renders. All strings are owned by `Packages/User/I18n`.

## Build System

### Scripts

* `Scripts/Build.mjs` — production build entry point. Runs `SetVersionByDate.mjs` then `electron-builder`.
* `Scripts/SetVersionByDate.mjs` — stamps `package.json` with a date-based version (`YYYY.MMDD.patch`). Writes the 2-part base version to stdout so CI can append its own counter.

* Debug runtime: start the app with `npm start --debug`, `npm start -- --debug`, or `JOANIUM_DEBUG=1 npm start` to print verbose main-process diagnostics to the terminal and `Build/Logs/debug.log`. Debug mode logs package discovery, active tool inventory, prompt sizes, selected provider/model, and each Toolset execution with duration and sanitized parameters.

### Config

* `electron-builder.json` — electron-builder configuration (targets, icons, file inclusion, publish settings). Kept separate from `package.json` for clarity.

### File Packaging Strategy

* **Inside asar** (`files`): `App.js`, `Packages`, `Datasets`, `Prompts`. Code-only, read-only at runtime.
* **Outside asar** (`extraResources`): `Assets`, `Data`, `Skills`, `Personas`. Placed at `process.resourcesPath` so they are accessible outside the asar sandbox.
* `Data` ships only seed/static files. User-generated data (chats, memories, agents, channels, projects, security, avatar, usage) is excluded from the build via filters that mirror `.gitignore`.

### Path Resolution (Packaged vs Dev)

* `rootDirectory` always resolves to the asar root (or project root in dev) — used for `Assets`, `Packages`, etc.
* Files in `extraResources` (e.g. `Data/Models`) must be resolved via `process.resourcesPath` when `app.isPackaged` is `true`. Use the pattern: `const dataRoot = app.isPackaged ? process.resourcesPath : rootDirectory;`

### CI/CD

* `.github/workflows/Release.yml` — manual trigger (`workflow_dispatch`) that versions, tags, creates a GitHub release, then fans out to three parallel jobs: Windows (NSIS installer), macOS (DMG), Linux (AppImage). Each job calls `electron-builder --publish always` with `GH_TOKEN`.

## Design language

* All buttons should have rounded corners (20px).
* Should follow material 3 expressive design.
* I need a clean and very premium looking UI.
* Should match the current app design language.
* Setup/onboarding controls use the shared Bubbly UI entry point:
  `Packages/Shared/Bubbly/Index.js` and `Packages/Shared/Bubbly/Bubbly.css`. Add or
  re-export setup-facing shared controls there instead of creating one-off inputs,
  dropdowns, buttons, selectors, or loaders inside `Packages/Setup`.

## Packages/AppSettings

Owns persisted app behavior settings plus keep-awake and tray runtime side effects. Shell mounts its settings panel and routes each nav item to the correct sub-panel. The settings panel is a modal overlay with a left-side nav and a right-side content area.

### Settings Panel Pages

#### User

* Owned by `Packages/User`.
* Lets the user update their display name, date of birth, avatar photo, and custom instructions (tone / style / behavior hints passed to the AI).
* Profile data is persisted in `Data/User.json`; the avatar image is stored in `Data/`.
* Shell re-syncs the sidebar avatar whenever a profile save or avatar change fires.

#### App

* Owned by `Packages/AppSettings`.
* Exposes boolean toggles for app-level behaviour: run on startup, system tray, keep-awake, completion sound, auto memory updates, and app auto update.
* **Assistant language** - stores the response locale in `Data/User.json` so chat system context can carry the user's preferred language.
* **App default view** — controls which view the app opens on after setup. Defaults to `chat`. The user can change it to any of the following: `chat`, `history`, `projects`, `memory`, `templates`, `agents`, `skills`, `personas`, `marketplace`, `events`, `usage`. The selected value is persisted in `Data/User.json` and read by Shell on boot to navigate to the correct view before anything is rendered.
* App auto update exposes both the persisted toggle and runtime updater state. Development builds show the updater as unavailable; packaged builds can check for updates and install a downloaded update from the App settings page.
* Reset clears known user data files/directories from the writable data directory, then relaunches the app.
* Settings are persisted and broadcast via a `joanium:app-settings-changed` window event so other packages can react without polling.

#### Channels

* Owned by `Packages/Channels`.
* Manages connected external messaging channels: Telegram, WhatsApp, Discord, Slack, Zulip, and Mattermost.
* Each channel entry stores its credentials, polling state, and an optional channel-specific system prompt.

#### Connectors

* Owned by `Packages/Toolset/Core`, `Packages/Toolset/UI`, and `Packages/Toolset/I18n`.
* Stores API-key-backed service credentials (e.g. GitHub, OpenWeather) used by Toolset chat tools.
* Connector credentials are kept separate from channel config and are never exposed in the chat context directly.

#### Providers

* Owned by `Packages/Providers`.
* Configures AI model providers — both API-based (OpenAI, Anthropic, etc.) and local (Ollama) models.
* The active provider and model selection drive what the chat completion engine calls at runtime.

#### Appearance

* Owned by `Packages/Themes`.
* Controls the visual theme of the app (light/dark mode), reduced motion, and interface font.
* Theme state is persisted and applied on boot via `ThemeController` before any UI is rendered.

#### MCP

* Owned by `Packages/MCP`.
* Manages Model Context Protocol server connections that extend the AI's tool capabilities.
* Each MCP entry stores the server URL, name, and connection state.

#### Shortcuts

* Owned by `Packages/Shell` (`ShortcutsPanel.js`).
* Displays all registered keyboard shortcuts in a read-only reference panel.
* Shortcuts themselves are registered in `Shortcuts.js` and fire regardless of focus.

#### Security

* Owned by `Packages/Security`.
* Configures app-lock: enable/disable password protection, set the password, choose the auto-lock idle timeout, and define a secret recovery answer.
* When enabled, a lock screen is mounted on boot and after the idle timer fires.

#### About the App

* Owned by `Packages/About`.
* Shows app metadata (name, version, build), packaged-build update status/download progress from GitHub Releases, and a local system snapshot (OS, CPU, RAM, etc.) persisted to `Data/System.json`.

## Data Storage

* To store user data we use Data folder.
* Project workspace records are stored in `Data/Projects` and can include user-defined context and cover image paths.

## Project Workspace

* The projects view should behave like a native workspace browser with searchable project cards, native image picking, and visually rich project previews.
* Opening a project should make that workspace context visible to the user inside chat, not silently attach hidden state.
* Project records preserve the selected workspace folder as `folderPath` / `rootPath`; Chat includes it in the system context and uses it as the default working directory for terminal, Git status, Git diff, and project checks.

## Must Follow

* Keep your code clean and organized.
* Dont keep unused code.
* Put small single line prompts inside Prompts.js and longer ones inside Prompts folder
* Inside packages all are individual so no one package should import or use from another package. (if there is something that is common then keep it in Shared)
* Do not add any html related attributes to any of the elements. (like data-attribute like that will reveal to the user that this is a html page and not a native app)
* Do not use the `title` attribute on any element — it triggers the native browser tooltip which looks out of place in a desktop app.
* Dont take shortcuts.
* I need scalable architecture and maintainable, upgradable, easy to debug.
* Documentation should be updated when you make any changes.
* Since we are having Index.js for every sub packages there should be a discovery code that should auto discover those packages without hardcoding anything.
* do not use commonJS modules use ES modules only.
* i need a highly scalable architecture so that i can add new features (packages) easily without breaking the existing ones.
* Do not hard code text in js or in html they all must come from i18n files only (English is the fallback and the default language).
* the app should feel like macos like app.
* also if you have helpers for the main code that you are working keep it in Utils.js
