# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 2026.x | ✅ |
| < 2026 | ❌ |

Only the latest release receives security fixes. Always update to the latest version.

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Report privately via [GitHub Security Advisories](https://github.com/withinjoel/joanium/security/advisories/new).

Include as much of the following as possible:

- Description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept
- Affected version(s)
- Any suggested mitigation

You can expect an acknowledgement within **48 hours** and a resolution update within **7 days**.

---

## Scope

Areas of particular concern:

- Local data access beyond `Data/` (user chat history, memories, credentials)
- Prompt injection via external channels (Telegram, WhatsApp, Discord, Slack)
- Arbitrary code execution through the terminal tool or MCP server connections
- Credential leakage from `.env` or connector API keys
- Electron `nodeIntegration` or `contextIsolation` misconfigurations

---

## Out of Scope

- Vulnerabilities in third-party AI providers (Anthropic, OpenAI, Gemini, Ollama)
- Issues requiring physical access to the user's machine
- Social engineering attacks
