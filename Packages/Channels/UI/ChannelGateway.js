import { formatText } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc, onIpc } from '../../Shared/Ipc/RendererIpc.js';

const MAX_CHANNEL_TOOL_CALLS = 3;
const TERMINAL_TOOL_BLOCK_RE = /```joanium-terminal\s*([\s\S]*?)```/i;
const TOOLSET_TOOL_BLOCK_RE = /```joanium-tool\s*([\s\S]*?)```/i;
const SUPPORTED_TERMINAL_TOOLS = new Set([
  'run_shell_command',
  'assess_shell_command',
  'inspect_workspace',
  'search_workspace',
  'read_local_file',
  'list_directory',
  'git_status',
  'git_diff',
  'run_project_checks',
  'start_local_server',
  'read_terminal_output',
]);

function stripThinking(text) {
  return String(text ?? '')
    .replace(/<(think|thinking|reasoning|reflection)>[\s\S]*?<\/\1>/gi, '')
    .trim();
}

function toIso(value, fallback = Date.now()) {
  const date = value ? new Date(value) : new Date(fallback);
  return Number.isNaN(date.getTime()) ? new Date(fallback).toISOString() : date.toISOString();
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

function parseTerminalToolRequest(text) {
  const parsed = parseJsonToolBlock(text, TERMINAL_TOOL_BLOCK_RE);
  if (!parsed) return null;

  const tool = String(parsed.payload?.tool ?? '').trim();
  return {
    tool,
    payload: parsed.payload,
    unsupported: !SUPPORTED_TERMINAL_TOOLS.has(tool),
    visibleContent: parsed.visibleContent,
  };
}

function parseToolsetToolRequest(text) {
  const parsed = parseJsonToolBlock(text, TOOLSET_TOOL_BLOCK_RE);
  if (!parsed) return null;

  return {
    tool: String(parsed.payload?.tool ?? '').trim(),
    payload: parsed.payload,
    visibleContent: parsed.visibleContent,
  };
}

async function resolveTerminalCwd(requestedPath = '') {
  const explicitPath = String(requestedPath ?? '').trim();
  if (explicitPath) return explicitPath;

  try {
    const result = await invokeIpc('terminal:get-default-cwd');
    return result?.ok ? result.cwd : '';
  } catch {
    return '';
  }
}

function resolveTerminalTimeout(payload = {}) {
  const seconds = Number(payload.timeout_seconds);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(Math.max(seconds * 1000, 1000), 300000);
  }

  return undefined;
}

async function executeTerminalTool(action) {
  const payload = action?.payload ?? {};

  if (action?.unsupported) {
    return { ok: false, error: `Unsupported terminal tool: ${action.tool || 'unknown'}` };
  }

  if (action.tool === 'run_shell_command') {
    return invokeIpc('terminal:run-command', {
      command: payload.command,
      cwd: await resolveTerminalCwd(payload.working_directory ?? payload.cwd),
      timeout: resolveTerminalTimeout(payload),
      allowRisky: payload.allow_risky === true,
    });
  }

  if (action.tool === 'assess_shell_command') {
    return invokeIpc('terminal:assess-command-risk', { command: payload.command });
  }

  if (action.tool === 'inspect_workspace') {
    return invokeIpc('terminal:inspect-workspace', {
      rootPath: await resolveTerminalCwd(payload.path ?? payload.working_directory),
    });
  }

  if (action.tool === 'search_workspace') {
    return invokeIpc('terminal:search-workspace', {
      rootPath: await resolveTerminalCwd(payload.path ?? payload.working_directory),
      query: payload.query,
      maxResults: payload.max_results,
    });
  }

  if (action.tool === 'read_local_file') {
    return invokeIpc('terminal:read-file', {
      filePath: payload.path,
      maxLines: payload.max_lines,
    });
  }

  if (action.tool === 'list_directory') {
    return invokeIpc('terminal:list-directory', {
      dirPath: payload.path || (await resolveTerminalCwd(payload.working_directory)),
    });
  }

  if (action.tool === 'git_status') {
    return invokeIpc('terminal:git-status', {
      workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path),
    });
  }

  if (action.tool === 'git_diff') {
    return invokeIpc('terminal:git-diff', {
      workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path),
      staged: payload.staged === true,
    });
  }

  if (action.tool === 'run_project_checks') {
    return invokeIpc('terminal:run-project-checks', {
      workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path),
      includeLint: payload.include_lint !== false,
      includeTest: payload.include_test !== false,
      includeBuild: payload.include_build !== false,
    });
  }

  if (action.tool === 'start_local_server') {
    return invokeIpc('terminal:spawn-command', {
      command: payload.command,
      cwd: await resolveTerminalCwd(payload.working_directory ?? payload.cwd),
      allowRisky: payload.allow_risky === true,
    });
  }

  if (action.tool === 'read_terminal_output') {
    return invokeIpc(
      'terminal:read-output',
      payload.process_id ?? payload.processId ?? payload.pid,
    );
  }

  return { ok: false, error: `Unsupported terminal tool: ${action.tool || 'unknown'}` };
}

async function executeToolsetTool(action) {
  const payload = action?.payload ?? {};
  return invokeIpc('toolset:execute-tool', {
    tool: action.tool,
    parameters: payload.parameters ?? {},
  });
}

function formatTerminalResultForModel(action, result) {
  const payload = action?.payload ?? {};
  const lines = ['Terminal tool result', `Tool: ${action.tool || 'unknown'}`];

  if (payload.command) lines.push(`Command: ${payload.command}`);
  if (result?.cwd) lines.push(`Working directory: ${result.cwd}`);
  if (result?.path) lines.push(`Path: ${result.path}`);
  if (result?.root) lines.push(`Workspace: ${result.root}`);
  if (result?.processId) lines.push(`Process id: ${result.processId}`);
  if (result?.running !== undefined) lines.push(`Running: ${result.running ? 'yes' : 'no'}`);
  if (Number.isFinite(result?.exitCode)) lines.push(`Exit code: ${result.exitCode}`);
  if (result?.error) lines.push(`Error:\n${result.error}`);
  if (result?.stdout) lines.push(`STDOUT:\n${result.stdout}`);
  if (result?.stderr) lines.push(`STDERR:\n${result.stderr}`);
  if (result?.summary) lines.push(`Summary:\n${JSON.stringify(result.summary, null, 2)}`);
  if (Array.isArray(result?.matches))
    lines.push(`Matches:\n${JSON.stringify(result.matches, null, 2)}`);
  if (Array.isArray(result?.entries))
    lines.push(`Entries:\n${JSON.stringify(result.entries, null, 2)}`);
  if (result?.content) lines.push(`Content:\n${result.content}`);
  if (result?.buffer) lines.push(`Output buffer:\n${result.buffer}`);

  if (lines.length === 2) {
    lines.push(JSON.stringify(result ?? {}, null, 2));
  }

  return lines.join('\n\n');
}

function formatToolsetResultForModel(action, result) {
  const lines = ['Built-in tool result', `Tool: ${action.tool || 'unknown'}`];

  if (result?.output) lines.push(`Output:\n${result.output}`);
  if (result?.error) lines.push(`Error:\n${result.error}`);
  if (!result?.output && !result?.error) lines.push(JSON.stringify(result ?? {}, null, 2));
  return lines.join('\n\n');
}

async function loadMemoryContext() {
  try {
    return await invokeIpc('memory:get-context', 24000);
  } catch {
    return '';
  }
}

async function loadToolsetPrompt() {
  try {
    const result = await invokeIpc('toolset:list-tools');
    return result?.ok ? (result.systemPrompt ?? '') : '';
  } catch {
    return '';
  }
}

async function runChannelAgent({
  messages,
  persona,
  memoryContext,
  terminalTools,
  toolsetTools,
  isNewSession,
}) {
  let provider = null;
  let model = null;
  let finalText = '';
  let finalThinking = '';
  let workingMessages = [...messages];

  for (let depth = 0; depth <= MAX_CHANNEL_TOOL_CALLS; depth += 1) {
    const result = await invokeIpc('chat:complete-message', {
      messages: workingMessages,
      persona,
      memoryContext,
      terminalTools,
      toolsetTools,
      isNewSession: isNewSession && depth === 0,
      source: 'channel',
    });

    provider = result?.providerLabel ?? result?.providerId ?? provider;
    model = result?.modelLabel ?? result?.modelId ?? model;
    finalText = stripThinking(result?.text ?? '');
    finalThinking = result?.thinking ?? finalThinking;

    const terminalAction = parseTerminalToolRequest(finalText);
    const toolsetAction = terminalAction ? null : parseToolsetToolRequest(finalText);

    if (!terminalAction && !toolsetAction) {
      return { text: finalText, thinking: finalThinking, provider, model };
    }

    const action = terminalAction || toolsetAction;
    if (depth >= MAX_CHANNEL_TOOL_CALLS) {
      return {
        text: action.visibleContent || 'I could not finish the requested tool workflow.',
        thinking: finalThinking,
        provider,
        model,
      };
    }

    const visibleContent = action.visibleContent || 'I am checking that now.';
    let toolResult;

    try {
      toolResult = terminalAction
        ? await executeTerminalTool(action)
        : await executeToolsetTool(action);
    } catch (error) {
      toolResult = { ok: false, error: error?.message ?? String(error), tool: action.tool };
    }

    const modelResult = terminalAction
      ? formatTerminalResultForModel(action, toolResult)
      : formatToolsetResultForModel(action, toolResult);

    workingMessages = [
      ...workingMessages,
      { role: 'assistant', content: visibleContent },
      { role: 'user', content: modelResult },
    ];
  }

  return {
    text: finalText || 'I could not finish the requested tool workflow.',
    thinking: finalThinking,
    provider,
    model,
  };
}

export function createChannelGateway(strings, { chatStrings = {}, getActivePersona } = {}) {
  let started = false;
  let chain = Promise.resolve();
  let dispose = null;
  let toolsetPrompt = null;

  async function saveMessage({
    channelName,
    from,
    incoming,
    reply,
    status,
    error = null,
    metadata = {},
    provider = null,
    model = null,
  }) {
    const repliedAt = new Date().toISOString();
    await invokeIpc('channels:save-message', {
      channel: channelName,
      from: from || 'User',
      incoming: incoming || '',
      reply: reply || '',
      status,
      error,
      provider,
      model,
      receivedAt: toIso(metadata?.receivedAt),
      repliedAt,
      timestamp: repliedAt,
      externalId: metadata?.externalId ?? null,
      targetId: metadata?.targetId ?? null,
      conversationId: metadata?.conversationId ?? null,
    }).catch(() => {});
  }

  async function processIncoming({ id, channelName, from, text, metadata = {} }) {
    const channelLabel = strings.channels[channelName]?.name ?? channelName;
    const activePersona = getActivePersona?.() ?? null;
    const [memoryContext, loadedToolsetPrompt] = await Promise.all([
      loadMemoryContext(),
      toolsetPrompt === null ? loadToolsetPrompt() : Promise.resolve(toolsetPrompt),
    ]);
    toolsetPrompt = loadedToolsetPrompt;

    const promptParts = [
      activePersona?.content ?? '',
      metadata.systemPrompt ?? '',
      formatText(strings.gateway.channelContext, {
        from: from || 'User',
        channel: channelLabel,
      }),
      strings.gateway.agentContext ?? '',
    ].filter((part) => String(part ?? '').trim());

    try {
      const result = await runChannelAgent({
        messages: [{ role: 'user', content: text }],
        persona: promptParts.join('\n\n'),
        memoryContext,
        terminalTools: chatStrings.terminal?.systemPrompt ?? '',
        toolsetTools: toolsetPrompt || '',
        isNewSession: false,
      });

      const reply = stripThinking(result?.text ?? '') || strings.gateway.noProvider;
      await saveMessage({
        channelName,
        from,
        incoming: text,
        reply,
        status: 'success',
        metadata,
        provider: result?.providerLabel ?? result?.providerId ?? null,
        model: result?.modelLabel ?? result?.modelId ?? null,
      });
      await invokeIpc('channels:reply', id, reply);
    } catch (error) {
      const reply =
        error?.name === 'AbortError'
          ? strings.gateway.timeout
          : formatText(strings.gateway.errorPrefix, {
              message: error?.message ?? String(error ?? 'Unknown error'),
            });

      await saveMessage({
        channelName,
        from,
        incoming: text,
        reply,
        status: 'error',
        error: error?.message ?? String(error ?? 'Unknown error'),
        metadata,
      });
      await invokeIpc('channels:reply', id, reply).catch(() => {});
    }
  }

  return {
    start() {
      if (started) return;
      started = true;
      dispose = onIpc('channels:incoming', (payload) => {
        chain = chain.catch(() => {}).then(() => processIncoming(payload));
      });
    },

    stop() {
      dispose?.();
      dispose = null;
      started = false;
    },
  };
}
