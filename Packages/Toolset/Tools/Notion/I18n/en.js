const notionStrings = {
  connector: {
    id: 'notion',
    label: 'Notion',
    description:
      'Search pages/databases, inspect records, query databases, and create simple pages through the Notion API.',
    credentialLabel: 'Internal integration token',
    credentialPlaceholder: 'secret_...',
    credentialKey: 'token',
    optional: false,
  },
  tools: [
    {
      name: 'notion_search',
      description: 'Search Notion pages and databases available to the integration.',
      category: 'notion',
      parameters: {
        query: { type: 'string', required: false, description: 'Optional search query.' },
        filter: {
          type: 'string',
          required: false,
          description: 'page, database, or all. Defaults to all.',
        },
        limit: {
          type: 'number',
          required: false,
          description: 'Maximum results, default 10, max 25.',
        },
      },
    },
    {
      name: 'notion_get_page',
      description: 'Get Notion page metadata and properties.',
      category: 'notion',
      parameters: {
        page_id: { type: 'string', required: true, description: 'Notion page ID.' },
      },
    },
    {
      name: 'notion_get_database',
      description: 'Get Notion database metadata and properties.',
      category: 'notion',
      parameters: {
        database_id: { type: 'string', required: true, description: 'Notion database ID.' },
      },
    },
    {
      name: 'notion_query_database',
      description: 'Query rows from a Notion database.',
      category: 'notion',
      parameters: {
        database_id: { type: 'string', required: true, description: 'Notion database ID.' },
        filter: {
          type: 'string',
          required: false,
          description: 'Optional Notion filter JSON object.',
        },
        sorts: {
          type: 'string',
          required: false,
          description: 'Optional Notion sorts JSON array.',
        },
        limit: {
          type: 'number',
          required: false,
          description: 'Maximum rows, default 10, max 25.',
        },
      },
    },
    {
      name: 'notion_create_page',
      description: 'Create a simple Notion page under a page or database parent.',
      category: 'notion',
      parameters: {
        parent_id: {
          type: 'string',
          required: true,
          description: 'Parent page ID or database ID.',
        },
        parent_type: {
          type: 'string',
          required: false,
          description: 'page or database. Defaults to page.',
        },
        title: { type: 'string', required: true, description: 'Page title.' },
        content: { type: 'string', required: false, description: 'Optional paragraph content.' },
      },
    },
    {
      name: 'notion_append_block',
      description: 'Append a paragraph block to a Notion page or block.',
      category: 'notion',
      parameters: {
        block_id: { type: 'string', required: true, description: 'Target page or block ID.' },
        text: { type: 'string', required: true, description: 'Paragraph text to append.' },
      },
    },
  ],
};

export default notionStrings;
