# Joanium

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
