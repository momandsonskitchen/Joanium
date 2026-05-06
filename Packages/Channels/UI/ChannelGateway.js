import { formatText } from '../../Shared/Utils/DomUtils.js';
import { invokeIpc, onIpc } from '../../Shared/Ipc/RendererIpc.js';

function stripThinking(text) {
  return String(text ?? '')
    .replace(/<(think|thinking|reasoning|reflection)>[\s\S]*?<\/\1>/gi, '')
    .trim();
}

function toIso(value, fallback = Date.now()) {
  const date = value ? new Date(value) : new Date(fallback);
  return Number.isNaN(date.getTime()) ? new Date(fallback).toISOString() : date.toISOString();
}

export function createChannelGateway(strings, { getActivePersona } = {}) {
  let started = false;
  let chain = Promise.resolve();
  let dispose = null;

  async function saveMessage({
    channelName,
    from,
    incoming,
    reply,
    status,
    error = null,
    metadata = {},
    provider = null,
    model = null
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
      conversationId: metadata?.conversationId ?? null
    }).catch(() => {});
  }

  async function processIncoming({ id, channelName, from, text, metadata = {} }) {
    const channelLabel = strings.channels[channelName]?.name ?? channelName;
    const activePersona = getActivePersona?.() ?? null;
    const promptParts = [
      activePersona?.content ?? '',
      metadata.systemPrompt ?? '',
      formatText(strings.gateway.channelContext, {
        from: from || 'User',
        channel: channelLabel
      })
    ].filter((part) => String(part ?? '').trim());

    try {
      const result = await invokeIpc('chat:complete-message', {
        messages: [{ role: 'user', content: text }],
        persona: promptParts.join('\n\n'),
        isNewSession: false,
        source: `channel:${channelName}`
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
        model: result?.modelLabel ?? result?.modelId ?? null
      });
      await invokeIpc('channels:reply', id, reply);
    } catch (error) {
      const reply = error?.name === 'AbortError'
        ? strings.gateway.timeout
        : formatText(strings.gateway.errorPrefix, {
          message: error?.message ?? String(error ?? 'Unknown error')
        });

      await saveMessage({
        channelName,
        from,
        incoming: text,
        reply,
        status: 'error',
        error: error?.message ?? String(error ?? 'Unknown error'),
        metadata
      });
      await invokeIpc('channels:reply', id, reply).catch(() => {});
    }
  }

  return {
    start() {
      if (started) return;
      started = true;
      dispose = onIpc('channels:incoming', (payload) => {
        chain = chain
          .catch(() => {})
          .then(() => processIncoming(payload));
      });
    },

    stop() {
      dispose?.();
      dispose = null;
      started = false;
    }
  };
}
