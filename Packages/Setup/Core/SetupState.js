import { BrowserWindow, dialog } from 'electron';
import { readProviderCatalog } from '../../Shared/ProviderCatalog/ProviderCatalog.js';
import { getResourceFileUrl } from '../../Shared/Storage/ResourcePaths.js';
import {
  mergeUserStates,
  readUserState,
  sanitizeIncomingUserState,
  writeUserState,
} from '../../Shared/UserData/UserData.js';
import { createEnqueue } from '../../Shared/Utils/AsyncUtils.js';
import { setupImportData } from './ImportService.js';

export function createSetupStateManager({ rootDirectory }) {
  // Serialise all writes through a promise chain so concurrent draft saves
  // and the final complete() call never race on the same .tmp file.
  const enqueue = createEnqueue();

  return {
    async getBootstrapPayload() {
      const [state, providers] = await Promise.all([
        readUserState(rootDirectory),
        readProviderCatalog(rootDirectory),
      ]);

      return {
        state,
        providers,
        logoPath: getResourceFileUrl(rootDirectory, 'Assets', 'Logo', 'Logo.png'),
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
    async importBackup() {
      const ownerWindow = BrowserWindow.getAllWindows()[0] ?? null;
      const { canceled, filePaths } = await dialog.showOpenDialog(ownerWindow, {
        title: 'Import Joanium Backup',
        filters: [{ name: 'Joanium Backup', extensions: ['zip'] }],
        properties: ['openFile'],
      });

      if (canceled || !filePaths?.length) {
        return { ok: false, canceled: true };
      }

      return enqueue(async () => {
        const result = await setupImportData(rootDirectory, filePaths[0]);
        if (!result.ok) return result;

        const state = await readUserState(rootDirectory);
        state.consentAccepted = true;
        state.onboardingCompleted = true;
        state.completedAt = new Date().toISOString();
        await writeUserState(rootDirectory, state);
        return { ok: true };
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
