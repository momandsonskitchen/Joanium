import { dialog } from 'electron';
import { createChatStateManager } from './Core/ChatState.js';
import { readAttachmentFiles } from './Core/ChatAttachments.js';
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
      },
      {
        channel: 'chat:complete-message',
        handler: async (_event, request) => {
          const result = await chatStateManager.completeMessage(request);
          const tokensIn  = estimateTokens(result?.charCountIn  ?? 0);
          const tokensOut = estimateTokens(result?.charCountOut ?? 0);

          if ((tokensIn + tokensOut) > 0) {
            await usageTracker.recordExchange({
              tokensIn,
              tokensOut,
              modelId:       result?.modelId       ?? null,
              modelLabel:    result?.modelLabel    ?? null,
              providerLabel: result?.providerLabel ?? null,
              isNewSession:  Boolean(request?.isNewSession)
            });
          }

          return result;
        }
      },
      {
        channel: 'chat:select-attachments',
        handler: async (event) => {
          const window = event.sender.getOwnerBrowserWindow();
          const result = await dialog.showOpenDialog(window, {
            properties: ['openFile', 'multiSelections'],
            filters: [
              {
                name: 'Text and code',
                extensions: [
                  'txt',
                  'md',
                  'mdx',
                  'log',
                  'csv',
                  'tsv',
                  'json',
                  'yaml',
                  'yml',
                  'toml',
                  'xml',
                  'html',
                  'css',
                  'scss',
                  'less',
                  'js',
                  'jsx',
                  'ts',
                  'tsx',
                  'mjs',
                  'cjs',
                  'py',
                  'rb',
                  'go',
                  'rs',
                  'java',
                  'cs',
                  'c',
                  'cpp',
                  'h',
                  'hpp',
                  'php',
                  'sql',
                  'sh',
                  'ps1',
                  'bat',
                  'env',
                  'ini',
                  'conf',
                  'graphql',
                  'gql'
                ]
              }
            ]
          });

          if (result.canceled) {
            return { attachments: [], rejected: [] };
          }

          return readAttachmentFiles(result.filePaths);
        }
      }
    ]
  };
}
