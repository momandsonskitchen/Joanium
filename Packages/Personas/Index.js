import { createPersonasStateManager } from './Core/PersonasState.js';

export async function createPackage({ rootDirectory }) {
  const personasStateManager = createPersonasStateManager({ rootDirectory });

  return {
    id: 'Personas',
    ipcHandlers: [
      {
        channel: 'chat:list-personas',
        handler: async () => personasStateManager.listPersonas()
      },
      {
        channel: 'chat:load-persona',
        handler: async (_event, namespace, filename) => personasStateManager.loadPersona(namespace, filename)
      },
      {
        channel: 'chat:delete-persona',
        handler: async (_event, namespace, filename) => personasStateManager.deletePersona(namespace, filename)
      }
    ]
  };
}
