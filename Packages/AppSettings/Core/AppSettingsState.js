import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const DEFAULT_SETTINGS = Object.freeze({
  runOnStartup: false,
  systemTray: false,
  keepAwake: false,
  completionSound: true,
  animations: true
});

function normalizeSettings(candidate = {}) {
  return {
    runOnStartup: Boolean(candidate.runOnStartup ?? candidate.run_on_startup ?? DEFAULT_SETTINGS.runOnStartup),
    systemTray: Boolean(candidate.systemTray ?? candidate.system_tray ?? DEFAULT_SETTINGS.systemTray),
    keepAwake: Boolean(candidate.keepAwake ?? candidate.keep_awake ?? DEFAULT_SETTINGS.keepAwake),
    completionSound: Boolean(candidate.completionSound ?? candidate.completion_sound ?? DEFAULT_SETTINGS.completionSound),
    animations: Boolean(candidate.animations ?? DEFAULT_SETTINGS.animations)
  };
}

export function createAppSettingsStateManager({ rootDirectory }) {
  const filePath = path.join(rootDirectory, 'Data', 'AppSettings.json');

  async function readSettings() {
    try {
      const raw = await readFile(filePath, 'utf8');
      return normalizeSettings(JSON.parse(raw));
    } catch {
      return normalizeSettings();
    }
  }

  async function writeSettings(settings) {
    const normalized = normalizeSettings(settings);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
    return normalized;
  }

  return {
    readSettings,
    async updateSettings(patch = {}) {
      const current = await readSettings();
      return writeSettings({ ...current, ...patch });
    }
  };
}
