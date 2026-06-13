import { app, BrowserWindow, Menu, Tray } from 'electron';
import { getTrayIconPath } from '../../Shared/Storage/ResourcePaths.js';

let tray = null;
let lastWindow = null;

function getTargetWindow() {
  return lastWindow && !lastWindow.isDestroyed()
    ? lastWindow
    : (BrowserWindow.getAllWindows().find((windowRef) => !windowRef.isDestroyed()) ?? null);
}

function showWindow() {
  const target = getTargetWindow();
  if (!target) return;
  if (target.isMinimized()) target.restore();
  target.show();
  target.focus();
}

export function rememberWindow(windowRef) {
  if (windowRef && !windowRef.isDestroyed()) {
    lastWindow = windowRef;
  }
}

export function enableTray(rootDirectory, windowRef = null) {
  rememberWindow(windowRef);
  if (tray) return;

  tray = new Tray(getTrayIconPath(rootDirectory));
  tray.setToolTip('Joanium');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Show Joanium',
        click: showWindow,
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          disableTray();
          app.quit();
        },
      },
    ]),
  );
  tray.on('double-click', showWindow);
}

export function disableTray() {
  if (!tray) return;
  tray.destroy();
  tray = null;
}

export function isTrayActive() {
  return Boolean(tray && !tray.isDestroyed());
}
