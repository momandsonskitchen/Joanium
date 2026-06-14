# IPC Communication

Inter-process communication between Electron's main process and renderer process.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                    Renderer Process                      │
│                                                          │
│  ShellApp.js (SPA Router)                                │
│  ├── ChatApp.js                                          │
│  ├── SettingsPanel.js                                     │
│  └── ... (other views)                                   │
│                                                          │
│  window.Joanium.ipc.invoke(channel, ...args)  ←→  main   │
│  window.Joanium.ipc.on(channel, callback)                │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│                    Main Process                          │
│                                                          │
│  ipcMain.handle(channel, handler)                        │
│  ├── Chat IPC handlers                                   │
│  ├── Memory IPC handlers                                 │
│  ├── Toolset IPC handlers                                │
│  ├── ... (all package handlers merged via companions)    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## IPC Pattern

### Main Process (handler registration)

```js
ipcMain.handle('package:action', async (_event, payload) => {
  // logic
  return result;
});
```

### Renderer Process (calling IPC)

```js
const result = await window.Joanium.ipc.invoke('package:action', payload);
```

### Renderer Event Listeners

```js
window.Joanium.ipc.on('event:channel', (_event, data) => {
  // handle event
});

// Clean up
window.Joanium.ipc.removeAllListeners('event:channel');
```

---

## IPC Composition

The Shell package declares all other packages as `ipcCompanions`. During bootstrap, `createPackage()` recursively creates each companion and merges their IPC handlers:

```text
Shell.createPackage()
├── Load Shell module
├── Resolve ipcCompanions (all other packages)
├── For each companion:
│   ├── Load companion module
│   ├── Call companion.createPackage()
│   ├── Merge companion.ipcHandlers into Shell's handlers
│   └── Recursively process companion's own ipcCompanions
└── Register all merged handlers on ipcMain
```

This means a single BrowserWindow has access to every package's IPC channels.

---

## IPC Channel Naming Convention

Channels follow the pattern: `package-name:action-name`

Examples:

- `chat:stream-message`
- `memory:save`
- `toolset:execute-tool`
- `providers:list-catalog`
- `app-settings:get`
- `browser-preview:load-url`

---

## Streaming Pattern

For long-running operations (AI completions), the streaming pattern uses abort controllers:

```js
// Main process
ipcMain.handle('chat:stream-message', async (event, payload) => {
  const streamId = payload.streamId;
  const abortController = new AbortController();
  
  // Register abort controller
  activeStreams.set(streamId, abortController);
  
  // Stream chunks via event.sender.send()
  for await (const chunk of stream) {
    event.sender.send('chat:stream-chunk', { streamId, chunk });
  }
  
  event.sender.send('chat:stream-done', { streamId });
  activeStreams.delete(streamId);
});

// Renderer
window.Joanium.ipc.on('chat:stream-chunk', (_event, data) => {
  // Handle chunk
});

window.Joanium.ipc.on('chat:stream-done', (_event, data) => {
  // Stream complete
});
```

---

## Custom Renderer Events

`Packages/Shared/Events/RendererEvents.js` defines custom DOM events for renderer-side communication:

| Event | Purpose |
|---|---|
| `PROVIDERS_CHANGED` | Provider configuration changed |
| `CONNECTORS_CHANGED` | Connector configuration changed |
| `APP_SETTINGS_CHANGED` | App settings changed |
| `MEMORY_SYNC` | Memory sync triggered |
| `TRIGGER_MEMORY_SYNC` | Request memory sync |
| `THEME_CHANGED` | Theme changed |

These fire as custom DOM events and are consumed by UI components that need to react to state changes.

---

## Renderer IPC Wrapper

`Packages/Shared/Ipc/RendererIpc.js` provides thin wrappers:

```js
// Instead of:
window.Joanium.ipc.invoke(channel, ...args)

// Use:
import { invokeIpc } from '../Ipc/RendererIpc.js';
const result = await invokeIpc(channel, ...args);
```

---

## IPC Handler Registration

When navigating between packages, IPC handlers are registered/unregistered dynamically:

1. **Boot**: All handlers registered during `createPackage()`
2. **Navigation**: Old handlers unregistered, new handlers registered
3. **Shell**: All handlers remain registered for the lifetime of the app

---

## Error Handling

IPC errors propagate to the renderer as rejected promises. The renderer can catch them:

```js
try {
  const result = await window.Joanium.ipc.invoke('package:action');
} catch (error) {
  // Handle IPC error
}
```

---

## Key IPC Channels by Package

### Chat (11 channels)

`chat:bootstrap`, `chat:stream-message`, `chat:cancel-stream`, `chat:cancel-all-streams`, `chat:stream-message-agent`, `chat:complete-message`, `chat:enhance-prompt`, `chat:select-attachments`, `chat:process-dropped-files`, `chat:get-terminal-prompt`, `chat:fetch-url`

### Memory (15+ channels)

`memory:list`, `memory:read`, `memory:save`, `memory:search`, `memory:get-context`, `memory:get-catalog`, `memory:get-export-prompt`, `memory:get-triage-prompt`, `memory:get-import-prompt`, `memory:apply-updates`, `memory:delete`, `memory:cleanup-ai-reply`, `memory:cleanup-renderer-ready`, `memory:run-cleanup`, `memory:list-dreams`, `memory:read-dream`

### Toolset (6 channels)

`toolset:list-tools`, `toolset:execute-tool`, `connectors:list`, `connectors:save`, `connectors:remove`, `connectors:google-oauth`

### Providers (4 channels)

`providers:list-catalog`, `providers:list-configured`, `providers:save`, `providers:remove`

### AppSettings (10 channels)

`app-settings:get`, `app-settings:save`, `auto-update:get-state`, `auto-update:check`, `auto-update:install`, `app-settings:reset-app`, `app-settings:restart-app`, `app-settings:quit-app`, `data:export`, `data:import`

### LiveBrowser (17 channels)

`browser-preview:get-state`, `browser-preview:load-url`, `browser-preview:set-visible`, `browser-preview:set-bounds`, `browser-preview:hide`, `browser-preview:hide-native-view`, `browser-preview:show-native-view`, `browser-preview:go-back`, `browser-preview:go-forward`, `browser-preview:reload`, `browser-preview:pause`, `browser-preview:resume`, `browser-preview:close`, `browser-preview:get-history`, `browser-preview:clear-history`, `browser-preview:delete-history-entry`, `browser-preview:execute-tool`
