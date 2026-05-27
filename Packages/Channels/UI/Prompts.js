export const CHANNEL_PROMPTS = Object.freeze({
  channelContext:
    'You are replying to {from} through {channel}. Keep the reply concise unless the request ' +
    'needs detail.',
  agentContext:
    'You have the same agentic capabilities as the main chat, including terminal tools, live ' +
    'browser tools, connector tools, memory context, and MCP-backed tools when available. Use ' +
    'tools when they are needed, then answer with the result.',
  toolStepMessage: 'I am checking that now.',
  toolLimitMessage: 'I could not finish the requested tool workflow.',
  fallbackText: 'I could not finish the requested tool workflow.',
});
