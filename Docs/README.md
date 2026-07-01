# Joanium Documentation

This directory contains the developer documentation for the Joanium codebase. These documents are the single source of truth for understanding the architecture, conventions, and internals of the project.

---

## Documentation Index

### Core Architecture

| Document | Description |
|---|---|
| [Architecture](Architecture.md) | System architecture, folder roles, package structure, path resolution, and design principles |
| [Boot Process](BootProcess.md) | Application bootstrap sequence, package discovery, IPC composition, and window creation |
| [Packages](Packages.md) | Detailed reference for every package — public API, internal structure, and responsibilities |
| [IPC Communication](IPC.md) | Inter-process communication patterns between main and renderer processes |
| [Shared Library](SharedLibrary.md) | Packages/Shared internals — utilities, components, runtime, and storage |
| [Assistant Pipeline](AssistantPipeline.md) | Shared prompt execution pipeline used by Chat, Channels, and Agents |
| [Data Storage](DataStorage.md) | Data folder structure, persistence patterns, and path resolution |

### Feature Systems

| Document | Description |
|---|---|
| [Toolset](Toolset.md) | Tool discovery, built-in tools, connector system, and tool loop execution |
| [Terminal Tools](TerminalTools.md) | Built-in local tool reference — shell, filesystem, git, browser tools |
| [Providers](Providers.md) | AI provider management, model catalogs, configuration, and runtime selection |
| [Memory](Memory.md) | Long-term memory system, file storage, auto-updates, and cleanup |
| [Channels](Channels.md) | External messaging gateway — Telegram, WhatsApp, Discord, Slack, Zulip, Mattermost, ntfy |
| [MCP](MCP.md) | Model Context Protocol — server connections and tool bridging |
| [LiveBrowser](LiveBrowser.md) | Embedded Chromium browser with AI interaction tools |
| [Security](Security.md) | App lock, password protection, PBKDF2 hashing, and tamper detection |
| [App Settings](AppSettings.md) | Application settings with runtime side effects |

### Chat & AI

| Document | Description |
|---|---|
| [Prompts](Prompts.md) | System prompts, persona modes, and prompt assembly pipeline |
| [Chat UI](ChatUI.md) | Renderer-side chat components — ChatApp, MessageElements, TerminalPanel, etc. |
| [Slash Commands](SlashCommands.md) | Chat slash command system — actions, modes, and navigation |
| [Agents](AgentInternals.md) | Background agent scheduling, execution, and replay system |
| [SubAgents](SubAgents.md) | Sub-agent delegation tool for parallel research tasks |
| [Computer Use](ComputerUse.md) | OS-level screen, mouse, keyboard, clipboard, and window tools |
| [Datasets](Datasets.md) | Static greeting messages and chat suggestions |

### Build & Conventions

| Document | Description |
|---|---|
| [Build System](BuildSystem.md) | Build scripts, versioning, electron-builder config, CI/CD, and packaging strategy |
| [Rules](Rules.md) | Architecture rules, code style, and forbidden patterns — never break these |
| [Conventions](Conventions.md) | Code style, commit conventions, and common patterns |

## Quick Links

- **Design language**: See [Design.md](../Design.md) in the project root
- **AI agent instructions**: See [AGENTS.md](../AGENTS.md) in the project root
- **Contributing**: See [CONTRIBUTING.md](../CONTRIBUTING.md) in the project root
