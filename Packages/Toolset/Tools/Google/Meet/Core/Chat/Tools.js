export const MEET_TOOLS = [
  {
    name: 'meet_create_space',
    description: 'Create a Google Meet meeting space and return its join URL.',
    category: 'meet',
    parameters: {
      access_type: {
        type: 'string',
        required: false,
        description: 'Optional Meet access type, such as OPEN or TRUSTED.',
      },
      entry_point_access: {
        type: 'string',
        required: false,
        description: 'Optional entry point access setting.',
      },
    },
  },
  {
    name: 'meet_get_space',
    description: 'Get metadata for a Google Meet meeting space.',
    category: 'meet',
    parameters: {
      space_name: {
        type: 'string',
        required: true,
        description: 'Meet space resource name, such as spaces/abc-mnop-xyz.',
      },
    },
  },
  {
    name: 'meet_list_conference_records',
    description: 'List recent Google Meet conference records visible to the signed-in user.',
    category: 'meet',
    parameters: {
      max_results: {
        type: 'number',
        required: false,
        description: 'Maximum conference records to return (default: 25, max: 100).',
      },
      filter: {
        type: 'string',
        required: false,
        description: 'Optional Meet conferenceRecords.list filter expression.',
      },
    },
  },
  {
    name: 'meet_get_conference_record',
    description: 'Get a Google Meet conference record by resource name.',
    category: 'meet',
    parameters: {
      conference_record_name: {
        type: 'string',
        required: true,
        description: 'Conference record resource name, such as conferenceRecords/abc123.',
      },
    },
  },
  {
    name: 'meet_list_participants',
    description: 'List participants for a Google Meet conference record.',
    category: 'meet',
    parameters: {
      conference_record_name: {
        type: 'string',
        required: true,
        description: 'Conference record resource name, such as conferenceRecords/abc123.',
      },
      max_results: {
        type: 'number',
        required: false,
        description: 'Maximum participants to return (default: 25, max: 100).',
      },
    },
  },
  {
    name: 'meet_list_recordings',
    description: 'List recordings for a Google Meet conference record.',
    category: 'meet',
    parameters: {
      conference_record_name: {
        type: 'string',
        required: true,
        description: 'Conference record resource name, such as conferenceRecords/abc123.',
      },
      max_results: {
        type: 'number',
        required: false,
        description: 'Maximum recordings to return (default: 25, max: 100).',
      },
    },
  },
];
