# Joanium Documentation

This directory contains the developer documentation for the Joanium codebase. These documents are the single source of truth for understanding the architecture, conventions, and internals of the project.

---

## Documentation Index

| Document | Description |
|---|---|
| [Architecture](Architecture.md) | System architecture, folder roles, package structure, path resolution, and design principles |
| [Boot Process](BootProcess.md) | Application bootstrap sequence, package discovery, IPC composition, and window creation |
| [Packages](Packages.md) | Detailed reference for every package — public API, internal structure, and responsibilities |
| [IPC Communication](IPC.md) | Inter-process communication patterns between main and renderer processes |
| [Toolset](Toolset.md) | Tool discovery, built-in tools, connector system, and tool loop execution |
| [Providers](Providers.md) | AI provider management, model catalogs, configuration, and runtime selection |
| [Memory](Memory.md) | Long-term memory system, file storage, auto-updates, and cleanup |
| [Channels](Channels.md) | External messaging gateway — Telegram, WhatsApp, Discord, Slack, Zulip, Mattermost, ntfy |
| [Build System](BuildSystem.md) | Build scripts, versioning, electron-builder config, CI/CD, and packaging strategy |
| [Data Storage](DataStorage.md) | Data folder structure, persistence patterns, and path resolution |
| [Rules](Rules.md) | Architecture rules, code style, and forbidden patterns — never break these |
| [Conventions](Conventions.md) | Code style, commit conventions, and common patterns |
| [Shared Library](SharedLibrary.md) | Packages/Shared internals — utilities, components, runtime, and storage |

## Quick Links

- **Design language**: See [Design.md](../Design.md) in the project root
- **AI agent instructions**: See [AGENTS.md](../AGENTS.md) in the project root
- **Contributing**: See [CONTRIBUTING.md](../CONTRIBUTING.md) in the project root
