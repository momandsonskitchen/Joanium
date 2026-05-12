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
          chatStateManager
            .streamMessage(request, {
              onChunk: (chunk) => {
                if (!event.sender.isDestroyed()) {
                  event.sender.send('chat:stream-chunk', chunk);
                }
              },
              onDone: (meta) => {
                if (!event.sender.isDestroyed()) {
                  event.sender.send('chat:stream-done', meta);
                }

                // Record usage — fire-and-forget, non-blocking.
                const tokensIn = estimateTokens(meta?.charCountIn ?? 0);
                const tokensOut = estimateTokens(meta?.charCountOut ?? 0);
                if (tokensIn + tokensOut > 0) {
                  usageTracker
                    .recordExchange({
                      tokensIn,
                      tokensOut,
                      modelId: meta?.modelId ?? null,
                      modelLabel: meta?.modelLabel ?? null,
                      providerLabel: meta?.providerLabel ?? null,
                      isNewSession: Boolean(request?.isNewSession),
                    })
                    .catch(() => {});
                }
              },
              onError: (error) => {
                if (!event.sender.isDestroyed()) {
                  event.sender.send('chat:stream-error', {
                    message: error?.message ?? String(error),
                  });
                }
              },
            })
            .catch((error) => {
              if (!event.sender.isDestroyed()) {
                event.sender.send('chat:stream-error', {
                  message: error?.message ?? String(error),
                });
              }
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

          chatStateManager
            .streamMessage(request, {
              onChunk: (chunk) => {
                if (!event.sender.isDestroyed()) {
                  event.sender.send('agents:stream-chunk', { streamId, ...chunk });
                }
              },
              onDone: (meta) => {
                if (!event.sender.isDestroyed()) {
                  event.sender.send('agents:stream-done', { streamId, ...meta });
                }

                const tokensIn = estimateTokens(meta?.charCountIn ?? 0);
                const tokensOut = estimateTokens(meta?.charCountOut ?? 0);
                if (tokensIn + tokensOut > 0) {
                  usageTracker
                    .recordExchange({
                      tokensIn,
                      tokensOut,
                      modelId: meta?.modelId ?? null,
                      modelLabel: meta?.modelLabel ?? null,
                      providerLabel: meta?.providerLabel ?? null,
                      isNewSession: Boolean(request?.isNewSession),
                    })
                    .catch(() => {});
                }
              },
              onError: (error) => {
                if (!event.sender.isDestroyed()) {
                  event.sender.send('agents:stream-error', {
                    streamId,
                    message: error?.message ?? String(error),
                  });
                }
              },
            })
            .catch((error) => {
              if (!event.sender.isDestroyed()) {
                event.sender.send('agents:stream-error', {
                  streamId,
                  message: error?.message ?? String(error),
                });
              }
            });

          return null;
        },
      },
      {
        channel: 'chat:complete-message',
        handler: async (_event, request) => {
          const result = await chatStateManager.completeMessage(request);
          const tokensIn = estimateTokens(result?.charCountIn ?? 0);
          const tokensOut = estimateTokens(result?.charCountOut ?? 0);

          if (tokensIn + tokensOut > 0) {
            await usageTracker.recordExchange({
              tokensIn,
              tokensOut,
              modelId: result?.modelId ?? null,
              modelLabel: result?.modelLabel ?? null,
              providerLabel: result?.providerLabel ?? null,
              isNewSession: Boolean(request?.isNewSession),
            });
          }

          return result;
        },
      },
      {
        channel: 'chat:enhance-prompt',
        handler: async (_event, { raw, providerId, modelId }) => {
          const result = await chatStateManager.enhancePrompt({ raw, providerId, modelId });
          const tokensIn = estimateTokens(result?.charCountIn ?? 0);
          const tokensOut = estimateTokens(result?.charCountOut ?? 0);

          if (tokensIn + tokensOut > 0) {
            await usageTracker.recordExchange({
              tokensIn,
              tokensOut,
              modelId: result?.modelId ?? null,
              modelLabel: result?.modelLabel ?? null,
              providerLabel: result?.providerLabel ?? null,
              isNewSession: false,
            });
          }

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
