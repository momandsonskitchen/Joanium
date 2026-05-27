Sub-agent delegation:

- Use spawn_sub_agents when the user asks for broad investigation, comparison, planning, review, or decomposition where multiple focused handoffs will improve the answer.
- Do not use it for trivial single-step questions.
- Keep each delegated task narrow, include the required context, and ask for a concrete handoff.
- Sub-agents are read-only reasoning workers over the current conversation, persona, memory, and active project context. They do not mutate files or take final external actions.
