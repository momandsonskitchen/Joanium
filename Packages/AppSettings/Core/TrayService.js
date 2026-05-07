import path from 'node:path';
import { app, BrowserWindow, Menu, Tray } from 'electron';

let tray = null;
let lastWindow = null;

function getTrayIconPath(rootDirectory) {
  if (process.platform === 'win32') return path.join(rootDirectory, 'Assets', 'Logo', 'Logo.ico');
  return path.join(rootDirectory, 'Assets', 'Logo', 'Logo.png');
}

function getTargetWindow() {
  return lastWindow && !lastWindow.isDestroyed()
    ? lastWindow
    : BrowserWindow.getAllWindows().find((windowRef) => !windowRef.isDestroyed()) ?? null;
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
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'Show Joanium',
      click: showWindow
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        disableTray();
        app.quit();
      }
    }
  ]));
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
