import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { getWritableDataDirectory } from '../../Shared/Storage/ResourcePaths.js';

const DEFAULT_CHANNELS = Object.freeze({
  telegram: {
    enabled: false,
    botToken: '',
    systemPrompt: '',
    lastUpdateId: 0,
    connectedAt: null
  },
  whatsapp: {
    enabled: false,
    accountSid: '',
    authToken: '',
    fromNumber: '',
    systemPrompt: '',
    connectedAt: null
  },
  discord: {
    enabled: false,
    botToken: '',
    channelId: '',
    systemPrompt: '',
    lastMessageId: null,
    connectedAt: null
  },
  slack: {
    enabled: false,
    botToken: '',
    channelId: '',
    systemPrompt: '',
    lastMessageTs: null,
    connectedAt: null
  }
});

const CHANNEL_NAMES = Object.keys(DEFAULT_CHANNELS);
const MESSAGE_LIMIT = 500;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toIso(value, fallback = new Date().toISOString()) {
  const date = value ? new Date(value) : new Date(fallback);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function createMessageId() {
  return `channel-message-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeChannels(candidate) {
  const source = candidate?.channels && typeof candidate.channels === 'object'
    ? candidate.channels
    : {};
  const channels = {};

  for (const name of CHANNEL_NAMES) {
    const defaults = DEFAULT_CHANNELS[name];
    const existing = source[name] && typeof source[name] === 'object' ? source[name] : {};
    channels[name] = { ...clone(defaults), ...existing };
    channels[name].enabled = Boolean(channels[name].enabled);
    channels[name].connectedAt = channels[name].connectedAt ?? null;
  }

  return { channels };
}

function sanitizeMessage(message = {}) {
  const repliedAt = toIso(message.repliedAt ?? message.timestamp);
  const receivedAt = toIso(message.receivedAt ?? repliedAt, repliedAt);

  return {
    id: message.id ? normalizeString(message.id) : createMessageId(),
    channel: normalizeString(message.channel),
    from: normalizeString(message.from) || 'User',
    incoming: normalizeString(message.incoming),
    reply: normalizeString(message.reply),
    status: message.status === 'error' ? 'error' : 'success',
    error: message.error ? normalizeString(message.error) : null,
    provider: message.provider ? normalizeString(message.provider) : null,
    model: message.model ? normalizeString(message.model) : null,
    receivedAt,
    repliedAt,
    timestamp: repliedAt,
    externalId: message.externalId ? normalizeString(message.externalId) : null,
    targetId: message.targetId ? normalizeString(message.targetId) : null,
    conversationId: message.conversationId ? normalizeString(message.conversationId) : null
  };
}

function safeChannelConfig(name, config) {
  const safe = {
    enabled: Boolean(config?.enabled),
    configured: isConfigured(name, config),
    connectedAt: config?.connectedAt ?? null,
    systemPrompt: normalizeString(config?.systemPrompt)
  };

  if (name === 'telegram') {
    safe.botTokenSet = Boolean(config?.botToken);
  }

  if (name === 'whatsapp') {
    safe.accountSidSet = Boolean(config?.accountSid);
    safe.authTokenSet = Boolean(config?.authToken);
    safe.fromNumber = config?.fromNumber ?? '';
  }

  if (name === 'discord' || name === 'slack') {
    safe.botTokenSet = Boolean(config?.botToken);
    safe.channelId = config?.channelId ?? '';
  }

  return safe;
}

export function isConfigured(name, config) {
  if (name === 'telegram') {
    return Boolean(config?.botToken);
  }

  if (name === 'whatsapp') {
    return Boolean(config?.accountSid && config?.authToken && config?.fromNumber);
  }

  if (name === 'discord' || name === 'slack') {
    return Boolean(config?.botToken && config?.channelId);
  }

  return false;
}

export function createChannelStateManager({ rootDirectory }) {
  const dataDirectory = getWritableDataDirectory(rootDirectory);
  const channelsFilePath = path.join(dataDirectory, 'Channels.json');
  const messagesFilePath = path.join(dataDirectory, 'ChannelMessages.json');

  async function readChannels() {
    try {
      const raw = await readFile(channelsFilePath, 'utf8');
      return normalizeChannels(JSON.parse(raw));
    } catch {
      return normalizeChannels(null);
    }
  }

  async function writeChannels(data) {
    await mkdir(path.dirname(channelsFilePath), { recursive: true });
    await writeFile(channelsFilePath, `${JSON.stringify(normalizeChannels(data), null, 2)}\n`, 'utf8');
  }

  async function readMessages() {
    try {
      const raw = await readFile(messagesFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      const messages = Array.isArray(parsed?.messages) ? parsed.messages : [];
      return { messages: messages.map(sanitizeMessage).slice(0, MESSAGE_LIMIT) };
    } catch {
      return { messages: [] };
    }
  }

  async function writeMessages(data) {
    const messages = Array.isArray(data?.messages) ? data.messages.map(sanitizeMessage) : [];
    await mkdir(path.dirname(messagesFilePath), { recursive: true });
    await writeFile(
      messagesFilePath,
      `${JSON.stringify({ messages: messages.slice(0, MESSAGE_LIMIT) }, null, 2)}\n`,
      'utf8'
    );
  }

  async function updateChannel(name, updater) {
    if (!CHANNEL_NAMES.includes(name)) {
      throw new Error('Unknown channel.');
    }

    const data = await readChannels();
    const current = data.channels[name];
    data.channels[name] = updater({ ...current });
    await writeChannels(data);
    return data.channels[name];
  }

  return {
    async getAllChannels() {
      const data = await readChannels();
      return Object.fromEntries(
        CHANNEL_NAMES.map((name) => [name, safeChannelConfig(name, data.channels[name])])
      );
    },

    async getChannel(name) {
      if (!CHANNEL_NAMES.includes(name)) return null;
      const data = await readChannels();
      return data.channels[name] ?? null;
    },

    async getSafeChannel(name) {
      const channel = await this.getChannel(name);
      return channel ? safeChannelConfig(name, channel) : null;
    },

    async saveChannel(name, config = {}) {
      const saved = await updateChannel(name, (current) => {
        const next = { ...current };

        for (const key of Object.keys(DEFAULT_CHANNELS[name])) {
          if (config[key] !== undefined) {
            if (typeof DEFAULT_CHANNELS[name][key] === 'boolean') {
              next[key] = Boolean(config[key]);
            } else {
              next[key] = typeof config[key] === 'string' ? config[key].trim() : config[key];
            }
          }
        }

        next.enabled = true;
        next.connectedAt = new Date().toISOString();
        return next;
      });

      return safeChannelConfig(name, saved);
    },

    async removeChannel(name) {
      await updateChannel(name, () => ({ ...clone(DEFAULT_CHANNELS[name]), enabled: false }));
      return { ok: true };
    },

    async toggleChannel(name, enabled) {
      const updated = await updateChannel(name, (current) => ({
        ...current,
        enabled: Boolean(enabled)
      }));
      return safeChannelConfig(name, updated);
    },

    async updateRuntimeState(name, patch) {
      await updateChannel(name, (current) => ({ ...current, ...patch }));
    },

    async listMessages() {
      const data = await readMessages();
      return data.messages;
    },

    async saveMessage(message) {
      const data = await readMessages();
      const normalized = sanitizeMessage(message);
      data.messages.unshift(normalized);
      await writeMessages(data);
      return normalized;
    },

    async deleteMessage(id) {
      const safeId = normalizeString(id);
      const data = await readMessages();
      data.messages = data.messages.filter((message) => message.id !== safeId);
      await writeMessages(data);
      return { ok: true };
    },

    async clearMessages() {
      await writeMessages({ messages: [] });
      return { ok: true };
    }
  };
}
