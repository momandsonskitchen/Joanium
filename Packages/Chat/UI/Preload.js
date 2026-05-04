import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('JoaniumChat', {
  bootstrap: () => ipcRenderer.invoke('chat:bootstrap'),
  saveSession: (session) => ipcRenderer.invoke('chat:save-session', session),
  listSessions: () => ipcRenderer.invoke('chat:list-sessions'),
  loadSession: (id) => ipcRenderer.invoke('chat:load-session', id),
  deleteSession: (id) => ipcRenderer.invoke('chat:delete-session', id),
  renameSession: (id, newTitle) => ipcRenderer.invoke('chat:rename-session', id, newTitle),
  pinSession: (id, pinned) => ipcRenderer.invoke('chat:pin-session', id, pinned),

  saveProject:   (project) => ipcRenderer.invoke('chat:save-project', project),
  listProjects:  ()         => ipcRenderer.invoke('chat:list-projects'),
  loadProject:   (id)       => ipcRenderer.invoke('chat:load-project', id),
  deleteProject: (id)       => ipcRenderer.invoke('chat:delete-project', id),
  selectProjectCover: ()    => ipcRenderer.invoke('chat:select-project-cover'),

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
