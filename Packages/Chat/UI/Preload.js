import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('JoaniumChat', {
  bootstrap: () => ipcRenderer.invoke('chat:bootstrap'),
  saveRecentPrompt: (promptEntry) => ipcRenderer.invoke('chat:save-recent-prompt', promptEntry)
});
