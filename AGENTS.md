# Joanium — AI Agent Instructions

This file gives AI coding assistants (Claude Code, Cursor, Copilot, Gemini CLI, etc.) the context they need to work effectively in this codebase.

---

## What This Project Is

Joanium is a local-first AI desktop assistant built with Electron and vanilla JavaScript (ESM). No React, no frameworks. Node.js ≥ 24. Cross-platform: Windows, macOS, Linux.

---

## Architecture Rules — Never Break These

- **No cross-package imports.** Packages are microservices. `Packages/Chat` must never import from `Packages/Memory`. If something is shared, it lives in `Packages/Shared`.
- **ESM only.** Never use `require()` or `module.exports`. Always use `import`/`export`.
- **No i18n hardcoding.** No user-facing strings in JS or HTML. All text comes from `I18n/` files inside each package. English is the default and fallback.
- **No HTML attributes that expose the DOM.** No `data-*` attributes, no `title` attributes (triggers native browser tooltip — looks wrong in a desktop app).
- **Every package has an `Index.js`.** It is the only public entry point. Nothing outside a package imports its inner files (`Core/`, `UI/`, `IPC/`).
- **Auto-discovery, never hardcoding.** Packages are discovered dynamically. Do not hardcode package names in the bootstrap or registry.
- **Helpers go in `Utils.js`.** If a file has helper functions supporting main logic, they go in `Utils.js` alongside it.

---

## Folder Roles

| Folder | Purpose |
|---|---|
| `Packages/` | All features. Each is an independent package. |
| `Packages/Shared/` | Code used by more than one package. |
| `Assets/` | Images, audio, video. Read-only. Inside asar. |
| `Config/` | App config files. Read-only. Inside asar. |
| `Data/` | User data. Read-write. Outside asar. Gitignored. |
| `Datasets/` | Static datasets. Read-only. Inside asar. |
| `Personas/` | AI persona markdown files. Outside asar. |
| `Prompts/` | System prompt markdown files. Inside asar. |
| `Scripts/` | Build scripts only. |
| `Skills/` | AI skill markdown files. Outside asar. |

---

## Package Internal Structure

Every package follows this layout:

```
Packages/<Name>/
├── Index.js       # Only public entry point
├── Core/          # Backend logic
├── UI/            # Frontend (HTML renderer process)
├── IPC/           # Inter-process communication handlers
├── I18n/          # All user-facing strings
└── Utils.js       # Shared helpers for this package (if needed)
```

---

## Path Resolution

In packaged builds, `extraResources` files (Data, Skills, Personas) are at `process.resourcesPath`, not the app root. Always use:

```js
const dataRoot = app.isPackaged ? process.resourcesPath : rootDirectory;
```

---

## Code Style

- Single quotes, semicolons, 2-space indent, LF line endings
- `arrowParens: always` — always wrap arrow function args in parens
- Max line length: 100 characters
- No dead code, no commented-out blocks
- Run `npm run lint` and `npm run format` before finishing

---

## Commit Convention

```
feat: add Gemini provider
fix: crash on empty chat history
chore: bump electron to 42.0.1
docs: update Arch.md
refactor: simplify package bootstrap
```

---

## What Not To Do

- Do not add React, Vue, or any UI framework
- Do not use CommonJS (`require`/`module.exports`)
- Do not hardcode user-facing strings in JS or HTML
- Do not import across packages — use `Packages/Shared` instead
- Do not add `data-*` or `title` attributes to DOM elements
- Do not skip `Index.js` and import inner package files directly
- Do not hardcode package names — use auto-discovery
