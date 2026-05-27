const subAgentStrings = {
  tools: [
    {
      name: 'spawn_sub_agents',
      description:
        'Delegate a medium or high complexity request into multiple focused sub-agents, then return their structured handoffs to the coordinator.',
      category: 'sub_agents',
      parameters: {
        tasks: {
          type: 'string',
          required: true,
          description:
            'JSON array of task objects. Each task should include title and goal, and may include context or deliverable.',
        },
        coordination_goal: {
          type: 'string',
          required: false,
          description: 'Overall objective that explains how the delegated tasks fit together.',
        },
        synthesis_style: {
          type: 'string',
          required: false,
          description: 'Preferred synthesis style: brief, detailed, action_items, or comparison.',
        },
      },
    },
  ],
};

export default subAgentStrings;
