import { createChatStateManager } from './Core/ChatState.js';
import { createUsageTracker, estimateTokens } from '../Shared/UsageTracker/UsageTracker.js';

export async function createPackage({ rootDirectory }) {
  const chatStateManager = createChatStateManager({ rootDirectory });
  const usageTracker     = createUsageTracker({ rootDirectory });

  return {
    id: 'Chat',
    ipcHandlers: [
      {
        channel: 'chat:bootstrap',
        handler: async () => chatStateManager.getBootstrapPayload()
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
                const tokensIn  = estimateTokens(meta?.charCountIn  ?? 0);
                const tokensOut = estimateTokens(meta?.charCountOut ?? 0);
                if ((tokensIn + tokensOut) > 0) {
                  usageTracker.recordExchange({
                    tokensIn,
                    tokensOut,
                    modelId:       meta?.modelId       ?? null,
                    modelLabel:    meta?.modelLabel    ?? null,
                    providerLabel: meta?.providerLabel ?? null,
                    isNewSession:  Boolean(request?.isNewSession)
                  }).catch(() => {});
                }
              },
              onError: (error) => {
                if (!event.sender.isDestroyed()) {
                  event.sender.send('chat:stream-error', {
                    message: error?.message ?? String(error)
                  });
                }
              }
            })
            .catch((error) => {
              if (!event.sender.isDestroyed()) {
                event.sender.send('chat:stream-error', {
                  message: error?.message ?? String(error)
                });
              }
            });

          return null;
        }
      }
    ]
  };
}
