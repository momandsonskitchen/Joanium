import { dialog } from 'electron';
import { createChatStateManager } from './Core/ChatState.js';
import { createModelHealthChecker } from './Core/ModelHealthCheck.js';
import {
  getSupportedAttachmentExtensions,
  getImageAttachmentExtensions,
  readAttachmentFiles,
} from './Core/ChatAttachments.js';
import { createUsageTracker, estimateTokens } from '../Shared/UsageTracker/UsageTracker.js';

export async function createPackage({ rootDirectory }) {
  const chatStateManager = createChatStateManager({ rootDirectory });
  const healthChecker = createModelHealthChecker({ rootDirectory });
  const usageTracker = createUsageTracker({ rootDirectory });

  function sendIfAlive(event, channel, payload) {
    if (!event.sender.isDestroyed()) {
      event.sender.send(channel, payload);
    }
  }

  function createUsageExchange(meta, isNewSession) {
    const tokensIn = estimateTokens(meta?.charCountIn ?? 0);
    const tokensOut = estimateTokens(meta?.charCountOut ?? 0);
    if (tokensIn + tokensOut <= 0) return null;

    return {
      tokensIn,
      tokensOut,
      modelId: meta?.modelId ?? null,
      modelLabel: meta?.modelLabel ?? null,
      providerLabel: meta?.providerLabel ?? null,
      isNewSession,
    };
  }

  async function recordUsage(meta, isNewSession) {
    const exchange = createUsageExchange(meta, isNewSession);
    if (exchange) {
      await usageTracker.recordExchange(exchange);
    }
  }

  function streamMessage(event, request, channels, decorate = (payload) => payload) {
    const sendError = (error) => {
      sendIfAlive(event, channels.error, decorate({ message: error?.message ?? String(error) }));
    };

    chatStateManager
      .streamMessage(request, {
        onChunk: (chunk) => {
          sendIfAlive(event, channels.chunk, decorate(chunk));
        },
        onDone: (meta) => {
          sendIfAlive(event, channels.done, decorate(meta));
          recordUsage(meta, Boolean(request?.isNewSession)).catch(() => {});
        },
        onError: sendError,
      })
      .catch(sendError);
  }

  return {
    id: 'Chat',
    ipcHandlers: [
      {
        channel: 'chat:bootstrap',
        handler: async () => chatStateManager.getBootstrapPayload(),
      },
      {
        channel: 'chat:stream-message',
        handler: (event, request) => {
          streamMessage(event, request, {
            chunk: 'chat:stream-chunk',
            done: 'chat:stream-done',
            error: 'chat:stream-error',
          });
          return null;
        },
      },

      // ── Agent streaming ──────────────────────────────────────────────────────
      // Like chat:stream-message but routes chunks to agents:stream-* channels
      // so agent token events don’t collide with the chat UI stream.
      // Each call carries a streamId that is echoed in every event so
      // concurrent agent tool-loop rounds can be demuxed in the renderer.
      {
        channel: 'chat:stream-message-agent',
        handler: (event, request) => {
          const { streamId } = request;
          streamMessage(
            event,
            request,
            {
              chunk: 'agents:stream-chunk',
              done: 'agents:stream-done',
              error: 'agents:stream-error',
            },
            (payload) => ({ streamId, ...payload }),
          );
          return null;
        },
      },
      {
        channel: 'chat:complete-message',
        handler: async (_event, request) => {
          const result = await chatStateManager.completeMessage(request);
          await recordUsage(result, Boolean(request?.isNewSession));
          return result;
        },
      },
      {
        channel: 'chat:enhance-prompt',
        handler: async (_event, { raw, providerId, modelId }) => {
          const result = await chatStateManager.enhancePrompt({ raw, providerId, modelId });
          await recordUsage(result, false);
          return result;
        },
      },
      {
        channel: 'chat:select-attachments',
        handler: async (event, options = {}) => {
          const allowImages = Boolean(options?.allowImages);
          const window = event.sender.getOwnerBrowserWindow();
          const docExtensions = getSupportedAttachmentExtensions();
          const imgExtensions = getImageAttachmentExtensions();

          const filters = [];

          if (allowImages) {
            filters.push({
              name: 'All supported files',
              extensions: [...imgExtensions, ...docExtensions],
            });
            filters.push({ name: 'Images', extensions: imgExtensions });
          }

          filters.push({ name: 'Documents, text, and code', extensions: docExtensions });

          const result = await dialog.showOpenDialog(window, {
            properties: ['openFile', 'multiSelections'],
            filters,
          });

          if (result.canceled) {
            return { attachments: [], rejected: [] };
          }

          return readAttachmentFiles(result.filePaths, { allowImages });
        },
      },
      {
        channel: 'chat:process-dropped-files',
        handler: async (_event, options = {}) => {
          const filePaths = Array.isArray(options?.filePaths) ? options.filePaths : [];
          const allowImages = Boolean(options?.allowImages);
          if (filePaths.length === 0) return { attachments: [], rejected: [] };
          return readAttachmentFiles(filePaths, { allowImages });
        },
      },
      // ── Model health ─────────────────────────────────────────────────────────
      {
        channel: 'chat:health-get',
        handler: async () => {
          const { providers } = await chatStateManager.getBootstrapPayload();
          return healthChecker.getHealthMap(providers);
        },
      },
      {
        channel: 'chat:health-probe',
        handler: async (event, providerId, modelId) => {
          const { user, providers } = await chatStateManager.getBootstrapPayload();
          const provider = providers.find((p) => p.id === providerId);
          const model = provider?.models?.find((m) => m.id === modelId);
          if (!provider || !model) return null;

          const providerDetails = user?.providers?.details?.[providerId] ?? {};
          const result = await healthChecker.probeAndCache(provider, model, providerDetails);

          if (!event.sender.isDestroyed()) {
            event.sender.send('chat:health-update', result);
          }

          return result;
        },
      },
    ],
  };
}
