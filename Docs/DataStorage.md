# Data Storage

Data folder structure, persistence patterns, and path resolution.

---

## Data Folder Structure

```text
Data/
├── Agents/              Agent definitions and run logs
├── Avatar.jpg           User avatar image
├── Browsing/            Browser history
├── ChannelMessages/     Channel message history
├── Channels.json        Channel configurations
├── Chats/               Chat session files
├── Dreams/              Dream journal (memory consolidation)
├── Memories/            Long-term memory markdown files
├── Projects/            Project workspace records
├── Screenshots/         Browser screenshots
├── Security.json        App lock configuration
├── System.json          System info snapshot
├── Templates/           Prompt templates
├── Usage/               Token usage analytics
└── User.json            User profile and settings
```

---

## User.json

Stores user profile and settings:

```json
{
  "name": "User Name",
  "dateOfBirth": "2000-01-01",
  "locale": "en",
  "defaultView": "chat",
  "assistantLanguage": "en",
  "activePersona": "Joana",
  "customInstructions": "Custom behavior hints...",
  "theme": {
    "mode": "dark",
    "reducedMotion": false,
    "font": "default"
  },
  "appSettings": {
    "runOnStartup": false,
    "systemTray": false,
    "keepAwake": false,
    "completionSound": true,
    "autoMemoryUpdates": true,
    "autoUpdate": true
  }
}
```

---

## Security.json

App lock configuration:

```json
{
  "enabled": false,
  "passwordHash": "...",
  "autoLockTimeout": 5,
  "recoveryAnswer": "..."
}
```

---

## System.json

System info snapshot:

```json
{
  "os": "Windows",
  "platform": "win32",
  "arch": "x64",
  "nodeVersion": "22.0.0",
  "electronVersion": "42.4.0",
  "totalMemory": 16384,
  "cpuModel": "..."
}
```

---

## Channels.json

Channel configurations:

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "credentials": { "botToken": "..." },
      "systemPrompt": "Optional prompt"
    }
  }
}
```

---

## Chats/

Chat session files. Each session is a JSON file containing:

- Session metadata (id, title, timestamp)
- Message history (user/assistant messages)
- Attachments metadata
- Project context

---

## Memories/

Long-term memory markdown files. Each file represents a memory topic.

---

## Agents/

Agent definitions and run logs:

- Agent config (name, prompt, schedule, tools)
- Run history (status, output, timestamps)

---

## Projects/

Project workspace records:

- Project name and description
- Folder path (`folderPath` / `rootPath`)
- Cover image path
- Custom context

---

## Templates/

Prompt template storage. Each template is a JSON file.

---

## Usage/

Token usage analytics. Stored per-day and per-model.

---

## Path Resolution

### Development

```text
Data/ → <project-root>/Data/
```

### Packaged Build

```text
Data/ → <app.getPath('userData')>/
```

The `Data/` folder ships only seed/static files. User-generated data is excluded from the build.

### Code Pattern

```js
import { getWritableDataDirectory } from '../Shared/Storage/ResourcePaths.js';

const dataDir = getWritableDataDirectory();
// Returns correct path for dev or packaged build
```

---

## Resource Paths

`Packages/Shared/Storage/ResourcePaths.js` provides:

- `getWritableDataDirectory(rootDirectory)` — Writable data directory
- `getBundledResourceDirectory(rootDirectory, resourceName)` — Read-only bundled resources
- `getResourcePath(rootDirectory, resourceName, ...segments)` — Resolves to correct location
- `readJsonResource(rootDirectory, resourceName, ...segments)` — Reads JSON from bundled resources
- `writeJsonResource(rootDirectory, resourceName, fileName, data, options)` — Writes JSON to writable directory
- `getTrayIconPath(rootDirectory)` — Tray icon path

### Path Resolution Rules

| Resource | Dev | Packaged |
|---|---|---|
| `Packages/` | `<project>/Packages/` | Inside asar |
| `Config/` | `<project>/Config/` | Inside asar |
| `Assets/` | `<project>/Assets/` | Inside asar |
| `Data/` | `<project>/Data/` | `app.getPath('userData')` |
| `Skills/` | `<project>/Skills/` | `process.resourcesPath/Skills/` |
| `Personas/` | `<project>/Personas/` | `process.resourcesPath/Personas/` |

---

## State Persistence

Most packages use a similar pattern:

```js
// Read state
const state = await readJsonResource('SomeState.json');

// Write state
await writeJsonResource('SomeState.json', state);
```

`Shared/Storage/JsonDirectory.js` reads all `.json` files from a directory.

---

## Safe Path Handling

`Shared/Storage/SafePath.js` sanitizes file stems and path segments to prevent path traversal attacks.

---

## UserData

`Packages/Shared/UserData/UserData.js` (411 lines) manages user state:

- `createDefaultUserState()` — Default state with locale, profile, providers, connectors, app settings, theme
- `readUserState()` — Reads and sanitizes state
- `writeUserState()` — Writes with serialized write queue
- Full sanitization of incoming state
