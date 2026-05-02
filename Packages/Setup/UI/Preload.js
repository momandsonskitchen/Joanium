import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('JoaniumSetup', {
  bootstrap: () => ipcRenderer.invoke('setup:bootstrap'),
  saveDraft: (draftState) => ipcRenderer.invoke('setup:save-draft', draftState),
  complete: (completedState) => ipcRenderer.invoke('setup:complete', completedState)
});
