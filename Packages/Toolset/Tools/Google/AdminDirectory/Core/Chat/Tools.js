export const ADMIN_DIRECTORY_TOOLS = [
  {
    name: 'admin_directory_list_users',
    description: 'List Google Workspace directory users for an admin account.',
    category: 'admin_directory',
    parameters: {
      max_results: {
        type: 'number',
        required: false,
        description: 'Maximum users to return (default: 25, max: 500).',
      },
      customer: {
        type: 'string',
        required: false,
        description: 'Customer ID, defaults to my_customer.',
      },
      domain: {
        type: 'string',
        required: false,
        description: 'Optional domain to list instead of customer.',
      },
      query: {
        type: 'string',
        required: false,
        description: 'Optional Directory API user search query.',
      },
    },
  },
  {
    name: 'admin_directory_get_user',
    description: 'Get a Google Workspace directory user by ID or email.',
    category: 'admin_directory',
    parameters: {
      user_key: {
        type: 'string',
        required: true,
        description: 'User primary email, alias, or immutable ID.',
      },
    },
  },
  {
    name: 'admin_directory_list_groups',
    description: 'List Google Workspace groups for a customer, domain, or user.',
    category: 'admin_directory',
    parameters: {
      max_results: {
        type: 'number',
        required: false,
        description: 'Maximum groups to return (default: 25, max: 500).',
      },
      customer: {
        type: 'string',
        required: false,
        description: 'Customer ID, defaults to my_customer.',
      },
      domain: {
        type: 'string',
        required: false,
        description: 'Optional domain to list instead of customer.',
      },
      user_key: {
        type: 'string',
        required: false,
        description: "Optional user email or ID to list that user's groups.",
      },
    },
  },
  {
    name: 'admin_directory_get_group',
    description: 'Get a Google Workspace group by ID or email.',
    category: 'admin_directory',
    parameters: {
      group_key: {
        type: 'string',
        required: true,
        description: 'Group email address, alias, or immutable ID.',
      },
    },
  },
  {
    name: 'admin_directory_list_group_members',
    description: 'List members of a Google Workspace group.',
    category: 'admin_directory',
    parameters: {
      group_key: {
        type: 'string',
        required: true,
        description: 'Group email address, alias, or immutable ID.',
      },
      max_results: {
        type: 'number',
        required: false,
        description: 'Maximum members to return (default: 25, max: 500).',
      },
      roles: {
        type: 'string',
        required: false,
        description: 'Optional comma-separated roles, such as OWNER,MANAGER,MEMBER.',
      },
    },
  },
];
