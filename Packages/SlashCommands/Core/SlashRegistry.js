import COMMANDS from './Commands.js';

export function createSlashRegistry() {
  // Build a lookup map for O(1) mode instruction access.
  const modeInstructions = new Map(
    COMMANDS
      .filter((command) => command.type === 'mode')
      .map((command) => [command.id, command.instruction ?? ''])
  );

  return {
    /**
     * Returns all built-in slash command definitions.
     * Templates and agents are discovered separately by the Chat package.
     *
     * @returns {Array<object>}
     */
    listCommands() {
      return COMMANDS;
    },

    /**
     * Returns the system-prompt instruction string for a given mode id,
     * or null if the mode is unknown.
     *
     * @param {string} modeId
     * @returns {string|null}
     */
    getModeInstruction(modeId) {
      if (!modeId) return null;
      return modeInstructions.get(modeId) ?? null;
    }
  };
}
