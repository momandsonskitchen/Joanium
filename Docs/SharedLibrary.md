# Shared Library

`Packages/Shared/` is the ONLY package other packages may import from. It contains 27+ public modules.

---

## Exports

`Packages/Shared/Index.js` re-exports selected public symbols:

```js
// Key exports (representative, not exhaustive)
export * as Bubbly from './Bubbly/Index.js';
export * as AssistantPipeline from './AssistantRuntime/AssistantPipeline.js';
export * as DebugLogger from './Debug/DebugLogger.js';
export { createEnqueue } from './Utils/AsyncUtils.js';
export { readJsonDirectory } from './Storage/JsonDirectory.js';
export { getTrayIconPath } from './Storage/ResourcePaths.js';
export { EVENTS, dispatchEvent } from './Events/RendererEvents.js';
// ... and more
```

---

## Modules

### Common

**Path**: `Shared/Common/`

- `Common.css` — Shared design token system with CSS custom properties for typography, colors, surfaces, borders, shadows, radii, transitions, and dark theme tokens

### AssistantRuntime

**Path**: `Shared/AssistantRuntime/`

- `AssistantPipeline.js` — The shared prompt execution pipeline used by Chat, Channels, and Agents
- `AssistantContext.js` — Caches context for the pipeline
- `Utils.js` — Optional-value helpers

The pipeline loads memory, terminal tool prompts, Toolset prompts, persona context, project context, mode instructions, provider/model choices, and source metadata, then routes non-chat surfaces through the shared bounded renderer tool loop.

### Debug

**Path**: `Shared/Debug/`

- `DebugLogger.js` — Debug-mode logging (activates via `--debug` flag or `JOANIUM_DEBUG=1`)
- `FileLogger.js` — Timestamped file-append logger

Debug logging sanitizes secrets and writes to `Build/Logs/debug.log`.

### I18n

**Path**: `Shared/I18n/`

- `en.js` — English strings for markdown code block UI (Copy, Copied!, Download)

### Markdown

**Path**: `Shared/Markdown/`

- `Frontmatter.js` — Parse/strip YAML frontmatter
- `MarkdownLibrary.js` — List/load markdown from namespaced directories
- `MarkdownRenderer.js` + `.css` — Client-side markdown rendering
- `NamespacedResourceLibrary.js` — Dual-directory lookup: bundled + writable
- `ThinkingParser.js` — Extracts `<think>` blocks from AI responses

### Storage

**Path**: `Shared/Storage/`

- `ResourcePaths.js` — Central path resolution: `getWritableDataDirectory()`, `getBundledResourceDirectory()`, `getResourcePath()`, `readJsonResource()`, `writeJsonResource()`, `getTrayIconPath()`
- `JsonDirectory.js` — Reads all `.json` files from a directory
- `SafePath.js` — Sanitizes file stems and path segments

### SubAgents

**Path**: `Shared/SubAgents/`

- `SubAgentTasks.js` — Normalizes raw AI sub-agent task JSON into structured task objects. Max 8 tasks. Supports multiple input shapes.

### ToolLoop

**Path**: `Shared/ToolLoop/`

- `TerminalToolNames.js` — Single source of truth for all 40+ terminal tool names
- `RendererToolLoop.js` — 879-line bounded tool loop: parses tool blocks from AI responses, executes via IPC, feeds results back, repeats up to `maxToolCalls`
- `Prompts.js` — Tool loop step messages and skills context template

### Events

**Path**: `Shared/Events/`

- `RendererEvents.js` — Custom DOM events: `PROVIDERS_CHANGED`, `CONNECTORS_CHANGED`, `APP_SETTINGS_CHANGED`, `MEMORY_SYNC`, `TRIGGER_MEMORY_SYNC`, `THEME_CHANGED`

### Utils

**Path**: `Shared/Utils/`

- `AsyncUtils.js` — Serial enqueue
- `DateUtils.js` — Relative time, day groups, ISO formatting
- `DiffUtils.js` — Compute diff
- `DomUtils.js` — `createElement`, `escapeHtml`, `formatText`, `makeEditableTextarea`
- `PromptUtils.js` — Read bundled prompt files, template interpolation
- `StringUtils.js` — Slug, regex escape, JSON extract, truncate, normalize
- `UrlUtils.js` — URL utilities
- `ValueUtils.js` — `clamp`, `compactObject`, `deepClone`, `formatBytes`, `toBoolean`
- `__tests__/` — Fuzz tests

### ProviderCatalog

**Path**: `Shared/ProviderCatalog/`

- `ProviderCatalog.js` — Reads provider metadata from `Config/Models/index.json`. Contains tint/glow color palette for 35+ providers.
- `ProviderUtils.js` — `orderProvidersBySelection()`, `providerIsConfigured()`
- `ModelSync.js` — Background model-list sync
- `LiveModelFilter.js` — Live model filtering
- `ModelFetcher.js` — Model list fetching
- `ModelOptions.js` — Model option formatting

### Bubbly

**Path**: `Shared/Bubbly/`

UI component library:

- `ApiKeyInput` — API key input field
- `Button` — Styled button
- `Checkbox` — Checkbox input
- `DropDown` — Dropdown select
- `InputBox` — Text input
- `Modal` — Modal dialog
- `TagSelector` — Tag selection

Also re-exports:

- `LogoLoader` — Logo loading
- `CustomScrollbar` — Custom scrollbar
- `ProviderScroller` — Provider card scroller

### Ipc

**Path**: `Shared/Ipc/`

- `RendererIpc.js` — Thin wrappers around `window.Joanium.ipc.invoke()` / `.on()` / `.removeAllListeners()`

### UserData

**Path**: `Shared/UserData/`

- `UserData.js` — 411-line user state management. Defines `createDefaultUserState()`, `readUserState()`, `writeUserState()` with serialized write queue. Full sanitization of incoming state.

### UsageTracker

**Path**: `Shared/UsageTracker/`

- `UsageTracker.js` — Token estimation (~4 chars/token), per-day and per-model usage tracking stored in `Data/Usage/`

### Icons

**Path**: `Shared/Icons/`

- `createProviderIcon()` — Creates provider icon elements

### UI Components

| Component | Path | Purpose |
|---|---|---|
| SecretField | `Shared/UI/SecretField.js` | Masked input for API keys |
| PanelControls | `Shared/PanelControls/` | Reusable panel CSS styles (CSS only, no JS) |
| PanelHeader | `Shared/PanelHeader/` | Reusable panel header |
| PanelList | `Shared/PanelList/` | Reusable panel list |
| SearchBar | `Shared/SearchBar/` | Search bar component |
| DropDownLite | `Shared/DropDownLite/` | Lightweight dropdown |
| InputBoxLite | `Shared/InputBoxLite/` | Lightweight input |
| LogoLoader | `Shared/LogoLoader/` | Logo loading + CSS |
| CustomScrollbar | `Shared/CustomScrollbar/` | Custom scrollbar styling |
| ProviderScroller | `Shared/ProviderScroller/` | Provider card scroller |
| TwoColGrid | `Shared/TwoColGrid/` | Two-column grid layout |
| TerminalCallCard | `Shared/TerminalCallCard/` | Terminal output display card |

---

## Using Shared Modules

```js
// Via Index.js re-exports (preferred for commonly used symbols)
import { Bubbly, DebugLogger, createEnqueue } from '../Shared/Index.js';

// Via direct inner file imports (also valid — many packages do this)
import { UserData } from '../Shared/UserData/UserData.js';
import { ResourcePaths } from '../Shared/Storage/ResourcePaths.js';
import { RendererToolLoop } from '../Shared/ToolLoop/RendererToolLoop.js';
```

Both import styles are used in the codebase. Use whichever matches the existing pattern in the package you're working on.
