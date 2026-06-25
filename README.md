# Agnes AI — Copilot Chat Provider

English | [简体中文](README.zh-cn.md)

[![Version](https://img.shields.io/github/v/release/erveepp/agnes-ai-for-copilot?style=for-the-badge&label=Version)](https://github.com/erveepp/agnes-ai-for-copilot/releases)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/erveepp.agnes-ai-for-copilot-chat?style=for-the-badge&label=Installs)](https://marketplace.visualstudio.com/items?itemName=erveepp.agnes-ai-for-copilot-chat)

[Install from VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=erveepp.agnes-ai-for-copilot-chat)

Use Agnes AI directly from the Copilot Chat model picker — no new workflows to learn.

> Love Agnes AI's price-performance but don't want to give up GitHub Copilot's agent mode, tool calling, and polished UI? This extension drops Agnes AI straight into the Copilot Chat model selector with your own API key.

---

## Why this extension?

- **Don't replace Copilot — power it up.** No new sidebar, no new chat UI to learn. Just a new model in the picker you already use.
- **Agent mode, tool calling, instructions, MCP, skills — all of it still works.** Copilot's entire stack, now running on Agnes.
- **BYOK, pay Agnes AI directly.** Your API key, your bill, your rate limits. Stored in the OS keychain, never on disk.

## Features

### Agnes AI in the model picker

Agnes 2.0 Flash shows up alongside GPT-4o, Claude, and friends in Copilot Chat's model selector. 128K context, native image input, and tool calling support.

### Inherits Every Copilot Capability

Because this plugs into Copilot's native provider API, you get the full stack for free:

- **Agent mode** — autonomous multi-step tasks
- **Tool calling** — file edits, terminal, workspace search, Git, tests
- **Instructions & skills** — all your `.instructions.md`, `AGENTS.md`, and skills just work

### Secure by Default

API key lives in VS Code's `SecretStorage` (OS keychain on macOS / Windows / Linux). Never in `settings.json`, never in your Git history.

### Zero Runtime Dependencies

Pure VS Code API + Node.js built-ins. No Python, no Docker, no local proxy server to babysit.

---

## Getting Started

### Prerequisites

- **VS Code 1.116** or later. This extension relies on non-public Copilot Chat APIs.
- **GitHub Copilot subscription** (Free / Pro / Enterprise — the free tier works)
- **Agnes AI API key** from [platform.agnes-ai.com](https://platform.agnes-ai.com)

### Installation

Install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=erveepp.agnes-ai-for-copilot-chat), or download the `.vsix` from [Releases](https://github.com/erveepp/agnes-ai-for-copilot/releases).

### Usage

1. Run **Agnes AI: Set API Key** from the Command Palette (`Ctrl+Shift+P`)
2. Paste your API key (usually starts with `sk-`)
3. Open Copilot Chat, click the model picker, pick **Agnes 2.0 Flash**
4. That's it — chat away

---

## Models

| Model | Best for | Context |
|---|---|---|
| **Agnes 2.0 Flash** | Everyday coding, quick edits, cheap iteration | 128K |

Supports tool calling and image input.

---

## Settings

| Setting | Default | Description |
|---|---|---|
| No additional settings | — | Zero config — just set your API key and go |

API key is set via the `Agnes AI: Set API Key` command and stored in the system keychain.

---

## Development

```bash
pnpm install
pnpm compile
# Press F5 to start debugging
```

Check **Output panel** → **Agnes AI Debug** for request/response logs.

---

## License

[MIT](LICENSE)

