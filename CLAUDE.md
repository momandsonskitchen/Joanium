# Joanium — Claude Code Instructions

This file is read by Claude Code automatically. It gives Claude the project context, rules, and conventions needed to contribute correctly.

---

## Project Summary

Local-first AI desktop assistant. Electron + vanilla JS (ESM). Node ≥ 24. No React, no frameworks. Cross-platform.

Read `Arch.md` for full architecture. Read `AGENTS.md` for coding rules.

---

## Before You Write Any Code

1. Read the relevant `Index.js` to understand a package's public API
2. Check `Packages/Shared/` before writing anything that looks reusable
3. Check `Packages/<Name>/I18n/` before adding any user-facing string
4. Run `npm run lint` and `npm run format` after every change

---

## Hard Rules

| Rule | Detail |
|---|---|
| No cross-package imports | Use `Packages/Shared` for anything shared |
| ESM only | `import`/`export` — never `require()` |
| No hardcoded strings | All text from `I18n/` files |
| No `data-*` or `title` attributes | Exposes HTML internals, breaks native feel |
| `Index.js` is the only public entry | Never import `Core/`, `UI/`, `IPC/` from outside |
| Helpers in `Utils.js` | Keep main files clean |
| Auto-discovery only | Never hardcode package names in bootstrap |

---

## File Structure Cheatsheet

```text
Packages/<Name>/
├── Index.js        ← only file other code may import
├── Core/           ← backend logic
├── UI/             ← renderer process (HTML/CSS/JS)
├── IPC/            ← IPC handlers
├── I18n/           ← all user-facing strings
└── Utils.js        ← helpers (only if needed)
```

---

## Path Resolution (Critical for Packaged Builds)

```js
// Files in extraResources (Data, Skills, Personas) live at resourcesPath when packaged
const dataRoot = app.isPackaged ? process.resourcesPath : rootDirectory;
```

---

## Design Rules

- Material 3 Expressive — rounded corners (20px on buttons), clean, premium
- Feels like a macOS native app — no browser chrome, no tooltips, no visible DOM artifacts
- No visible HTML — users should never know it's a web page

---

## Common Patterns

### IPC handler (main process)

```js
ipcMain.handle('package:action', async (_event, payload) => {
  // logic
  return result;
});
```

### IPC call (renderer process)

```js
const result = await window.electron.invoke('package:action', payload);
```

### I18n usage

```js
import { t } from '../I18n/Index.js';
element.textContent = t('key');
```

---

## What Claude Should Never Do Here

- Add `require()` or `module.exports`
- Import from another package's inner files
- Hardcode any user-facing string in JS or HTML
- Add `data-*` attributes or `title` attributes to elements
- Add React, Vue, or any frontend framework
- Hardcode package names in discovery/bootstrap logic
