export function invokeIpc(channel, ...args) {
  return window.Joanium.ipc.invoke(channel, ...args);
}

export function onIpc(channel, callback) {
  return window.Joanium.ipc.on(channel, callback);
}

export function removeIpcListeners(channel) {
  window.Joanium.ipc.removeAllListeners(channel);
}
