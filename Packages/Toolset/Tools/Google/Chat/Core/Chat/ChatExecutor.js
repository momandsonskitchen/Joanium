import * as ChatAPI from '../API/ChatAPI.js';
import { requireGoogleCredentials } from '../../../Common.js';
import { formatMessage, formatSpace, requireParam } from './Utils.js';

export async function executeGoogleChatTool(ctx, toolName, params = {}) {
  const credentials = requireGoogleCredentials(ctx);

  switch (toolName) {
    case 'chat_list_spaces': {
      const spaces = await ChatAPI.listSpaces(credentials, {
        pageSize: params.max_results ?? 25,
        filter: params.filter?.trim() ?? '',
      });

      return spaces.length
        ? `Google Chat spaces (${spaces.length}):\n\n${spaces
            .map((space, index) => formatSpace(space, index + 1))
            .join('\n\n')}`
        : 'No Google Chat spaces found.';
    }

    case 'chat_list_messages': {
      const spaceName = requireParam(params, 'space_name');
      const messages = await ChatAPI.listMessages(credentials, spaceName, {
        pageSize: params.max_results ?? 25,
      });

      return messages.length
        ? `Google Chat messages (${messages.length}):\n\n${messages
            .map((message, index) => formatMessage(message, index + 1))
            .join('\n\n')}`
        : `No Google Chat messages found in \`${spaceName}\`.`;
    }

    case 'chat_get_message': {
      const message = await ChatAPI.getMessage(credentials, requireParam(params, 'message_name'));
      return formatMessage(message);
    }

    case 'chat_search_messages': {
      const spaceName = requireParam(params, 'space_name');
      const query = requireParam(params, 'query');
      const needle = query.toLowerCase();
      const messages = await ChatAPI.listMessages(credentials, spaceName, {
        pageSize: params.max_results ?? 100,
      });
      const matches = messages.filter((message) =>
        (message.text ?? message.argumentText ?? '').toLowerCase().includes(needle),
      );

      return matches.length
        ? `Google Chat matches for "${query}" (${matches.length}):\n\n${matches
            .map((message, index) => formatMessage(message, index + 1))
            .join('\n\n')}`
        : `No recent Google Chat messages matched "${query}".`;
    }

    case 'chat_send_message': {
      const spaceName = requireParam(params, 'space_name');
      const text = requireParam(params, 'text');
      const message = await ChatAPI.sendMessage(credentials, spaceName, text, {
        threadName: params.thread_name?.trim() ?? '',
      });

      return [
        'Google Chat message sent.',
        message.name ? `ID: \`${message.name}\`` : '',
        message.thread?.name ? `Thread: \`${message.thread.name}\`` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }

    default:
      throw new Error(`Unknown Google Chat tool: ${toolName}`);
  }
}
