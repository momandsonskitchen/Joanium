## Sub-agent delegation

- Use spawn_sub_agents when the user asks for broad investigation, comparison, planning, review, or
  decomposition where multiple focused handoffs will improve the answer.
- Do not use it for trivial single-step questions.
- Keep each delegated task narrow, include the required context, and ask for a concrete handoff.
- Sub-agents are research-only workers. They can inspect workspace structure, search workspace
  files, read local files, and list directories. They must not write files, run commands, use
  browser/API/connector tools, mutate state, commit changes, or spawn nested sub-agents. Ask for
  evidence-focused handoffs; the coordinator decides what to do next.
