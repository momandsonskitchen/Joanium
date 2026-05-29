import { truncate } from '../Utils/StringUtils.js';

const TASK_COLLECTION_KEYS = Object.freeze([
  'parameters',
  'arguments',
  'tasks',
  'subtasks',
  'sub_tasks',
  'agents',
  'sub_agents',
  'agent_tasks',
  'delegated_tasks',
  'delegations',
]);

function parseJsonString(value) {
  if (typeof value !== 'string') return value;

  const text = value.trim();
  if (!text) return '';

  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

function hasTaskShape(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  if (typeof value.task === 'string') return true;

  return ['title', 'name', 'goal', 'objective', 'prompt', 'context', 'deliverable'].some(
    (key) => value[key] !== undefined,
  );
}

function unwrapTaskInput(rawTasks) {
  const parsed = parseJsonString(rawTasks);

  if (Array.isArray(parsed) || typeof parsed !== 'object' || parsed === null) {
    return parsed;
  }

  for (const key of TASK_COLLECTION_KEYS) {
    if (parsed[key] !== undefined) {
      return unwrapTaskInput(parsed[key]);
    }
  }

  if (hasTaskShape(parsed)) {
    return [parsed];
  }

  if (parsed.task !== undefined) {
    return unwrapTaskInput(parsed.task);
  }

  return parsed;
}

export function normalizeSubAgentTasks(rawTasks, { maxTasks = 8 } = {}) {
  let parsed = unwrapTaskInput(rawTasks);

  if (typeof parsed === 'string') {
    const text = parsed.trim();
    if (!text) return [];

    parsed = text
      .split('\n')
      .map((line) => line.replace(/^[\-\*\d\.\)\s]+/, '').trim())
      .filter(Boolean);
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
