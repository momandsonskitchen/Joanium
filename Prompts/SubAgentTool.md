Sub-agent delegation:

- Use spawn_sub_agents when the user asks for broad investigation, comparison, planning, review, or decomposition where multiple focused handoffs will improve the answer.
- Do not use it for trivial single-step questions.
- Keep each delegated task narrow, include the required context, and ask for a concrete handoff.
- Sub-agents are full-capability workers. They may read files, write files, run commands, call APIs, mutate state, and commit changes — whatever their task requires. They operate over the current conversation, persona, memory, and active project context.
