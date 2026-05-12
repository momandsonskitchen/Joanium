const figmaStrings = {
  connector: {
    id: 'figma',
    label: 'Figma',
    description: 'Files, nodes, comments, versions, and team projects through the Figma API.',
    credentialLabel: 'Personal access token',
    credentialPlaceholder: 'Figma personal access token',
    credentialKey: 'token',
    optional: false,
  },
  tools: [
    {
      name: 'figma_get_file',
      description: 'Get Figma file metadata and a document summary.',
      category: 'figma',
      parameters: {
        file_key: { type: 'string', required: true, description: 'Figma file key.' },
      },
    },
    {
      name: 'figma_get_file_nodes',
      description: 'Get selected Figma file nodes by node IDs.',
      category: 'figma',
      parameters: {
        file_key: { type: 'string', required: true, description: 'Figma file key.' },
        node_ids: { type: 'string', required: true, description: 'Comma-separated node IDs.' },
      },
    },
    {
      name: 'figma_list_comments',
      description: 'List comments in a Figma file.',
      category: 'figma',
      parameters: {
        file_key: { type: 'string', required: true, description: 'Figma file key.' },
      },
    },
    {
      name: 'figma_post_comment',
      description: 'Post a comment to a Figma file.',
      category: 'figma',
      parameters: {
        file_key: { type: 'string', required: true, description: 'Figma file key.' },
        message: { type: 'string', required: true, description: 'Comment message.' },
      },
    },
    {
      name: 'figma_get_versions',
      description: 'List versions for a Figma file.',
      category: 'figma',
      parameters: {
        file_key: { type: 'string', required: true, description: 'Figma file key.' },
      },
    },
  ],
};

export default figmaStrings;
