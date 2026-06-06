async function showOpenDialog(event, options) {
  const { dialog } = await import('electron');
  const window = event.sender.getOwnerBrowserWindow();
  return dialog.showOpenDialog(window, options);
}

export async function pickOpenPath(event, options) {
  const result = await showOpenDialog(event, options);
  return result.canceled ? null : (result.filePaths[0] ?? null);
}
