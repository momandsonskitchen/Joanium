import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { readProviderCatalog } from '../../Shared/ProviderCatalog/ProviderCatalog.js';
import {
  mergeUserStates,
  readUserState,
  sanitizeIncomingUserState,
  writeUserState,
} from '../../Shared/UserData/UserData.js';

export function createSetupStateManager({ rootDirectory }) {
  // Serialise all writes through a promise chain so concurrent draft saves
  // and the final complete() call never race on the same .tmp file.
  let writeQueue = Promise.resolve();

  function enqueue(fn) {
    writeQueue = writeQueue.then(fn, fn);
    return writeQueue;
  }

  return {
    async getBootstrapPayload() {
      const [state, providers] = await Promise.all([
        readUserState(rootDirectory),
        readProviderCatalog(rootDirectory),
      ]);

      return {
        state,
        providers,
        logoPath: pathToFileURL(path.join(rootDirectory, 'Assets', 'Logo', 'Logo.png')).href,
      };
    },
    async getLaunchPackageId() {
      const state = await readUserState(rootDirectory);
      return state.onboardingCompleted ? 'Shell' : 'Setup';
    },
    async saveDraft(draftState) {
      return enqueue(async () => {
        const currentState = await readUserState(rootDirectory);
        const mergedState = mergeUserStates(currentState, sanitizeIncomingUserState(draftState));
        mergedState.onboardingCompleted = false;
        mergedState.completedAt = null;
        return writeUserState(rootDirectory, mergedState);
      });
    },
    async completeOnboarding(completedState) {
      return enqueue(async () => {
        const currentState = await readUserState(rootDirectory);
        const mergedState = mergeUserStates(
          currentState,
          sanitizeIncomingUserState(completedState),
        );
        mergedState.onboardingCompleted = true;
        mergedState.completedAt = new Date().toISOString();
        return writeUserState(rootDirectory, mergedState);
      });
    },
  };
}
