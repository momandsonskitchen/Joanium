import { powerSaveBlocker } from 'electron';

let blockerId = null;

export function startKeepAwake() {
  if (blockerId !== null && powerSaveBlocker.isStarted(blockerId)) return;
  blockerId = powerSaveBlocker.start('prevent-app-suspension');
}

export function stopKeepAwake() {
  if (blockerId !== null && powerSaveBlocker.isStarted(blockerId)) {
    powerSaveBlocker.stop(blockerId);
  }
  blockerId = null;
}

export function isKeepAwakeActive() {
  return blockerId !== null && powerSaveBlocker.isStarted(blockerId);
}
