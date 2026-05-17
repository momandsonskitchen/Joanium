import { invokeIpc } from '../Ipc/RendererIpc.js';

const TERMINAL_TOOL_BLOCK_RE = /```joanium-terminal\s*([\s\S]*?)```/i;
const TOOLSET_TOOL_BLOCK_RE = /```joanium-tool\s*([\s\S]*?)```/i;

export const TERMINAL_TOOL_NAMES = Object.freeze([
  'run_shell_command',
  'assess_shell_command',
  'inspect_workspace',
  'search_workspace',
  'read_local_file',
  'write_local_file',
  'apply_file_patch',
  'delete_local_item',
  'list_directory',
  'git_status',
  'git_diff',
  'git_branches',
  'git_create_branch',
  'git_checkout_branch',
  'git_delete_branch',
  'git_pull',
  'git_commit',
  'git_push',
  'git_push_sync',
  'run_project_checks',
  'start_local_server',
  'read_terminal_output',
]);

const DEFAULT_TERMINAL_TOOL_SET = new Set(TERMINAL_TOOL_NAMES);

export function isTerminalToolName(toolName) {
  return DEFAULT_TERMINAL_TOOL_SET.has(String(toolName ?? '').trim());
}

export function stripThinking(text) {
  return String(text ?? '')
    .replace(/<(think|thinking|reasoning|reflection)>[\s\S]*?<\/\1>/gi, '')
    .trim();
}

function normalizeSupportedTools(supportedTools) {
  if (supportedTools instanceof Set) return supportedTools;
  if (Array.isArray(supportedTools)) return new Set(supportedTools);
  return DEFAULT_TERMINAL_TOOL_SET;
}

function parseJsonToolBlock(text, blockRegex) {
  const rawText = String(text ?? '');
  const match = rawText.match(blockRegex);
  if (!match) return null;

  try {
    return {
      payload: JSON.parse(match[1].trim()),
      visibleContent: rawText.replace(match[0], '').trim(),
    };
  } catch {
    return null;
  }
}

function emitFileChangedEvent(result = {}) {
  if (
    typeof window === 'undefined' ||
    typeof CustomEvent === 'undefined' ||
    !result?.ok ||
    !result?.path ||
    result?.kind === 'directory'
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent('jo:file-changed', {
      detail: {
        filePath: result.path,
        before: result.beforeContent ?? '',
        after: result.afterContent ?? '',
      },
    }),
  );
}

export function parseTerminalToolRequest(text, supportedTools = DEFAULT_TERMINAL_TOOL_SET) {
  const parsed = parseJsonToolBlock(text, TERMINAL_TOOL_BLOCK_RE);
  if (!parsed) return null;

  const tool = String(parsed.payload?.tool ?? '').trim();
  return {
    tool,
    payload: parsed.payload,
    unsupported: !normalizeSupportedTools(supportedTools).has(tool),
    visibleContent: parsed.visibleContent,
  };
}

export function parseToolsetToolRequest(text) {
  const parsed = parseJsonToolBlock(text, TOOLSET_TOOL_BLOCK_RE);
  if (!parsed) return null;

  return {
    tool: String(parsed.payload?.tool ?? '').trim(),
    payload: parsed.payload,
    visibleContent: parsed.visibleContent,
  };
}

function normalizeTerminalPayload(payload = {}) {
  const parameters =
    payload?.parameters &&
    typeof payload.parameters === 'object' &&
    !Array.isArray(payload.parameters)
      ? payload.parameters
      : {};
  const args =
    payload?.arguments && typeof payload.arguments === 'object' && !Array.isArray(payload.arguments)
      ? payload.arguments
      : {};
  const normalized = { ...parameters, ...args, ...payload };
  delete normalized.parameters;
  delete normalized.arguments;
  return normalized;
}

export function coerceToolsetTerminalRequest(action, supportedTools = DEFAULT_TERMINAL_TOOL_SET) {
  if (!action || !isTerminalToolName(action.tool)) return null;

  return {
    tool: action.tool,
    payload: normalizeTerminalPayload(action.payload),
    unsupported: !normalizeSupportedTools(supportedTools).has(action.tool),
    visibleContent: action.visibleContent,
  };
}

export function parseToolRequests(text, supportedTools = DEFAULT_TERMINAL_TOOL_SET) {
  const terminalAction = parseTerminalToolRequest(text, supportedTools);
  if (terminalAction) return { terminalAction, toolsetAction: null };

  const toolsetAction = parseToolsetToolRequest(text);
  const coercedTerminalAction = coerceToolsetTerminalRequest(toolsetAction, supportedTools);

  return coercedTerminalAction
    ? { terminalAction: coercedTerminalAction, toolsetAction: null }
    : { terminalAction: null, toolsetAction };
}

export async function resolveDefaultTerminalCwd(requestedPath = '') {
  const explicitPath = String(requestedPath ?? '').trim();
  if (explicitPath) return explicitPath;

  try {
    const result = await invokeIpc('terminal:get-default-cwd');
    return result?.ok ? result.cwd : '';
  } catch {
    return '';
  }
}

export function resolveTerminalTimeout(payload = {}) {
  const seconds = Number(payload.timeout_seconds);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(Math.max(seconds * 1000, 1000), 300000);
  }

  return undefined;
}

export async function executeTerminalTool(
  action,
  { resolveCwd = resolveDefaultTerminalCwd, unsupportedError } = {},
) {
  const payload = action?.payload ?? {};

  if (action?.unsupported) {
    return { ok: false, error: unsupportedError ?? `Unsupported terminal tool: ${action.tool}` };
  }

  if (action.tool === 'run_shell_command') {
    return invokeIpc('terminal:run-command', {
      command: payload.command,
      cwd: await resolveCwd(payload.working_directory ?? payload.cwd),
      timeout: resolveTerminalTimeout(payload),
      allowRisky: payload.allow_risky === true,
    });
  }

  if (action.tool === 'assess_shell_command') {
    return invokeIpc('terminal:assess-command-risk', { command: payload.command });
  }

  if (action.tool === 'inspect_workspace') {
    return invokeIpc('terminal:inspect-workspace', {
      rootPath: await resolveCwd(payload.path ?? payload.working_directory),
    });
  }

  if (action.tool === 'search_workspace') {
    return invokeIpc('terminal:search-workspace', {
      rootPath: await resolveCwd(payload.path ?? payload.working_directory),
      query: payload.query,
      maxResults: payload.max_results,
    });
  }

  if (action.tool === 'read_local_file') {
    return invokeIpc('terminal:read-file', {
      filePath: payload.path,
      cwd: await resolveCwd(payload.working_directory ?? payload.cwd),
      maxLines: payload.max_lines,
    });
  }

  if (action.tool === 'write_local_file') {
    const result = await invokeIpc('terminal:write-file', {
      filePath: payload.path,
      cwd: await resolveCwd(payload.working_directory ?? payload.cwd),
      content: payload.content,
      append: payload.append === true,
      enforceProjectRoot: payload.enforceProjectRoot === true,
      projectRoot: payload.projectRoot,
    });
    emitFileChangedEvent(result);
    return result;
  }

  if (action.tool === 'apply_file_patch') {
    const result = await invokeIpc('terminal:apply-file-patch', {
      filePath: payload.path,
      cwd: await resolveCwd(payload.working_directory ?? payload.cwd),
      search: payload.search,
      replace: payload.replace,
      replaceAll: payload.replace_all === true,
      enforceProjectRoot: payload.enforceProjectRoot === true,
      projectRoot: payload.projectRoot,
    });
    emitFileChangedEvent(result);
    return result;
  }

  if (action.tool === 'delete_local_item') {
    const result = await invokeIpc('terminal:delete-item', {
      itemPath: payload.path,
      cwd: await resolveCwd(payload.working_directory ?? payload.cwd),
      enforceProjectRoot: payload.enforceProjectRoot === true,
      projectRoot: payload.projectRoot,
    });
    emitFileChangedEvent(result);
    return result;
  }

  if (action.tool === 'list_directory') {
    return invokeIpc('terminal:list-directory', {
      dirPath: payload.path || (await resolveCwd(payload.working_directory)),
      cwd: await resolveCwd(payload.working_directory ?? payload.cwd),
    });
  }

  if (action.tool === 'git_status') {
    return invokeIpc('terminal:git-status', {
      workingDir: await resolveCwd(payload.working_directory ?? payload.path),
    });
  }

  if (action.tool === 'git_diff') {
    return invokeIpc('terminal:git-diff', {
      workingDir: await resolveCwd(payload.working_directory ?? payload.path),
      staged: payload.staged === true,
    });
  }

  if (action.tool === 'git_branches') {
    return invokeIpc('terminal:git-branches', {
      workingDir: await resolveCwd(payload.working_directory ?? payload.path),
    });
  }

  if (action.tool === 'git_create_branch') {
    return invokeIpc('terminal:git-create-branch', {
      workingDir: await resolveCwd(payload.working_directory ?? payload.path),
      branch: payload.branch,
      allowRisky: payload.allow_risky === true,
    });
  }

  if (action.tool === 'git_checkout_branch') {
    return invokeIpc('terminal:git-checkout-branch', {
      workingDir: await resolveCwd(payload.working_directory ?? payload.path),
      branch: payload.branch,
      allowRisky: payload.allow_risky === true,
    });
  }

  if (action.tool === 'git_delete_branch') {
    return invokeIpc('terminal:git-delete-branch', {
      workingDir: await resolveCwd(payload.working_directory ?? payload.path),
      branch: payload.branch,
      allowRisky: payload.allow_risky === true,
    });
  }

  if (action.tool === 'git_pull') {
    return invokeIpc('terminal:git-pull', {
      workingDir: await resolveCwd(payload.working_directory ?? payload.path),
      allowRisky: payload.allow_risky === true,
    });
  }

  if (action.tool === 'git_commit') {
    return invokeIpc('terminal:git-commit', {
      workingDir: await resolveCwd(payload.working_directory ?? payload.path),
      message: payload.message,
      allowRisky: payload.allow_risky === true,
    });
  }

  if (action.tool === 'git_push') {
    return invokeIpc('terminal:git-push', {
      workingDir: await resolveCwd(payload.working_directory ?? payload.path),
      allowRisky: payload.allow_risky === true,
    });
  }

  if (action.tool === 'git_push_sync') {
    return invokeIpc('terminal:git-push-sync', {
      workingDir: await resolveCwd(payload.working_directory ?? payload.path),
      allowRisky: payload.allow_risky === true,
    });
  }

  if (action.tool === 'run_project_checks') {
    return invokeIpc('terminal:run-project-checks', {
      workingDir: await resolveCwd(payload.working_directory ?? payload.path),
      includeLint: payload.include_lint !== false,
      includeTest: payload.include_test !== false,
      includeBuild: payload.include_build !== false,
    });
  }

  if (action.tool === 'start_local_server') {
    return invokeIpc('terminal:spawn-command', {
      command: payload.command,
      cwd: await resolveCwd(payload.working_directory ?? payload.cwd),
      allowRisky: payload.allow_risky === true,
    });
  }

  if (action.tool === 'read_terminal_output') {
    return invokeIpc(
      'terminal:read-output',
      payload.process_id ?? payload.processId ?? payload.pid,
    );
  }

  return { ok: false, error: unsupportedError ?? `Unsupported terminal tool: ${action.tool}` };
}

export async function executeToolsetTool(action) {
  const payload = action?.payload ?? {};
  return invokeIpc('toolset:execute-tool', {
    tool: action.tool,
    parameters: payload.parameters ?? {},
  });
}

export function formatTerminalResultForModel(
  action,
  result,
  {
    resultHeader = 'Terminal tool result',
    getToolLabel = (tool) => tool || 'unknown',
    formatExitCode = null,
    errorLabel = 'Error',
  } = {},
) {
  const payload = action?.payload ?? {};
  const lines = [resultHeader, `Tool: ${getToolLabel(action?.tool)}`];

  if (payload.command) lines.push(`Command: ${payload.command}`);
  if (payload.branch) lines.push(`Branch: ${payload.branch}`);
  if (payload.message) lines.push(`Message: ${payload.message}`);
  if (result?.cwd) lines.push(`Working directory: ${result.cwd}`);
  if (result?.path) lines.push(`Path: ${result.path}`);
  if (result?.root) lines.push(`Workspace: ${result.root}`);
  if (result?.processId) lines.push(`Process id: ${result.processId}`);
  if (result?.running !== undefined) lines.push(`Running: ${result.running ? 'yes' : 'no'}`);
  if (Number.isFinite(result?.exitCode)) {
    lines.push(
      typeof formatExitCode === 'function'
        ? formatExitCode(result.exitCode)
        : `Exit code: ${result.exitCode}`,
    );
  }
  if (result?.hint) lines.push(`Hint:\n${result.hint}`);
  if (result?.category) lines.push(`Category: ${result.category}`);
  if (result?.current) lines.push(`Current branch: ${result.current}`);
  if (Array.isArray(result?.branches)) lines.push(`Branches:\n${result.branches.join('\n')}`);
  if (result?.error) lines.push(`${errorLabel}:\n${result.error}`);
  if (result?.stdout) lines.push(`STDOUT:\n${result.stdout}`);
  if (result?.stderr) lines.push(`STDERR:\n${result.stderr}`);
  if (result?.summary) lines.push(`Summary:\n${JSON.stringify(result.summary, null, 2)}`);
  if (Array.isArray(result?.matches)) {
    lines.push(`Matches:\n${JSON.stringify(result.matches, null, 2)}`);
  }
  if (Array.isArray(result?.entries)) {
    lines.push(`Entries:\n${JSON.stringify(result.entries, null, 2)}`);
  }
  if (result?.content) lines.push(`Content:\n${result.content}`);
  if (result?.buffer) lines.push(`Output buffer:\n${result.buffer}`);

  if (lines.length === 2) {
    lines.push(JSON.stringify(result ?? {}, null, 2));
  }

  return lines.join('\n\n');
}

export function formatToolsetResultForModel(action, result) {
  const lines = ['Built-in tool result', `Tool: ${action?.tool || 'unknown'}`];

  if (result?.output) lines.push(`Output:\n${result.output}`);
  if (result?.error) lines.push(`Error:\n${result.error}`);
  if (!result?.output && !result?.error) lines.push(JSON.stringify(result ?? {}, null, 2));
  return lines.join('\n\n');
}

export async function loadMemoryContext(limit = 24000) {
  try {
    return await invokeIpc('memory:get-context', limit);
  } catch {
    return '';
  }
}

export async function loadToolsetPrompt() {
  try {
    const result = await invokeIpc('toolset:list-tools');
    return result?.ok ? (result.systemPrompt ?? '') : '';
  } catch {
    return '';
  }
}

export async function runRendererToolLoop({
  messages,
  persona,
  memoryContext,
  terminalTools,
  toolsetTools,
  providerId = null,
  modelId = null,
  onProgress = null,
  completeMessage,
  source,
  isNewSession = false,
  maxToolCalls = 3,
  supportedTerminalTools = DEFAULT_TERMINAL_TOOL_SET,
  executeTerminal = executeTerminalTool,
  executeToolset = executeToolsetTool,
  formatTerminalResult = (action, result) => formatTerminalResultForModel(action, result),
  formatToolsetResult = formatToolsetResultForModel,
  toolStepMessage = 'Let me check that.',
  toolLimitMessage = 'I could not finish the requested tool workflow.',
  fallbackText = 'I could not finish the requested workflow.',
} = {}) {
  if (typeof completeMessage !== 'function') {
    throw new TypeError('completeMessage is required.');
  }

  let providerLabel = null;
  let modelLabel = null;
  let finalText = '';
  let finalThinking = '';
  let charCountIn = 0;
  let charCountOut = 0;
  let workingMessages = [...(messages ?? [])];

  for (let depth = 0; depth <= maxToolCalls; depth += 1) {
    const request = {
      messages: workingMessages,
      persona,
      memoryContext,
      terminalTools,
      toolsetTools,
      isNewSession: Boolean(isNewSession) && depth === 0,
      source,
    };

    if (providerId) request.providerId = providerId;
    if (modelId) request.modelId = modelId;

    const result = await completeMessage(request, { onProgress, depth });

    providerLabel = result?.providerLabel ?? result?.providerId ?? providerLabel;
    modelLabel = result?.modelLabel ?? result?.modelId ?? modelLabel;
    charCountIn += result?.charCountIn ?? 0;
    charCountOut += result?.charCountOut ?? 0;
    finalText = stripThinking(result?.text ?? '');
    finalThinking = result?.thinking ?? finalThinking;

    const { terminalAction, toolsetAction } = parseToolRequests(finalText, supportedTerminalTools);

    if (typeof onProgress === 'function') {
      const currentTool = (terminalAction || toolsetAction)?.tool ?? null;
      onProgress({ text: finalText, toolName: currentTool, depth }).catch?.(() => {});
    }

    if (!terminalAction && !toolsetAction) {
      return {
        text: finalText,
        thinking: finalThinking,
        providerLabel,
        modelLabel,
        charCountIn,
        charCountOut,
      };
    }

    const action = terminalAction || toolsetAction;
    if (depth >= maxToolCalls) {
      return {
        text: action.visibleContent || finalText || toolLimitMessage,
        thinking: finalThinking,
        providerLabel,
        modelLabel,
        charCountIn,
        charCountOut,
      };
    }

    let toolResult;
    try {
      toolResult = terminalAction ? await executeTerminal(action) : await executeToolset(action);
    } catch (error) {
      toolResult = { ok: false, error: error?.message ?? String(error), tool: action.tool };
    }

    const modelResult = terminalAction
      ? formatTerminalResult(action, toolResult)
      : formatToolsetResult(action, toolResult);

    workingMessages = [
      ...workingMessages,
      { role: 'assistant', content: action.visibleContent || toolStepMessage },
      { role: 'user', content: modelResult },
    ];
  }

  return {
    text: finalText || fallbackText,
    thinking: finalThinking,
    providerLabel,
    modelLabel,
    charCountIn,
    charCountOut,
  };
}
