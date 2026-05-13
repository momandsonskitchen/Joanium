# Joanium

<p align="center">
    <picture>
        <source media="(prefers-color-scheme: light)" srcset="https://github.com/user-attachments/assets/d238934d-b5cc-4a81-b081-eca743ef30ff">
        <img src="https://github.com/user-attachments/assets/d238934d-b5cc-4a81-b081-eca743ef30ff" alt="Joanium" width="200">
    </picture>
</p>

<p align="center">
  <strong>The AI desktop assistant that actually lives on your machine.</strong><br>
  <sub>Multi-model chat · Scheduled automations · Background agents · MCP · Real integrations</sub>
</p>

<p align="center">
  <a href="https://github.com/joanium/joanium/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/joanium/joanium/ci.yml?style=for-the-badge&label=CI&logo=github&logoColor=white" alt="CI"></a>
  <a href="https://github.com/joanium/joanium/releases"><img src="https://img.shields.io/github/v/release/joanium/joanium?include_prereleases&style=for-the-badge&label=release" alt="GitHub release"></a>
  <a href="https://github.com/joanium/joanium/stargazers"><img src="https://img.shields.io/github/stars/joanium/joanium?style=for-the-badge&color=yellow" alt="GitHub Stars"></a>
  <a href="https://github.com/joanium/joanium/issues"><img src="https://img.shields.io/github/issues/joanium/joanium?style=for-the-badge&color=red" alt="Open Issues"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue?style=for-the-badge" alt="Apache 2.0 License"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-555555?style=for-the-badge" alt="Platform">
  <img src="https://img.shields.io/badge/node-%3E%3D24-43853d?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/built%20with-Electron-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron">
</p>

<p align="center">
  <a href="https://joanium.com">🌐 Website</a> ·
  <a href="https://joanium.com/docs">📖 Docs</a> ·
  <a href="https://joanium.com/marketplace">🛍️ Marketplace</a> ·
  <a href="https://www.joanium.com/download">⬇️ Download</a> ·
  <a href="https://github.com/joanium/joanium/discussions">💬 Discussions</a>
</p>

---


> Local-first AI desktop assistant with multi-model chat, agents, automations, MCP, and real integrations.

Joanium is a privacy-first, offline-capable desktop app built with Electron and vanilla JavaScript. It runs on your machine, connects to the AI providers you choose, and keeps your data yours.

---

## Features

- **Multi-model chat** — Anthropic, OpenAI, Gemini, and local models via Ollama
- **Scheduled agents** — run autonomous tasks on a schedule with full tool access
- **Channels** — reply to Telegram, WhatsApp, Discord, and Slack through AI
- **MCP support** — extend AI capabilities via Model Context Protocol servers
- **Skills & Personas** — customise how the AI thinks and responds
- **Built-in tools** — terminal, browser, file operations, Git, calculators, public data, and more
- **Connectors** — GitHub, Gmail, Google Drive, Calendar, and more
- **Memory** — persistent long-term memory across conversations
- **Project workspaces** — context-aware chat scoped to a local codebase or folder
- **Privacy-first** — all user data stays local in the `Data/` folder

---

## Tech Stack

- [Electron](https://www.electronjs.org/) — desktop shell
- Vanilla JavaScript (ESM) — no frameworks, no React
- Node.js ≥ 24
- CSS — Material 3 Expressive design language

---

## Getting Started

### Prerequisites

- [Node.js 24+](https://nodejs.org/) (use [nvm](https://github.com/nvm-sh/nvm): `nvm use`)
- [Git](https://git-scm.com/)

### Installation

```bash
git clone https://github.com/withinjoel/joanium.git
cd joanium/v2
cp .env.example .env   # add your API keys
npm install
npm start
```

---

## Scripts

| Command | Description |
|---|---|
| `npm start` | Run the app in development mode |
| `npm run build` | Build distributable for the current platform |
| `npm run lint` | Check for lint errors |
| `npm run format` | Auto-format all source files |
| `npm run format:check` | Check formatting without writing |

---

## Project Structure

```
v2/
├── App.js               # Electron entry point
├── Packages/            # Feature packages (microservice architecture)
│   ├── Chat/            # Core chat engine
│   ├── Agents/          # Scheduled agents
│   ├── Channels/        # External messaging channels
│   ├── MCP/             # Model Context Protocol
│   ├── Memory/          # Long-term memory
│   ├── Providers/       # AI model providers
│   ├── Toolset/         # Built-in AI tools
│   └── ...
├── Assets/              # Images, audio, video (read-only)
├── Config/              # App configuration (read-only)
├── Data/                # User data (read-write, gitignored)
├── Datasets/            # Static datasets
├── Personas/            # AI persona definitions
├── Prompts/             # System prompt files
├── Scripts/             # Build scripts
├── Skills/              # AI skill definitions
└── electron-builder.json
```

See [Arch.md](Arch.md) for full architecture documentation.

---

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.  
Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Security

To report a vulnerability, see [SECURITY.md](SECURITY.md).

---

## License

Proprietary — © 2026 Joel Jolly. All rights reserved. See [LICENSE.md](LICENSE.md) for full terms.
