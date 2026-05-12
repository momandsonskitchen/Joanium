import { normalizeSubAgentTasks } from './API.js';

export function createSubAgentToolHandlers() {
  return {
    spawn_sub_agents(params = {}) {
      const tasks = normalizeSubAgentTasks(params.tasks);
      if (!tasks.length) {
        throw new Error('spawn_sub_agents requires at least one valid delegated task.');
      }

      return [
        'Sub-agent delegation is executed by the Chat package so it can reuse the active conversation, selected model, persona, and project context.',
        `Queued tasks: ${tasks.length}`,
        ...tasks.map((task, index) => `${index + 1}. ${task.title}: ${task.goal}`),
      ].join('\n');
    },
  };
}
