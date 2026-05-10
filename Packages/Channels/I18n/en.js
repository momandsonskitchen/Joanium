const en = {
  title: 'Channels',
  subtitle: 'Let Joanium answer messages from Telegram, WhatsApp, Discord, and Slack.',
  overview: {
    active: 'Active channels',
    configured: 'Configured',
    total: 'Available channels',
    empty: 'No channel is connected yet.'
  },
  history: {
    title: 'Reply history',
    subtitle: 'Recent channel messages and the replies Joanium sent.',
    empty: 'Replies will appear here after a channel receives a message.',
    clear: 'Clear',
    delete: 'Delete',
    success: 'Sent',
    error: 'Error'
  },
  gateway: {
    noProvider: 'No AI provider is configured yet. Open Joanium settings and add a provider first.',
    timeout: 'Sorry, the response took too long. Please try again.',
    errorPrefix: 'Sorry, something went wrong: {message}',
    channelContext: 'You are replying to {from} through {channel}. Keep the reply concise unless the request needs detail.',
    agentContext: 'You have the same agentic capabilities as the main chat, including terminal tools, live browser tools, connector tools, memory context, and MCP-backed tools when available. Use tools when they are needed, then answer with the result.'
  },
  common: {
    expand: 'Expand',
    collapse: 'Collapse',
    connect: 'Connect',
    connecting: 'Connecting...',
    disconnect: 'Disconnect',
    show: 'Show',
    hide: 'Hide',
    pause: 'Pause',
    resume: 'Resume',
    active: 'Active',
    paused: 'Paused',
    connected: 'Connected',
    notConnected: 'Not connected',
    savedSecret: 'Saved',
    required: 'Required',
    optionalPrompt: 'Channel prompt',
    optionalPromptPlaceholder: 'Optional instructions for replies sent through this channel.',
    tokenTooShort: 'Token looks too short. Please check it and try again.',
    sidTooShort: 'Account SID looks too short. Please check it and try again.',
    authTokenTooShort: 'Auth token looks too short. Please check it and try again.',
    channelIdTooShort: 'Channel ID looks too short. Please check it and try again.',
    numberTooShort: 'Phone number looks too short. Please include the country code.',
    validationFailed: 'Validation failed.',
    saveFailed: 'Could not save the channel.',
    disconnectFailed: 'Could not disconnect the channel.',
    toggleFailed: 'Could not update the channel state.'
  },
  feedback: {
    telegramConnected: 'Telegram is connected. Message your bot to test it.',
    whatsappConnected: 'WhatsApp is connected. Send a message to the sandbox number to test it.',
    discordConnected: 'Discord is connected. Send a message in that channel to test it.',
    slackConnected: 'Slack is connected. Send a message in that channel to test it.',
    disconnected: 'Disconnected.',
    enabled: 'Channel enabled.',
    paused: 'Channel paused.',
    tokenVerified: 'Bot verified: {value}',
    accountVerified: 'Account verified: {value}',
    slackVerified: 'Slack verified: {value}'
  },
  fields: {
    botToken: 'Bot token',
    accountSid: 'Account SID',
    authToken: 'Auth token',
    sandboxNumber: 'Sandbox number',
    channelId: 'Channel ID'
  },
  placeholders: {
    telegramToken: '1234567890:ABCdef...',
    whatsappSid: 'ACxxxxxxxxxxxxxxxx',
    whatsappToken: 'Your auth token',
    whatsappNumber: 'whatsapp:+14155238886',
    discordToken: 'Your bot token',
    discordChannel: '123456789012345678',
    slackToken: 'xoxb-your-token',
    slackChannel: 'C0123456789'
  },
  channels: {
    telegram: {
      name: 'Telegram',
      summary: 'Auto-reply through a Telegram bot.',
      setupTitle: 'Setup',
      steps: [
        'Open Telegram and message @BotFather.',
        'Create a bot with /newbot and copy the bot token.',
        'Paste the token here, connect, then message your bot once.'
      ]
    },
    whatsapp: {
      name: 'WhatsApp',
      summary: 'Auto-reply through a Twilio WhatsApp sandbox.',
      setupTitle: 'Setup',
      hint: 'Include the whatsapp: prefix exactly as shown in Twilio.',
      steps: [
        'Create or open a Twilio sandbox.',
        'Copy the Account SID, Auth Token, and sandbox number.',
        'Join the sandbox from your phone, then connect here.'
      ]
    },
    discord: {
      name: 'Discord',
      summary: 'Auto-reply inside a Discord server channel.',
      setupTitle: 'Setup',
      steps: [
        'Create a Discord application and add a bot.',
        'Enable Message Content Intent for the bot.',
        'Invite the bot with read and send permissions, then paste the channel ID.'
      ]
    },
    slack: {
      name: 'Slack',
      summary: 'Auto-reply in a Slack workspace channel.',
      setupTitle: 'Setup',
      steps: [
        'Create a Slack app with a bot user.',
        'Copy the Bot User OAuth Token.',
        'Invite the bot to the channel, then paste the channel ID.'
      ]
    }
  }
};

export default en;
