const unsplashStrings = {
  connector: {
    id: 'unsplash',
    label: 'Unsplash',
    description: 'Search high-quality free photos by topic through the Unsplash API.',
    credentialLabel: 'Access key',
    credentialPlaceholder: 'Unsplash access key',
    credentialKey: 'apiKey',
    optional: false,
  },
  tools: [
    {
      name: 'unsplash_search_photos',
      description:
        'Search Unsplash for high-quality free photos. Requires the Unsplash connector access key.',
      category: 'unsplash',
      parameters: {
        query: {
          type: 'string',
          required: true,
          description: 'Search query such as sunset mountain, minimal workspace, or urban street.',
        },
        count: {
          type: 'number',
          required: false,
          description: 'Number of photos to return. Defaults to 10, max 30.',
        },
        orientation: {
          type: 'string',
          required: false,
          description: 'landscape, portrait, or squarish.',
        },
      },
    },
  ],
};

export default unsplashStrings;
