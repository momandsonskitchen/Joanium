import { mergeUserStates, readUserState, writeUserState } from '../../Shared/UserData/UserData.js';

export function createUserStateManager({ rootDirectory }) {
  return {
    async getProfile() {
      const state = await readUserState(rootDirectory);
      return state.profile;
    },

    async saveProfile(profile) {
      const current = await readUserState(rootDirectory);
      const next = mergeUserStates(current, { profile });
      await writeUserState(rootDirectory, next);
      return next.profile;
    }
  };
}
