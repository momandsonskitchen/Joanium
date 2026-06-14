# Boot Process

The application bootstrap is a multi-stage sequence that discovers packages, resolves the entry point, and creates the Electron window.

---

## Entry Point: `App.js`

```text
App.js
├── Configures DebugLogger with rootDirectory
├── Sets up uncaughtException / unhandledRejection handlers
├── Writes boot log to Build/Logs/ or process.resourcesPath/Logs/
└── Calls bootstrapApplication()
```

`bootstrapApplication()` is imported from `Packages/Index.js`.

---

## Bootstrap Sequence: `Packages/Index.js`

The bootstrap is a 5-step process:

### Step 1: Package Discovery

```js
import { discoverPackages } from './Boot/Index.js';
```

`discoverPackages(packagesDirectory)` scans the `Packages/` directory for subdirectories containing a non-empty `Index.js` file. Returns a `Map<name, { id, entryPath }>`.

No package names are hardcoded. Adding a new package is automatic — just create a directory with an `Index.js`.

### Step 2: Load Core Modules

```js
const electron = loadPackageModule(registry, 'Electron');
const setup = loadPackageModule(registry, 'Setup');
```

The `Electron` and `Setup` packages are loaded first because they are needed before any other package.

### Step 3: Resolve Entry Package

```js
const entryPackageName = setup.resolveLaunchPackage();
```

`resolveLaunchPackage()` checks if onboarding is complete:

- If incomplete → returns `'Setup'` (shows the onboarding wizard)
- If complete → returns `'Shell'` (jumps to the main app)

### Step 4: Create Entry Package

```js
const entryPackage = createPackage(entryPackageName);
```

`createPackage()` is a recursive function that:

1. Loads the package module from the registry
2. Calls its `createPackage()` export
3. Recursively creates any `ipcCompanions` (packages whose IPC handlers are merged into the current window)
4. Merges all IPC handlers into a single `ipcHandlers` map

For Shell, this means ALL other packages' IPC handlers get merged into one BrowserWindow.

### Step 5: Boot Electron

```js
electron.bootElectron(entryPackage);
```

`bootElectron()` creates the BrowserWindow, registers IPC handlers, and starts the app.

---

## Package Auto-Discovery: `Packages/Boot/Index.js`

The boot system has 3 exports:

### `discoverPackages(packagesDirectory)`

Scans `Packages/` for directories with non-empty `Index.js`. Returns a `Map` of discovered packages.

### `loadPackageModule(registry, packageName)`

Dynamic `import()` of a package's `Index.js`. The module is cached after first load.

### `createBootLogger(logFilePath)`

Returns a timestamped boot-logging function for diagnostic output.

---

## IPC Composition

When Shell creates its BrowserWindow, it declares all other packages as `ipcCompanions`. The bootstrap recursively creates each companion, collecting their IPC handlers:

```text
Shell
├── Shell.ipcHandlers
├── Chat.ipcHandlers (merged)
├── Memory.ipcHandlers (merged)
├── Toolset.ipcHandlers (merged)
├── Providers.ipcHandlers (merged)
├── ... (all other packages)
└── All handlers registered on ipcMain
```

This means a single BrowserWindow has access to every package's IPC channels. The renderer process calls these via `window.Joanium.ipc.invoke()`.

---

## Electron Main Process: `Packages/Electron/Index.js`

`bootElectron()` configures:

1. **Chromium flags**: Disable backgrounding, GPU features, force sRGB
2. **Protocol**: Registers `app://` for cross-origin resource loading
3. **BrowserWindow**: Frameless, persisted window state, titlebar overlay
4. **IPC registration**: Registers/unregisters handlers on package navigation
5. **Production hardening**: Blocks reload/devtools/view-source/context-menu in packaged builds
6. **Geolocation**: Permission handler for Location tools
7. **Power**: `powerSaveBlocker.start('prevent-app-suspension')`

---

## Setup/Onboarding: `Packages/Setup/`

The setup wizard guides first-time users through:

1. Terms and conditions acceptance
2. User name and age
3. AI model selection (API or local)
4. Completion confirmation

`resolveLaunchPackage()` checks if onboarding is complete and routes accordingly.

---

## Shell Window: `Packages/Shell/`

The Shell is the main app container:

- **rendererPath**: `Shell/UI/App.html`
- **preloadPath**: `Shell/UI/Preload.js`
- **Window**: Frameless with titlebar overlay (platform-specific)
- **SPA Router**: `ShellApp.js` handles navigation between views

The Shell mounts settings panels, sidebar, and routes to different views (chat, history, projects, memory, templates, agents, skills, personas, marketplace, events, usage).

---

## Debug Mode

Start with `npm start --debug` or `JOANIUM_DEBUG=1 npm start` to:

- Print verbose main-process diagnostics to terminal
- Write debug logs to `Build/Logs/debug.log`
- Log package discovery, active tool inventory, prompt sizes, provider/model selection
- Log each Toolset execution with duration and sanitized parameters
