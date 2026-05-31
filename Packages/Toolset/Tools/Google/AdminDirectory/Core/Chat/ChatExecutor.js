import * as AdminDirectoryAPI from '../API/AdminDirectoryAPI.js';
import { requireGoogleCredentials } from '../../../Common.js';
import { formatGroup, formatMember, formatUser, requireParam } from './Utils.js';

export async function executeAdminDirectoryChatTool(ctx, toolName, params = {}) {
  const credentials = requireGoogleCredentials(ctx);

  switch (toolName) {
    case 'admin_directory_list_users': {
      const users = await AdminDirectoryAPI.listUsers(credentials, {
        maxResults: params.max_results ?? 25,
        customer: params.customer?.trim() ?? 'my_customer',
        domain: params.domain?.trim() ?? '',
        query: params.query?.trim() ?? '',
      });

      return users.length
        ? `Google Workspace users (${users.length}):\n\n${users
            .map((user, index) => formatUser(user, index + 1))
            .join('\n\n')}`
        : 'No Google Workspace users found.';
    }

    case 'admin_directory_get_user': {
      const user = await AdminDirectoryAPI.getUser(credentials, requireParam(params, 'user_key'));
      return formatUser(user);
    }

    case 'admin_directory_list_groups': {
      const groups = await AdminDirectoryAPI.listGroups(credentials, {
        maxResults: params.max_results ?? 25,
        customer: params.customer?.trim() ?? 'my_customer',
        domain: params.domain?.trim() ?? '',
        userKey: params.user_key?.trim() ?? '',
      });

      return groups.length
        ? `Google Workspace groups (${groups.length}):\n\n${groups
            .map((group, index) => formatGroup(group, index + 1))
            .join('\n\n')}`
        : 'No Google Workspace groups found.';
    }

    case 'admin_directory_get_group': {
      const group = await AdminDirectoryAPI.getGroup(
        credentials,
        requireParam(params, 'group_key'),
      );
      return formatGroup(group);
    }

    case 'admin_directory_list_group_members': {
      const groupKey = requireParam(params, 'group_key');
      const members = await AdminDirectoryAPI.listGroupMembers(credentials, groupKey, {
        maxResults: params.max_results ?? 25,
        roles: params.roles?.trim() ?? '',
      });

      return members.length
        ? `Google Workspace group members (${members.length}):\n\n${members
            .map((member, index) => formatMember(member, index + 1))
            .join('\n\n')}`
        : `No members found for group \`${groupKey}\`.`;
    }

    default:
      throw new Error(`Unknown Admin Directory tool: ${toolName}`);
  }
}
