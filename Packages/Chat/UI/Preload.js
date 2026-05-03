import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('JoaniumChat', {
  bootstrap: () => ipcRenderer.invoke('chat:bootstrap'),
  saveRecentPrompt: (promptEntry) => ipcRenderer.invoke('chat:save-recent-prompt', promptEntry),
  streamMessage: (request) => ipcRenderer.invoke('chat:stream-message', request),

  onStreamChunk: (callback) => {
    ipcRenderer.on('chat:stream-chunk', (_event, chunk) => callback(chunk));
  },

  onStreamDone: (callback) => {
    ipcRenderer.on('chat:stream-done', (_event, meta) => callback(meta));
  },

  onStreamError: (callback) => {
    ipcRenderer.on('chat:stream-error', (_event, error) => callback(error));
  },

  removeStreamListeners: () => {
    ipcRenderer.removeAllListeners('chat:stream-chunk');
    ipcRenderer.removeAllListeners('chat:stream-done');
    ipcRenderer.removeAllListeners('chat:stream-error');
  }
});
