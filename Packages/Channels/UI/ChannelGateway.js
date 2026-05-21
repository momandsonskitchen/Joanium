import { formatText } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc, onIpc } from '../../Shared/Ipc/RendererIpc.js';
import {
  loadMemoryContext,
  loadTerminalPrompt,
  loadToolsetPrompt,
  runRendererToolLoop,
  stripThinking,
  TERMINAL_TOOL_NAMES,
} from '../../Shared/ToolLoop/RendererToolLoop.js';

const MAX_CHANNEL_TOOL_CALLS = 10;
const CHANNEL_TERMINAL_TOOLS = new Set(TERMINAL_TOOL_NAMES);

function toIso(value, fallback = Date.now()) {
  const date = value ? new Date(value) : new Date(fallback);
  return Number.isNaN(date.getTime()) ? new Date(fallback).toISOString() : date.toISOString();
}

async function runChannelAgent({
  messages,
  persona,
  memoryContext,
  terminalTools,
  toolsetTools,
  isNewSession,
}) {
  return runRendererToolLoop({
    messages,
    persona,
    memoryContext,
    terminalTools,
    toolsetTools,
    isNewSession,
    maxToolCalls: MAX_CHANNEL_TOOL_CALLS,
    supportedTerminalTools: CHANNEL_TERMINAL_TOOLS,
    source: 'channel',
    toolStepMessage: 'I am checking that now.',
    toolLimitMessage: 'I could not finish the requested tool workflow.',
    fallbackText: 'I could not finish the requested tool workflow.',
    completeMessage: (request) => invokeIpc('chat:complete-message', request),
  });
}

export function createChannelGateway(strings, { chatStrings = {}, getActivePersona } = {}) {
  let started = false;
  let chain = Promise.resolve();
  let dispose = null;
  let terminalPrompt = null;
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
    const [memoryContext, loadedToolsetPrompt, loadedTerminalPrompt] = await Promise.all([
      loadMemoryContext(),
      toolsetPrompt === null ? loadToolsetPrompt() : Promise.resolve(toolsetPrompt),
      terminalPrompt === null ? loadTerminalPrompt() : Promise.resolve(terminalPrompt),
    ]);
    toolsetPrompt = loadedToolsetPrompt;
    terminalPrompt = loadedTerminalPrompt;

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
        terminalTools: terminalPrompt || '',
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
        provider: result?.providerLabel ?? null,
        model: result?.modelLabel ?? null,
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
