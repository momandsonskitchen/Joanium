export const CHAT_TOOLS = [
  {
    name: 'chat_list_spaces',
    description: 'List Google Chat spaces and direct messages available to the signed-in user.',
    category: 'chat',
    parameters: {
      max_results: {
        type: 'number',
        required: false,
        description: 'Maximum spaces to return (default: 25, max: 100).',
      },
      filter: {
        type: 'string',
        required: false,
        description: 'Optional Google Chat spaces.list filter expression.',
      },
    },
  },
  {
    name: 'chat_list_messages',
    description: 'List recent messages in a Google Chat space.',
    category: 'chat',
    parameters: {
      space_name: {
        type: 'string',
        required: true,
        description: 'Space resource name, such as spaces/AAAA123.',
      },
      max_results: {
        type: 'number',
        required: false,
        description: 'Maximum messages to return (default: 25, max: 100).',
      },
    },
  },
  {
    name: 'chat_get_message',
    description: 'Get a Google Chat message by resource name.',
    category: 'chat',
    parameters: {
      message_name: {
        type: 'string',
        required: true,
        description: 'Message resource name, such as spaces/AAAA/messages/BBBB.',
      },
    },
  },
  {
    name: 'chat_search_messages',
    description: 'Search recent Google Chat messages in a space by text.',
    category: 'chat',
    parameters: {
      space_name: {
        type: 'string',
        required: true,
        description: 'Space resource name, such as spaces/AAAA123.',
      },
      query: {
        type: 'string',
        required: true,
        description: 'Text to search for in recent message bodies.',
      },
      max_results: {
        type: 'number',
        required: false,
        description: 'Maximum recent messages to scan (default: 100, max: 100).',
      },
    },
  },
  {
    name: 'chat_send_message',
    description: 'Send a plain-text message to a Google Chat space.',
    category: 'chat',
    parameters: {
      space_name: {
        type: 'string',
        required: true,
        description: 'Space resource name, such as spaces/AAAA123.',
      },
      text: { type: 'string', required: true, description: 'Message text to send.' },
      thread_name: {
        type: 'string',
        required: false,
        description: 'Optional thread resource name to reply in.',
      },
    },
  },
];
