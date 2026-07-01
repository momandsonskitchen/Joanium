# Terminal Tools

Built-in local tools that run on the user's machine. Defined in `Shared/ToolLoop/TerminalToolNames.js`.

---

## Overview

Terminal tools are local operations that execute on the user's machine via IPC. They are distinct from connector tools (which call external APIs). The AI invokes them via `joanium-terminal` code blocks.

---

## Tool Names

`TerminalToolNames.js` is the single source of truth for all terminal tool names. Both the renderer process (RendererToolLoop) and main process (ChatState) import from this file.

### Shell Tools

| Tool | Description |
|---|---|
| `run_shell_command` | Execute a shell command |
| `assess_shell_command` | Assess a shell command before execution |
| `start_local_server` | Start a local development server |
| `read_terminal_output` | Read output from a running process |
| `write_process` | Write input to a running process |
| `kill_process` | Kill a running process |

### Filesystem Tools

| Tool | Description |
|---|---|
| `inspect_workspace` | Inspect workspace structure |
| `search_workspace` | Search files by content or pattern |
| `read_local_file` | Read a file's contents |
| `write_local_file` | Write content to a file |
| `apply_file_patch` | Apply a patch to a file |
| `delete_local_item` | Delete a file or directory |
| `list_directory` | List directory contents |
| `create_directory` | Create a new directory |
| `move_local_file` | Move/rename a file |
| `copy_local_file` | Copy a file |

### Git Tools (Read-only)

| Tool | Description |
|---|---|
| `git_status` | Show working tree status |
| `git_diff` | Show file changes |
| `git_branches` | List branches |
| `git_log` | Show commit history |
| `git_tags` | List tags |
| `git_stash` | List stashes |
| `git_remote` | List remotes |
| `git_show` | Show commit details |

### Git Tools (Mutate — require `allow_risky=true`)

| Tool | Description |
|---|---|
| `git_create_branch` | Create a new branch |
| `git_checkout_branch` | Switch to a branch |
| `git_delete_branch` | Delete a branch |
| `git_pull` | Pull from remote |
| `git_commit` | Create a commit |
| `git_push` | Push to remote |
| `git_push_sync` | Push and wait for sync |

### Project Tools

| Tool | Description |
|---|---|
| `run_project_checks` | Run project lint/test checks |

### Live Browser Tools

| Tool | Description |
|---|---|
| `browser_navigate` | Navigate to a URL |
| `browser_get_state` | Get browser state |
| `browser_snapshot` | Take a DOM snapshot |
| `browser_get_text` | Get page text content |
| `browser_click` | Click an element |
| `browser_type` | Type text into an element |
| `browser_press_key` | Press a keyboard key |
| `browser_scroll` | Scroll the page |
| `browser_back` | Navigate back |
| `browser_forward` | Navigate forward |
| `browser_refresh` | Refresh the page |
| `browser_screenshot` | Take a screenshot |

---

## Sub-Agent Terminal Tools

Sub-agents have a restricted subset:

```js
SUB_AGENT_TERMINAL_TOOL_NAMES = [
  'inspect_workspace',
  'search_workspace',
  'read_local_file',
  'list_directory',
];
```

Sub-agents are read-only — they cannot modify files or execute commands.

---

## Tool Execution Flow

```text
AI response contains ```joanium-terminal``` block
    ↓
RendererToolLoop.parseTerminalToolRequest()
    ↓
Validates tool name against supported set
    ↓
toolset:execute-tool IPC call
    ↓
ToolsetService routes to handler
    ↓
Handler executes (shell, filesystem, git, browser)
    ↓
Result returned to renderer
    ↓
Result injected into AI context
    ↓
AI continues with tool result
```

---

## Adding a New Terminal Tool

1. Add the tool name to `TERMINAL_TOOL_NAMES` in `TerminalToolNames.js`
2. Implement the IPC handler in the relevant service (Git, Directory, Command)
3. Add the dispatch case in `RendererToolLoop.executeTerminalTool()`
4. The tool name is automatically picked up by `Terminal.md` on next boot

---

## Tool Format

AI invokes terminal tools via fenced code blocks:

````markdown
```joanium-terminal
{"tool":"read_local_file","parameters":{"path":"src/index.js"}}
```
````

---

## Risky Git Operations

Git mutation tools (`git_commit`, `git_push`, `git_create_branch`, etc.) require the AI to set `allow_risky: true` in the tool parameters. This is a safety mechanism to prevent accidental destructive operations.
