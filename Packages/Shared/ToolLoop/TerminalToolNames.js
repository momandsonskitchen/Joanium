/**
 * Shared/ToolLoop/TerminalToolNames.js
 *
 * Single source of truth for every terminal tool name Joanium supports.
 * Imported by both the renderer process (RendererToolLoop) and the main
 * process (ChatState) so the AI's system prompt always reflects exactly
 * what's implemented — no manual sync required.
 *
 * To add a new tool:
 *   1. Add its name here.
 *   2. Implement the IPC handler in the relevant service (Git/Directory/Command).
 *   3. Add the dispatch case in RendererToolLoop.executeTerminalTool().
 *   Done — Terminal.md picks it up automatically on next boot.
 */

export const TERMINAL_TOOL_NAMES = Object.freeze([
  // ── Shell ────────────────────────────────────────────────────────────────
  'run_shell_command',
  'assess_shell_command',
  'start_local_server',
  'read_terminal_output',
  'write_process',
  'kill_process',

  // ── Filesystem ───────────────────────────────────────────────────────────
  'inspect_workspace',
  'search_workspace',
  'read_local_file',
  'write_local_file',
  'apply_file_patch',
  'delete_local_item',
  'list_directory',
  'create_directory',
  'move_local_file',
  'copy_local_file',

  // ── Git (read) ────────────────────────────────────────────────────────────
  'git_status',
  'git_diff',
  'git_branches',
  'git_log',
  'git_tags',
  'git_stash',
  'git_remote',
  'git_show',

  // ── Git (mutate — require allow_risky=true) ───────────────────────────────
  'git_create_branch',
  'git_checkout_branch',
  'git_delete_branch',
  'git_pull',
  'git_commit',
  'git_push',
  'git_push_sync',

  // ── Project ───────────────────────────────────────────────────────────────
  'run_project_checks',

  // ── Live Browser ─────────────────────────────────────────────────────────
  'browser_navigate',
  'browser_get_state',
  'browser_snapshot',
  'browser_get_text',
  'browser_click',
  'browser_type',
  'browser_press_key',
  'browser_scroll',
  'browser_back',
  'browser_forward',
  'browser_refresh',
  'browser_screenshot',
]);

export const SUB_AGENT_TERMINAL_TOOL_NAMES = Object.freeze([
  'inspect_workspace',
  'search_workspace',
  'read_local_file',
  'list_directory',
]);
