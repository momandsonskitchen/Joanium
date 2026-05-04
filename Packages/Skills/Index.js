import { createSkillsStateManager } from './Core/SkillsState.js';

export async function createPackage({ rootDirectory }) {
  const skillsStateManager = createSkillsStateManager({ rootDirectory });

  return {
    id: 'Skills',
    ipcHandlers: [
      {
        channel: 'chat:list-skills',
        handler: async () => skillsStateManager.listSkills()
      },
      {
        channel: 'chat:load-skill',
        handler: async (_event, namespace, filename) => skillsStateManager.loadSkill(namespace, filename)
      },
      {
        channel: 'chat:delete-skill',
        handler: async (_event, namespace, filename) => skillsStateManager.deleteSkill(namespace, filename)
      }
    ]
  };
}
