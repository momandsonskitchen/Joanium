# About
* Project: Joanium
* Codename: Project Joana
* Author: Joel Jolly
* Tag: AI, Agent, Personal AI, Digital Companion, Personal Assistant, AI Companion, AI Assistant

# Tech Stack
* Node.js
* Electron.js
* CSS
* JavaScript
* No react, no frameworks, no libraries other than the ones that are mentioned above. ( Vanilla JS )

# System Files Structure:
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

# Flow
## First time interaction:
* Greet the user and ask the user to accept our terms and conditions and privacy policy.
* Ask for the user's name.
* Ask for the user's age.
* take them to the AI model selection screen (where they can select the AI model they want to use API models, local models).
* then in the next page  say "congrats you have setup your AI assistant" and then take them to the chat screen.

## After setup and the next time the user opens the app, they should be taken directly to the chat screen.

# Folder Structure:
* Core: Backend logic
* UI: Frontend logic and view (includes css and js)
* IPC: Inter-Process Communication
* I18n: For language translations.

# Expected working
* In every package i have kept index.js file that should be the main entry point of that package. (as we are treating all the packages as microservices, they should be independently runnable)
    * example: if the ai needs to use telegram, then the ai should call the telegram package's index.js file alone and should not call any of its inner files directly. (inner files mean Core/, UI/, IPC/, ..)

# Ported Legacy Features
* Chat attachments and completion sound: `Packages/Chat` owns file picking, validation, extraction, composer chips, prompt context assembly, and the response completion chime. Attachments support text/code files plus PDF, DOCX, XLSX/XLSM, and PPTX extraction without importing from other packages.
* Chat slash commands: `Packages/Chat` owns the inline `/` command palette for chat actions, Shell navigation, prompt templates, and agent prompts. Connector slash scopes from legacy are intentionally not ported.
* Channels: `Packages/Channels` owns channel state, runtime polling/replies, validation, reply history, and channel-specific system prompts for Telegram, WhatsApp, Discord, and Slack. The channel gateway uses the same bounded agentic tool loop as chat, so external channel replies can use terminal, live browser, connector, memory, and Toolset tools before sending the final message.
* Browser Preview: `Packages/Toolset/LiveBrowser` owns the Electron browser view, browser-preview IPC, and live browser AI tools; `Packages/Chat` only provides the visible right-side host panel and bounds syncing.
* App Settings: `Packages/AppSettings` owns persisted app behavior settings plus keep-awake and tray runtime side effects. Shell only mounts its settings panel.
* Window State: `Packages/Electron` owns persisted native window bounds and maximized/fullscreen restore in `Data/WindowState.json`.
* Terminal: `Packages/Toolset/Terminal` owns local command execution, risk assessment, workspace inspection, file utilities, Git helpers, and process output buffers. Chat owns the embedded terminal drawer and terminal tool loop through Toolset-provided Terminal IPC, so command work stays inside the conversation instead of a separate Shell route.
* Toolset: `Packages/Toolset` owns built-in chat tools for calculations, unit conversion, local date/time utilities, local URL parsing/formatting helpers, local geospatial math/conversion helpers, timezone lookup, UUIDs, hashing, Base64, JSON formatting, text transforms, text stats, terminal-backed workspace tools, public data tools, connector-backed tools, and live browser tools. Password generation and similar password/security utilities live under `Packages/Toolset/Security`. Chat loads the tool prompt and executes requests through Toolset IPC.
* Public Data Tools: `Packages/Toolset/PublicData` owns no-key public lookup tools ported from legacy chat capabilities, including Wikipedia, Stack Overflow, npm, Open-Meteo weather, dictionary, country facts, quotes, jokes, Hacker News, Wikimedia Commons image search, exchange rates, CoinGecko crypto data, NASA APOD, and ISS location.
* Connectors: `Packages/Toolset/Connectors` owns API-key-backed chat tools and connector credentials. Settings mounts its Connectors panel, while Toolset executes GitHub and OpenWeather tools through connector-aware handlers.
* Memory: `Packages/Memory` owns long-term personal memory files in `Data/Memories`, exposes a Shell editor route, and provides compact chat context through IPC.
* About/System Info: `Packages/About` owns app metadata plus a local system snapshot persisted to `Data/System.json`.
* Custom Instructions: `Packages/User` stores user-written behavior instructions in `Data/User.json`; `Packages/Chat` adds them to the model system context.

# Design language
* All buttons should have rounded corners (20px).
* Should follow material 3 expressive design.
* I need a clean and very premium looking UI.
* Should match the current app design language.

# Packages/AppSettings
Owns persisted app behavior settings plus keep-awake and tray runtime side effects. Shell mounts its settings panel and routes each nav item to the correct sub-panel. The settings panel is a modal overlay with a left-side nav and a right-side content area.

## Settings Panel Pages

### User
* Owned by `Packages/User`.
* Lets the user update their display name, date of birth, avatar photo, and custom instructions (tone / style / behavior hints passed to the AI).
* Profile data is persisted in `Data/User.json`; the avatar image is stored in `Data/`.
* Shell re-syncs the sidebar avatar whenever a profile save or avatar change fires.

### App
* Owned by `Packages/AppSettings`.
* Exposes boolean toggles for app-level behaviour: run on startup, system tray, keep-awake, and completion sound.
* Settings are persisted and broadcast via a `joanium:app-settings-changed` window event so other packages can react without polling.

### Channels
* Owned by `Packages/Channels`.
* Manages connected external messaging channels: Telegram, WhatsApp, Discord, and Slack.
* Each channel entry stores its credentials, polling state, and an optional channel-specific system prompt.

### Connectors
* Owned by `Packages/Toolset/Connectors`.
* Stores API-key-backed service credentials (e.g. GitHub, OpenWeather) used by Toolset chat tools.
* Connector credentials are kept separate from channel config and are never exposed in the chat context directly.

### Providers
* Owned by `Packages/Providers`.
* Configures AI model providers — both API-based (OpenAI, Anthropic, etc.) and local (Ollama) models.
* The active provider and model selection drive what the chat completion engine calls at runtime.

### Appearance
* Owned by `Packages/Themes`.
* Controls the visual theme of the app (colour scheme, accent, light/dark mode).
* Theme state is persisted and applied on boot via `ThemeController` before any UI is rendered.

### MCP
* Owned by `Packages/MCP`.
* Manages Model Context Protocol server connections that extend the AI's tool capabilities.
* Each MCP entry stores the server URL, name, and connection state.

### Shortcuts
* Owned by `Packages/Shell` (`ShortcutsPanel.js`).
* Displays all registered keyboard shortcuts in a read-only reference panel.
* Shortcuts themselves are registered in `Shortcuts.js` and fire regardless of focus.

### Security
* Owned by `Packages/Security`.
* Configures app-lock: enable/disable password protection, set the password, choose the auto-lock idle timeout, and define a secret recovery answer.
* When enabled, a lock screen is mounted on boot and after the idle timer fires.

### About
* Owned by `Packages/About`.
* Shows app metadata (name, version, build) and a local system snapshot (OS, CPU, RAM, etc.) persisted to `Data/System.json`.

# Data Storage
* To store user data we use Data folder. 
* Project workspace records are stored in `Data/Projects` and can include user-defined context and cover image paths.

# Project Workspace
* The projects view should behave like a native workspace browser with searchable project cards, native image picking, and visually rich project previews.
* Opening a project should make that workspace context visible to the user inside chat, not silently attach hidden state.

# Must Follow
* Keep your code clean and organized.
* Dont keep unused code.
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
