import { invokeIpc, onIpc } from '../../Shared/Ipc/RendererIpc.js';

// ---------------------------------------------------------------------------
// AgentGateway — renderer-side agentic tool loop for scheduled agents.
//
// When the main process fires an agent it cannot run tools itself (tool
// executors live on the renderer side behind IPC). Instead it sends
// `agents:run-with-tools` to the window, this gateway picks it up, runs the
// same bounded tool loop used by Chat and Channels, then resolves the run by
// calling `agents:tool-reply`.
//
// Pattern mirrors ChannelGateway exactly — only the IPC channels and the
// context-building differ.
// ---------------------------------------------------------------------------

const MAX_AGENT_TOOL_CALLS = 10;

const TERMINAL_TOOL_BLOCK_RE = /```joanium-terminal\s*([\s\S]*?)```/i;
const TOOLSET_TOOL_BLOCK_RE  = /```joanium-tool\s*([\s\S]*?)```/i;

const SUPPORTED_TERMINAL_TOOLS = new Set([
  'run_shell_command',
  'assess_shell_command',
  'inspect_workspace',
  'search_workspace',
  'read_local_file',
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
  'read_terminal_output'
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripThinking(text) {
  return String(text ?? '')
    .replace(/<(think|thinking|reasoning|reflection)>[\s\S]*?<\/\1>/gi, '')
    .trim();
}

function parseJsonToolBlock(text, blockRegex) {
  const rawText = String(text ?? '');
  const match   = rawText.match(blockRegex);
  if (!match) return null;

  try {
    return {
      payload:        JSON.parse(match[1].trim()),
      visibleContent: rawText.replace(match[0], '').trim()
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
    payload:        parsed.payload,
    unsupported:    !SUPPORTED_TERMINAL_TOOLS.has(tool),
    visibleContent: parsed.visibleContent
  };
}

function parseToolsetToolRequest(text) {
  const parsed = parseJsonToolBlock(text, TOOLSET_TOOL_BLOCK_RE);
  if (!parsed) return null;

  return {
    tool:           String(parsed.payload?.tool ?? '').trim(),
    payload:        parsed.payload,
    visibleContent: parsed.visibleContent
  };
}

async function resolveTerminalCwd(requestedPath = '') {
  const explicit = String(requestedPath ?? '').trim();
  if (explicit) return explicit;

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
      command:    payload.command,
      cwd:        await resolveTerminalCwd(payload.working_directory ?? payload.cwd),
      timeout:    resolveTerminalTimeout(payload),
      allowRisky: payload.allow_risky === true
    });
  }

  if (action.tool === 'assess_shell_command') {
    return invokeIpc('terminal:assess-command-risk', { command: payload.command });
  }

  if (action.tool === 'inspect_workspace') {
    return invokeIpc('terminal:inspect-workspace', {
      rootPath: await resolveTerminalCwd(payload.path ?? payload.working_directory)
    });
  }

  if (action.tool === 'search_workspace') {
    return invokeIpc('terminal:search-workspace', {
      rootPath:   await resolveTerminalCwd(payload.path ?? payload.working_directory),
      query:      payload.query,
      maxResults: payload.max_results
    });
  }

  if (action.tool === 'read_local_file') {
    return invokeIpc('terminal:read-file', {
      filePath: payload.path,
      maxLines: payload.max_lines
    });
  }

  if (action.tool === 'list_directory') {
    return invokeIpc('terminal:list-directory', {
      dirPath: payload.path || await resolveTerminalCwd(payload.working_directory)
    });
  }

  if (action.tool === 'git_status') {
    return invokeIpc('terminal:git-status', {
      workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path)
    });
  }

  if (action.tool === 'git_diff') {
    return invokeIpc('terminal:git-diff', {
      workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path),
      staged:     payload.staged === true
    });
  }

  if (action.tool === 'git_branches') {
    return invokeIpc('terminal:git-branches', {
      workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path)
    });
  }

  if (action.tool === 'git_create_branch') {
    return invokeIpc('terminal:git-create-branch', {
      workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path),
      branch:     payload.branch,
      allowRisky: payload.allow_risky === true
    });
  }

  if (action.tool === 'git_checkout_branch') {
    return invokeIpc('terminal:git-checkout-branch', {
      workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path),
      branch:     payload.branch,
      allowRisky: payload.allow_risky === true
    });
  }

  if (action.tool === 'git_delete_branch') {
    return invokeIpc('terminal:git-delete-branch', {
      workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path),
      branch:     payload.branch,
      allowRisky: payload.allow_risky === true
    });
  }

  if (action.tool === 'git_pull') {
    return invokeIpc('terminal:git-pull', {
      workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path),
      allowRisky: payload.allow_risky === true
    });
  }

  if (action.tool === 'git_commit') {
    return invokeIpc('terminal:git-commit', {
      workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path),
      message:    payload.message,
      allowRisky: payload.allow_risky === true
    });
  }

  if (action.tool === 'git_push') {
    return invokeIpc('terminal:git-push', {
      workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path),
      allowRisky: payload.allow_risky === true
    });
  }

  if (action.tool === 'git_push_sync') {
    return invokeIpc('terminal:git-push-sync', {
      workingDir: await resolveTerminalCwd(payload.working_directory ?? payload.path),
      allowRisky: payload.allow_risky === true
    });
  }

  if (action.tool === 'run_project_checks') {
    return invokeIpc('terminal:run-project-checks', {
      workingDir:   await resolveTerminalCwd(payload.working_directory ?? payload.path),
      includeLint:  payload.include_lint  !== false,
      includeTest:  payload.include_test  !== false,
      includeBuild: payload.include_build !== false
    });
  }

  if (action.tool === 'start_local_server') {
    return invokeIpc('terminal:spawn-command', {
      command:    payload.command,
      cwd:        await resolveTerminalCwd(payload.working_directory ?? payload.cwd),
      allowRisky: payload.allow_risky === true
    });
  }

  if (action.tool === 'read_terminal_output') {
    return invokeIpc('terminal:read-output', payload.process_id ?? payload.processId ?? payload.pid);
  }

  return { ok: false, error: `Unsupported terminal tool: ${action.tool || 'unknown'}` };
}

async function executeToolsetTool(action) {
  const payload = action?.payload ?? {};
  return invokeIpc('toolset:execute-tool', {
    tool:       action.tool,
    parameters: payload.parameters ?? {}
  });
}

function formatTerminalResultForModel(action, result) {
  const payload = action?.payload ?? {};
  const lines   = ['Terminal tool result', `Tool: ${action.tool || 'unknown'}`];

  if (payload.command)                        lines.push(`Command: ${payload.command}`);
  if (payload.branch)                         lines.push(`Branch: ${payload.branch}`);
  if (payload.message)                        lines.push(`Message: ${payload.message}`);
  if (result?.cwd)                            lines.push(`Working directory: ${result.cwd}`);
  if (result?.path)                           lines.push(`Path: ${result.path}`);
  if (result?.root)                           lines.push(`Workspace: ${result.root}`);
  if (result?.processId)                      lines.push(`Process id: ${result.processId}`);
  if (result?.running !== undefined)          lines.push(`Running: ${result.running ? 'yes' : 'no'}`);
  if (Number.isFinite(result?.exitCode))      lines.push(`Exit code: ${result.exitCode}`);
  if (result?.hint)                           lines.push(`Hint:\n${result.hint}`);
  if (result?.category)                       lines.push(`Category: ${result.category}`);
  if (result?.current)                        lines.push(`Current branch: ${result.current}`);
  if (Array.isArray(result?.branches))        lines.push(`Branches:\n${result.branches.join('\n')}`);
  if (result?.error)                          lines.push(`Error:\n${result.error}`);
  if (result?.stdout)                         lines.push(`STDOUT:\n${result.stdout}`);
  if (result?.stderr)                         lines.push(`STDERR:\n${result.stderr}`);
  if (result?.summary)                        lines.push(`Summary:\n${JSON.stringify(result.summary, null, 2)}`);
  if (Array.isArray(result?.matches))         lines.push(`Matches:\n${JSON.stringify(result.matches, null, 2)}`);
  if (Array.isArray(result?.entries))         lines.push(`Entries:\n${JSON.stringify(result.entries, null, 2)}`);
  if (result?.content)                        lines.push(`Content:\n${result.content}`);
  if (result?.buffer)                         lines.push(`Output buffer:\n${result.buffer}`);

  if (lines.length === 2) lines.push(JSON.stringify(result ?? {}, null, 2));
  return lines.join('\n\n');
}

function formatToolsetResultForModel(action, result) {
  const lines = ['Built-in tool result', `Tool: ${action.tool || 'unknown'}`];
  if (result?.output)                       lines.push(`Output:\n${result.output}`);
  if (result?.error)                        lines.push(`Error:\n${result.error}`);
  if (!result?.output && !result?.error)    lines.push(JSON.stringify(result ?? {}, null, 2));
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

// ---------------------------------------------------------------------------
// Core tool loop — same bounded agentic loop as ChannelGateway and Chat.
// Accepts an optional providerId/modelId so pinned-model agents work correctly.
// Returns { text, thinking, providerLabel, modelLabel, charCountIn, charCountOut }
// ---------------------------------------------------------------------------

async function runAgentWithTools({
  messages,
  persona,
  memoryContext,
  terminalTools,
  toolsetTools,
  providerId,
  modelId
}) {
  let providerLabel   = null;
  let modelLabel      = null;
  let finalText       = '';
  let finalThinking   = '';
  let charCountIn     = 0;
  let charCountOut    = 0;
  let workingMessages = [...messages];

  for (let depth = 0; depth <= MAX_AGENT_TOOL_CALLS; depth += 1) {
    const request = {
      messages:     workingMessages,
      persona,
      memoryContext,
      terminalTools,
      toolsetTools,
      isNewSession: depth === 0,
      source:       'agent'
    };

    // Only forward model overrides when the agent has a pinned model.
    if (providerId) request.providerId = providerId;
    if (modelId)    request.modelId    = modelId;

    const result = await invokeIpc('chat:complete-message', request);

    providerLabel  = result?.providerLabel ?? result?.providerId ?? providerLabel;
    modelLabel     = result?.modelLabel    ?? result?.modelId    ?? modelLabel;
    charCountIn   += result?.charCountIn   ?? 0;
    charCountOut  += result?.charCountOut  ?? 0;
    finalText      = stripThinking(result?.text ?? '');
    finalThinking  = result?.thinking ?? finalThinking;

    const terminalAction = parseTerminalToolRequest(finalText);
    const toolsetAction  = terminalAction ? null : parseToolsetToolRequest(finalText);

    // No tool call — we have the final answer.
    if (!terminalAction && !toolsetAction) {
      return { text: finalText, thinking: finalThinking, providerLabel, modelLabel, charCountIn, charCountOut };
    }

    // Hit the depth cap — return whatever we have.
    const action = terminalAction || toolsetAction;
    if (depth >= MAX_AGENT_TOOL_CALLS) {
      return {
        text:         action.visibleContent || finalText || 'Agent reached the tool call limit.',
        thinking:     finalThinking,
        providerLabel,
        modelLabel,
        charCountIn,
        charCountOut
      };
    }

    // Execute the tool.
    let toolResult;
    try {
      toolResult = terminalAction
        ? await executeTerminalTool(action)
        : await executeToolsetTool(action);
    } catch (error) {
      toolResult = { ok: false, error: error?.message ?? String(error), tool: action.tool };
    }

    const modelResult    = terminalAction
      ? formatTerminalResultForModel(action, toolResult)
      : formatToolsetResultForModel(action, toolResult);

    const visibleContent = action.visibleContent || '';

    workingMessages = [
      ...workingMessages,
      { role: 'assistant', content: visibleContent || 'Let me check that.' },
      { role: 'user',      content: modelResult }
    ];
  }

  return {
    text:         finalText || 'Agent could not complete the requested workflow.',
    thinking:     finalThinking,
    providerLabel,
    modelLabel,
    charCountIn,
    charCountOut
  };
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

export function createAgentGateway(strings, { chatStrings = {}, getActivePersona } = {}) {
  let started       = false;
  let dispose       = null;
  let toolsetPrompt = null;

  async function processRun({ id, agentName, prompt, providerId, modelId }) {
    const activePersona = getActivePersona?.() ?? null;

    const [memoryContext, loadedToolsetPrompt] = await Promise.all([
      loadMemoryContext(),
      toolsetPrompt === null ? loadToolsetPrompt() : Promise.resolve(toolsetPrompt)
    ]);
    toolsetPrompt = loadedToolsetPrompt;

    // Active persona content first, then agent-context note so the model
    // knows it is running autonomously with full tool access.
    const personaParts = [
      activePersona?.content ?? '',
      strings.gateway?.agentContext ?? ''
    ].filter((part) => String(part ?? '').trim());

    let result;
    try {
      result = await runAgentWithTools({
        messages:      [{ role: 'user', content: prompt }],
        persona:       personaParts.join('\n\n'),
        memoryContext,
        terminalTools: chatStrings.terminal?.systemPrompt ?? '',
        toolsetTools:  toolsetPrompt || '',
        providerId:    providerId ?? null,
        modelId:       modelId    ?? null
      });
    } catch (error) {
      result = {
        text: strings.gateway?.errorPrefix
          ? strings.gateway.errorPrefix.replace('{message}', error?.message ?? String(error))
          : `Agent error: ${error?.message ?? String(error)}`,
        thinking:      '',
        providerLabel: null,
        modelLabel:    null,
        charCountIn:   0,
        charCountOut:  0
      };
      console.error(`[AgentGateway] Agent "${agentName}" tool loop error:`, error);
    }

    // Resolve the pending run on the main process side.
    await invokeIpc('agents:tool-reply', id, result).catch((err) => {
      console.error(`[AgentGateway] Failed to deliver tool reply for agent "${agentName}":`, err);
    });
  }

  return {
    start() {
      if (started) return;
      started = true;

      dispose = onIpc('agents:run-with-tools', (payload) => {
        void processRun(payload);
      });
    },

    stop() {
      dispose?.();
      dispose  = null;
      started  = false;
    }
  };
}
