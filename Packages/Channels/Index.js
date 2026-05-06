import { createChannelStateManager } from './Core/ChannelState.js';
import { createChannelRuntime } from './Core/ChannelRuntime.js';

export async function createPackage({ rootDirectory }) {
  const channelStateManager = createChannelStateManager({ rootDirectory });
  const channelRuntime = createChannelRuntime({ channelStateManager });
  channelRuntime.start();

  return {
    id: 'Channels',
    ipcHandlers: [
      {
        channel: 'channels:list',
        handler: async () => channelStateManager.getAllChannels()
      },
      {
        channel: 'channels:get',
        handler: async (_event, name) => channelStateManager.getSafeChannel(name)
      },
      {
        channel: 'channels:save',
        handler: async (_event, name, config) => channelStateManager.saveChannel(name, config)
      },
      {
        channel: 'channels:remove',
        handler: async (_event, name) => channelStateManager.removeChannel(name)
      },
      {
        channel: 'channels:toggle',
        handler: async (_event, name, enabled) => channelStateManager.toggleChannel(name, enabled)
      },
      {
        channel: 'channels:validate',
        handler: async (_event, name, credentials = {}) => {
          if (name === 'telegram') {
            return channelRuntime.validateTelegram(credentials.botToken);
          }

          if (name === 'whatsapp') {
            return channelRuntime.validateWhatsApp(credentials.accountSid, credentials.authToken);
          }

          if (name === 'discord') {
            return channelRuntime.validateDiscord(credentials.botToken);
          }

          if (name === 'slack') {
            return channelRuntime.validateSlack(credentials.botToken);
          }

          throw new Error('Unknown channel.');
        }
      },
      {
        channel: 'channels:reply',
        handler: async (_event, id, text) => ({ ok: channelRuntime.resolveReply(id, text) })
      },
      {
        channel: 'channels:save-message',
        handler: async (_event, message) => channelStateManager.saveMessage(message)
      },
      {
        channel: 'channels:list-messages',
        handler: async () => channelStateManager.listMessages()
      },
      {
        channel: 'channels:delete-message',
        handler: async (_event, id) => channelStateManager.deleteMessage(id)
      },
      {
        channel: 'channels:clear-messages',
        handler: async () => channelStateManager.clearMessages()
      }
    ]
  };
}
