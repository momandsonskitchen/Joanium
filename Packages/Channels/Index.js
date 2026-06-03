import { createChannelStateManager } from './Core/ChannelState.js';
import { createChannelRuntime } from './Core/ChannelRuntime.js';
import { getResourcePath } from '../Shared/Storage/ResourcePaths.js';

function resolveCredentialValue(incoming, saved) {
  return typeof incoming === 'string' && incoming.trim() ? incoming.trim() : (saved ?? '');
}

function requireCredential(value, label) {
  if (!value) {
    throw new Error(`${label} is required.`);
  }

  return value;
}

export async function createPackage({ rootDirectory }) {
  const channelStateManager = createChannelStateManager({ rootDirectory });
  const channelRuntime = createChannelRuntime({ channelStateManager });
  channelRuntime.start();

  return {
    id: 'Channels',
    ipcHandlers: [
      {
        channel: 'channels:icon-paths',
        handler: async () => {
          return {
            telegram: getResourcePath(rootDirectory, 'Assets', 'Icons', 'Telegram.png'),
            whatsapp: getResourcePath(rootDirectory, 'Assets', 'Icons', 'WhatsApp.png'),
            discord: getResourcePath(rootDirectory, 'Assets', 'Icons', 'Discord.png'),
            slack: getResourcePath(rootDirectory, 'Assets', 'Icons', 'Slack.png'),
            mattermost: getResourcePath(rootDirectory, 'Assets', 'Icons', 'MatterMost.png'),
            zulip: getResourcePath(rootDirectory, 'Assets', 'Icons', 'Zulip.png'),
            ntfy: getResourcePath(rootDirectory, 'Assets', 'Icons', 'Ntfy.png'),
          };
        },
      },
      {
        channel: 'channels:list',
        handler: async () => channelStateManager.getAllChannels(),
      },
      {
        channel: 'channels:get',
        handler: async (_event, name) => channelStateManager.getSafeChannel(name),
      },
      {
        channel: 'channels:save',
        handler: async (_event, name, config) => channelStateManager.saveChannel(name, config),
      },
      {
        channel: 'channels:remove',
        handler: async (_event, name) => channelStateManager.removeChannel(name),
      },
      {
        channel: 'channels:toggle',
        handler: async (_event, name, enabled) => channelStateManager.toggleChannel(name, enabled),
      },
      {
        channel: 'channels:validate',
        handler: async (_event, name, credentials = {}) => {
          const savedConfig = (await channelStateManager.getChannel(name)) ?? {};

          if (name === 'telegram') {
            const botToken = requireCredential(
              resolveCredentialValue(credentials.botToken, savedConfig.botToken),
              'Bot token',
            );
            return channelRuntime.validateTelegram(botToken);
          }

          if (name === 'whatsapp') {
            const accountSid = requireCredential(
              resolveCredentialValue(credentials.accountSid, savedConfig.accountSid),
              'Account SID',
            );
            const authToken = requireCredential(
              resolveCredentialValue(credentials.authToken, savedConfig.authToken),
              'Auth token',
            );
            return channelRuntime.validateWhatsApp(accountSid, authToken);
          }

          if (name === 'discord') {
            const botToken = requireCredential(
              resolveCredentialValue(credentials.botToken, savedConfig.botToken),
              'Bot token',
            );
            const channelId = requireCredential(
              resolveCredentialValue(credentials.channelId, savedConfig.channelId),
              'Channel ID',
            );
            const bot = await channelRuntime.validateDiscord(botToken);
            const channel = await channelRuntime.validateDiscordChannel(botToken, channelId);
            return { ...bot, ...channel };
          }

          if (name === 'slack') {
            const botToken = requireCredential(
              resolveCredentialValue(credentials.botToken, savedConfig.botToken),
              'Bot token',
            );
            const channelId = requireCredential(
              resolveCredentialValue(credentials.channelId, savedConfig.channelId),
              'Channel ID',
            );
            const bot = await channelRuntime.validateSlack(botToken);
            const channel = await channelRuntime.validateSlackChannel(botToken, channelId);
            return { ...bot, ...channel };
          }

          if (name === 'zulip') {
            const siteUrl = requireCredential(
              resolveCredentialValue(credentials.siteUrl, savedConfig.siteUrl),
              'Zulip site URL',
            );
            const email = requireCredential(
              resolveCredentialValue(credentials.email, savedConfig.email),
              'Zulip bot email',
            );
            const apiKey = requireCredential(
              resolveCredentialValue(credentials.apiKey, savedConfig.apiKey),
              'Zulip API key',
            );
            const stream = requireCredential(
              resolveCredentialValue(credentials.stream, savedConfig.stream),
              'Zulip channel',
            );
            const bot = await channelRuntime.validateZulip(siteUrl, email, apiKey);
            const channel = await channelRuntime.validateZulipStream(
              siteUrl,
              email,
              apiKey,
              stream,
            );
            return { ...bot, ...channel };
          }

          if (name === 'mattermost') {
            const siteUrl = requireCredential(
              resolveCredentialValue(credentials.siteUrl, savedConfig.siteUrl),
              'Mattermost site URL',
            );
            const accessToken = requireCredential(
              resolveCredentialValue(credentials.accessToken, savedConfig.accessToken),
              'Mattermost access token',
            );
            const channelId = requireCredential(
              resolveCredentialValue(credentials.channelId, savedConfig.channelId),
              'Channel ID',
            );
            const bot = await channelRuntime.validateMattermost(siteUrl, accessToken);
            const channel = await channelRuntime.validateMattermostChannel(
              siteUrl,
              accessToken,
              channelId,
            );
            return { ...bot, ...channel };
          }

          if (name === 'ntfy') {
            const siteUrl = requireCredential(
              resolveCredentialValue(credentials.siteUrl, savedConfig.siteUrl),
              'ntfy site URL',
            );
            const topic = requireCredential(
              resolveCredentialValue(credentials.topic, savedConfig.topic),
              'ntfy topic',
            );
            return channelRuntime.validateNtfy(siteUrl, topic);
          }

          throw new Error('Unknown channel.');
        },
      },
      {
        channel: 'channels:reply',
        handler: async (_event, id, text) => ({ ok: channelRuntime.resolveReply(id, text) }),
      },
      {
        channel: 'channels:save-message',
        handler: async (_event, message) => channelStateManager.saveMessage(message),
      },
      {
        channel: 'channels:list-messages',
        handler: async () => channelStateManager.listMessages(),
      },
      {
        channel: 'channels:delete-message',
        handler: async (_event, id) => channelStateManager.deleteMessage(id),
      },
      {
        channel: 'channels:clear-messages',
        handler: async () => channelStateManager.clearMessages(),
      },
    ],
  };
}
