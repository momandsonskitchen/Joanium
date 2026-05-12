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
  prompt: [
    '',
    'Sub-agent delegation:',
    '- Use spawn_sub_agents when the user asks for broad investigation, comparison, planning, review, or decomposition where multiple focused handoffs will improve the answer.',
    '- Do not use it for trivial single-step questions.',
    '- Keep each delegated task narrow, include the required context, and ask for a concrete handoff.',
    '- Sub-agents are read-only reasoning workers over the current conversation, persona, memory, and active project context. They do not mutate files or take final external actions.',
  ],
};

export default subAgentStrings;
