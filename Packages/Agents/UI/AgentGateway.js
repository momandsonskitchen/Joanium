import { invokeIpc, onIpc } from '../../Shared/Ipc/RendererIpc.js';
import {
  createAssistantContextCache,
  runAssistantPipeline,
  resetAssistantContextCache,
  TERMINAL_TOOL_NAMES,
} from '../../Shared/AssistantRuntime/AssistantPipeline.js';

const MAX_AGENT_TOOL_CALLS = 10;
const AGENT_TERMINAL_TOOLS = new Set(TERMINAL_TOOL_NAMES);

export function createAgentGateway(strings, { chatStrings = {}, getActivePersona } = {}) {
  let started = false;
  let dispose = null;
  const contextCache = createAssistantContextCache();

  let nextStreamId = 0;
  const pendingStreams = new Map();
  let disposeChunk = null;
  let disposeDone = null;
  let disposeStreamErr = null;

  function handleConnectorsChanged() {
    resetAssistantContextCache(contextCache);
  }

  function setupStreamListeners() {
    disposeChunk = onIpc('agents:stream-chunk', ({ streamId, type, text }) => {
      const stream = pendingStreams.get(streamId);
      if (!stream) return;

      if (type === 'text') stream.text += text;
      if (type === 'thinking') stream.thinking += text;

      const now = Date.now();
      if (stream.onProgress && now - stream.lastProgressAt >= 1000) {
        stream.lastProgressAt = now;
        stream
          .onProgress({ text: stream.text, toolName: null, depth: stream.depth })
          .catch?.(() => {});
      }
    });

    disposeDone = onIpc('agents:stream-done', (payload) => {
      const stream = pendingStreams.get(payload.streamId);
      if (!stream) return;
      pendingStreams.delete(payload.streamId);
      const { streamId: _streamId, ...meta } = payload;
      stream.resolve({ text: stream.text, thinking: stream.thinking, ...meta });
    });

    disposeStreamErr = onIpc('agents:stream-error', ({ streamId, message }) => {
      const stream = pendingStreams.get(streamId);
      if (!stream) return;
      pendingStreams.delete(streamId);
      stream.reject(new Error(message ?? 'Agent stream error.'));
    });
  }

  function teardownStreamListeners() {
    disposeChunk?.();
    disposeChunk = null;
    disposeDone?.();
    disposeDone = null;
    disposeStreamErr?.();
    disposeStreamErr = null;
  }

  function streamChatForAgent(request, { onProgress, depth } = {}) {
    const streamId = `agent-${++nextStreamId}`;
    return new Promise((resolve, reject) => {
      pendingStreams.set(streamId, {
        text: '',
        thinking: '',
        resolve,
        reject,
        onProgress: onProgress ?? null,
        depth: depth ?? 0,
        lastProgressAt: 0,
      });
      invokeIpc('chat:stream-message-agent', { ...request, streamId }).catch(reject);
    });
  }

  function emitAgentRunStatus({ id, agentName, active }) {
    window.dispatchEvent(
      new CustomEvent('joanium:agent-run', {
        detail: {
          id,
          name: agentName,
          active,
        },
      }),
    );
  }

  async function processRun({ id, agentName, prompt, providerId, modelId }) {
    emitAgentRunStatus({ id, agentName, active: true });

    try {
      const activePersona = getActivePersona?.() ?? null;

      const onProgress = (data) => invokeIpc('agents:progress', id, data);

      let result;
      try {
        result = await runAssistantPipeline({
          messages: [{ role: 'user', content: prompt }],
          contextCache,
          personaParts: [activePersona?.content ?? '', strings.gateway?.agentContext ?? ''],
          terminalToolsFallback: chatStrings.terminal?.systemPrompt || '',
          providerId: providerId ?? null,
          modelId: modelId ?? null,
          onProgress,
          maxToolCalls: MAX_AGENT_TOOL_CALLS,
          supportedTerminalTools: AGENT_TERMINAL_TOOLS,
          source: 'agent',
          isNewSession: true,
          toolLimitMessage: 'Agent reached the tool call limit.',
          fallbackText: 'Agent could not complete the requested workflow.',
          completeMessage: (request, options) => streamChatForAgent(request, options),
        });
      } catch (error) {
        result = {
          text: strings.gateway?.errorPrefix
            ? strings.gateway.errorPrefix.replace('{message}', error?.message ?? String(error))
            : `Agent error: ${error?.message ?? String(error)}`,
          thinking: '',
          providerLabel: null,
          modelLabel: null,
          charCountIn: 0,
          charCountOut: 0,
        };
        console.error(`[AgentGateway] Agent "${agentName}" tool loop error:`, error);
      }

      await invokeIpc('agents:tool-reply', id, result).catch((err) => {
        console.error(`[AgentGateway] Failed to deliver tool reply for agent "${agentName}":`, err);
      });
    } finally {
      emitAgentRunStatus({ id, agentName, active: false });
    }
  }

  return {
    start() {
      if (started) return;
      started = true;

      setupStreamListeners();
      window.addEventListener('joanium:connectors-changed', handleConnectorsChanged);

      dispose = onIpc('agents:run-with-tools', (payload) => {
        void processRun(payload);
      });

      invokeIpc('agents:renderer-ready').catch((err) => {
        console.error('[AgentGateway] Failed to signal renderer-ready:', err);
      });
    },

    stop() {
      dispose?.();
      dispose = null;
      started = false;
      teardownStreamListeners();
      window.removeEventListener('joanium:connectors-changed', handleConnectorsChanged);
    },
  };
}
