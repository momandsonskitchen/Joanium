import { truncate } from '../Utils/StringUtils.js';

export function normalizeSubAgentTasks(rawTasks, { maxTasks = 8 } = {}) {
  let parsed = rawTasks;

  if (typeof rawTasks === 'string') {
    const text = rawTasks.trim();
    if (!text) return [];

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text
        .split('\n')
        .map((line) => line.replace(/^[\-\*\d\.\)\s]+/, '').trim())
        .filter(Boolean);
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((task, index) => {
      if (typeof task === 'string') {
        const goal = task.trim();
        if (!goal) return null;
        return {
          id: `sub-agent-${index + 1}`,
          title: `Sub-agent ${index + 1}`,
          goal,
          context: '',
          deliverable: '',
        };
      }

      if (!task || typeof task !== 'object') return null;

      const title = String(task.title ?? task.name ?? `Sub-agent ${index + 1}`).trim();
      const goal = String(task.goal ?? task.objective ?? task.task ?? task.prompt ?? '').trim();
      const context = String(task.context ?? task.notes ?? task.background ?? '').trim();
      const deliverable = String(
        task.deliverable ?? task.output ?? task.success_criteria ?? '',
      ).trim();

      if (!goal) return null;

      return {
        id: truncate(String(task.id ?? `sub-agent-${index + 1}`), 80),
        title: truncate(title || `Sub-agent ${index + 1}`, 140),
        goal: truncate(goal, 1600),
        context: truncate(context, 1600),
        deliverable: truncate(deliverable, 1000),
      };
    })
    .filter(Boolean)
    .slice(0, maxTasks);
}
