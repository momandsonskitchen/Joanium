import { app, BrowserWindow, dialog } from 'electron';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { getWritableDataDirectory } from '../../Shared/Storage/ResourcePaths.js';
import { serializeJson } from '../../Shared/Storage/JsonFileStore.js';
import { createDefaultUserState } from '../../Shared/UserData/UserData.js';
import { deepMerge } from '../../Shared/Utils/MergeUtils.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function isInsideDirectory(directory, filePath) {
  const relative = path.relative(directory, filePath);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

/** Recursively add an entire directory into the zip under `zipFolder`. */
async function addDirectoryToZip(zip, dirPath, zipFolder) {
  let entries;
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return; // directory absent — skip silently
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const zipPath = `${zipFolder}/${entry.name}`;

    if (entry.isDirectory()) {
      await addDirectoryToZip(zip, fullPath, zipPath);
    } else if (entry.isFile()) {
      zip.file(zipPath, await readFile(fullPath));
    }
  }
}

// ── Merge helpers ─────────────────────────────────────────────────────────────

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isEmptyValue(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return false;
}

function valueEquals(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function mergeArray(current = [], imported = []) {
  const seen = new Set();
  const result = [];

  for (const item of [...current, ...imported]) {
    const key = JSON.stringify(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function mergeDefaultAware(current, imported, defaults) {
  if (imported === undefined) return current;
  if (current === undefined || current === null) return imported;

  if (Array.isArray(current) || Array.isArray(imported)) {
    return mergeArray(
      Array.isArray(current) ? current : [],
      Array.isArray(imported) ? imported : [],
    );
  }

  if (isPlainObject(current) && isPlainObject(imported)) {
    const result = {};
    const keys = new Set([...Object.keys(imported), ...Object.keys(current)]);

    for (const key of keys) {
      if (key === '__proto__' || key === 'constructor') continue;
      result[key] = mergeDefaultAware(current[key], imported[key], defaults?.[key]);
    }

    return result;
  }

  if (isEmptyValue(current)) return imported;
  if (defaults !== undefined && valueEquals(current, defaults)) return imported;
  return current;
}

function mergeSecretDetails(current = {}, imported = {}) {
  const result = {};
  const keys = new Set([...Object.keys(imported), ...Object.keys(current)]);

  for (const key of keys) {
    if (key === '__proto__' || key === 'constructor') continue;
    const currentDetails = isPlainObject(current[key]) ? current[key] : {};
    const importedDetails = isPlainObject(imported[key]) ? imported[key] : {};
    const detailKeys = new Set([...Object.keys(importedDetails), ...Object.keys(currentDetails)]);
    const mergedDetails = {};

    for (const detailKey of detailKeys) {
      if (detailKey === '__proto__' || detailKey === 'constructor') continue;
      const currentValue = currentDetails[detailKey];
      mergedDetails[detailKey] = isEmptyValue(currentValue)
        ? importedDetails[detailKey]
        : currentValue;
    }

    result[key] = mergedDetails;
  }

  return result;
}

function markdownBody(content = '') {
  const lines = String(content).replace(/\r\n/g, '\n').trim().split('\n');
  if (lines[0]?.trim().startsWith('#')) lines.shift();
  return lines.join('\n').trim();
}

function markdownHeading(content = '', fallback = '# Memory') {
  const firstLine = String(content).replace(/\r\n/g, '\n').trim().split('\n')[0]?.trim();
  return firstLine?.startsWith('#') ? firstLine : fallback;
}

function normalizeMarkdownLine(line = '') {
  return String(line)
    .toLowerCase()
    .replace(/^\s*[-*]\s+/, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mergeMarkdown(current = '', imported = '', filename = 'Memory.md') {
  const importedText = String(imported).replace(/\r\n/g, '\n').trim();
  const currentText = String(current).replace(/\r\n/g, '\n').trim();

  if (!importedText) return currentText ? `${currentText}\n` : '';
  if (!markdownBody(currentText)) return `${importedText}\n`;
  if (!markdownBody(importedText)) return `${currentText}\n`;

  const heading = markdownHeading(
    currentText,
    markdownHeading(importedText, `# ${filename.replace(/\.md$/i, '')}`),
  );
  const seen = new Set();
  const mergedLines = [];

  for (const source of [markdownBody(currentText), markdownBody(importedText)]) {
    for (const rawLine of source.split('\n')) {
      const line = rawLine.trimEnd();
      const normalized = normalizeMarkdownLine(line);

      if (normalized) {
        if (seen.has(normalized)) continue;
        seen.add(normalized);
      }

      mergedLines.push(line);
    }
  }

  return `${heading}\n\n${mergedLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`;
}

/**
 * Merge imported User.json into current User.json.
 *
 * Rules:
 *  - API keys (`providers.details`): per-provider, existing key values are never
 *    overwritten but any missing provider entry is filled in from the import.
 *  - Connector secrets (`connectors.details`): same gap-fill approach.
 *  - providers.selected: union of both arrays (deduped).
 *  - Scalar fields (name, dob, customInstructions, theme, appSettings, etc.):
 *    import fills in any field that is empty/null/default in current.
 *  - Avatar path: imported only if current has no avatar (avatarPath is null/empty).
 */
function mergeUserJson(current = {}, imported = {}) {
  const defaults = createDefaultUserState();
  const base = mergeDefaultAware(current, imported, defaults);

  // ── Profile ──────────────────────────────────────────────────────────────
  const currentProfile = current.profile ?? {};
  const importedProfile = imported.profile ?? {};

  const mergedProfile = mergeDefaultAware(currentProfile, importedProfile, defaults.profile);

  // ── Providers ────────────────────────────────────────────────────────────
  // selected: union of both
  const currentSelected = Array.isArray(current.providers?.selected)
    ? current.providers.selected
    : [];
  const importedSelected = Array.isArray(imported.providers?.selected)
    ? imported.providers.selected
    : [];
  const mergedSelected = [...new Set([...currentSelected, ...importedSelected])];

  // details: per-provider, per-field gap-fill.
  const currentProviderDetails = current.providers?.details ?? {};
  const importedProviderDetails = imported.providers?.details ?? {};
  const mergedProviderDetails = mergeSecretDetails(currentProviderDetails, importedProviderDetails);

  // ── Connector secrets ────────────────────────────────────────────────────
  const currentConnectorDetails = current.connectors?.details ?? {};
  const importedConnectorDetails = imported.connectors?.details ?? {};
  const mergedConnectorDetails = mergeSecretDetails(
    currentConnectorDetails,
    importedConnectorDetails,
  );

  // ── Scalar / settings fields: current wins only when it has a real value ─
  const mergedCustomInstructions = mergeDefaultAware(
    current.customInstructions,
    imported.customInstructions,
    defaults.customInstructions,
  );

  const mergedUsageModes = deepMerge(
    Array.isArray(current.usageModes) ? current.usageModes : [],
    Array.isArray(imported.usageModes) ? imported.usageModes : [],
  );

  // activePersona: keep current unless it's still the default placeholder
  const DEFAULT_PERSONA_FILENAME = 'Joana.md';
  const currentPersona = current.activePersona;
  const importedPersona = imported.activePersona;
  const mergedPersona =
    currentPersona &&
    currentPersona.namespace &&
    currentPersona.filename &&
    currentPersona.filename !== DEFAULT_PERSONA_FILENAME
      ? currentPersona
      : (importedPersona ?? currentPersona);

  // theme / appSettings: defaults do not block restored backup values.
  const mergedTheme = mergeDefaultAware(current.theme ?? {}, imported.theme ?? {}, defaults.theme);
  const mergedAppSettings = mergeDefaultAware(
    current.appSettings ?? {},
    imported.appSettings ?? {},
    defaults.appSettings,
  );

  // ── Onboarding / identity fields ─────────────────────────────────────────
  return {
    ...base,
    locale: mergeDefaultAware(current.locale, imported.locale, defaults.locale),
    consentAccepted: mergeDefaultAware(
      current.consentAccepted,
      imported.consentAccepted,
      defaults.consentAccepted,
    ),
    onboardingCompleted: mergeDefaultAware(
      current.onboardingCompleted,
      imported.onboardingCompleted,
      defaults.onboardingCompleted,
    ),
    completedAt: mergeDefaultAware(current.completedAt, imported.completedAt, defaults.completedAt),
    lastCompletedStep: mergeDefaultAware(
      current.lastCompletedStep,
      imported.lastCompletedStep,
      defaults.lastCompletedStep,
    ),
    // Merged fields
    profile: mergedProfile,
    customInstructions: mergedCustomInstructions,
    providers: {
      selected: mergedSelected,
      details: mergedProviderDetails,
    },
    connectors: {
      details: mergedConnectorDetails,
    },
    usageModes: mergedUsageModes,
    activePersona: mergedPersona,
    // Window state is always machine-specific — never import
    windowState: current.windowState ?? defaults.windowState,
    appSettings: mergedAppSettings,
    theme: mergedTheme,
    whatsNewSeenVersion: mergeDefaultAware(
      current.whatsNewSeenVersion,
      imported.whatsNewSeenVersion,
      defaults.whatsNewSeenVersion,
    ),
    lastDreamt: mergeDefaultAware(current.lastDreamt, imported.lastDreamt, defaults.lastDreamt),
  };
}

/**
 * Merge imported Channels.json into current.
 * Uses deepMerge with imported data as the winner because this is a backup
 * restore path and default local channel config should not block credentials.
 */
function mergeChannelsJson(current = {}, imported = {}) {
  return deepMerge(imported, current);
}

// ── Export ────────────────────────────────────────────────────────────────────

/**
 * Zip the entire Data directory and prompt the user to save it.
 * Everything in Data is included — no hardcoded list.
 */
export async function exportData(rootDirectory) {
  const dataDir = getWritableDataDirectory(rootDirectory);
  const zip = new JSZip();

  // Walk every entry at the top level of Data and add it
  let topEntries;
  try {
    topEntries = await readdir(dataDir, { withFileTypes: true });
  } catch {
    return { ok: false, error: 'Cannot read Data directory.' };
  }

  for (const entry of topEntries) {
    const fullPath = path.join(dataDir, entry.name);
    if (entry.isDirectory()) {
      await addDirectoryToZip(zip, fullPath, entry.name);
    } else if (entry.isFile()) {
      zip.file(entry.name, await readFile(fullPath));
    }
  }

  const ownerWindow = BrowserWindow.getAllWindows()[0] ?? null;
  const { canceled, filePath } = await dialog.showSaveDialog(ownerWindow, {
    title: 'Export Joanium Data',
    defaultPath: path.join(app.getPath('downloads'), 'Joanium.zip'),
    filters: [{ name: 'Joanium Backup', extensions: ['zip'] }],
  });

  if (canceled || !filePath) {
    return { ok: false, canceled: true };
  }

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  await writeFile(filePath, zipBuffer);
  return { ok: true, path: filePath };
}

// ── Import ────────────────────────────────────────────────────────────────────

/**
 * Prompt the user to pick a Joanium.zip and merge it into the current Data.
 *
 * Merge strategy:
 *  - System.json → always skipped (machine-specific)
 *  - Security.json → restored only when current security is not enabled
 *  - User.json → explicit field merge:
 *      API keys / connector secrets: gap-fill only (never overwrite existing)
 *      profile (name, dob, avatar path): imported fills in empty/null values
 *      providers.selected: union of both
 *      customInstructions, usageModes, activePersona: imported fills blanks
 *      theme / appSettings: current wins only when it differs from defaults
 *      windowState: always kept from current (machine-specific)
 *  - Channels.json → smart merge (current config wins per channel)
 *  - Avatar.* → write only if no avatar exists; fix avatarPath to local path
 *  - Memories/*.md → markdown merge, default placeholders do not block import
 *  - Everything else → restore the backed-up file
 */
export async function importData(rootDirectory) {
  const ownerWindow = BrowserWindow.getAllWindows()[0] ?? null;
  const { canceled, filePaths } = await dialog.showOpenDialog(ownerWindow, {
    title: 'Import Joanium Data',
    filters: [{ name: 'Joanium Backup', extensions: ['zip'] }],
    properties: ['openFile'],
  });

  if (canceled || !filePaths?.length) {
    return { ok: false, canceled: true };
  }

  const zipBuffer = await readFile(filePaths[0]);
  const zip = await JSZip.loadAsync(zipBuffer);
  const dataDir = getWritableDataDirectory(rootDirectory);
  await mkdir(dataDir, { recursive: true });

  // Track the avatar destination path so we can fix avatarPath in User.json
  // after the zip loop (the imported path is always an absolute path from the
  // source machine and would be wrong on any other install location).
  let writtenAvatarPath = null;

  for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;

    // Normalise path separators (Windows compat)
    const normPath = relativePath.replaceAll('\\', '/');
    const topLevel = normPath.split('/')[0];

    // ── Always skip these ──────────────────────────────────────────────────
    if (topLevel === 'System.json') continue;

    const destPath = path.resolve(dataDir, normPath);

    // Prevent Zip Slip / Path Traversal: ensure resolved path stays inside dataDir
    const relative = path.relative(dataDir, destPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) continue;

    const content = await zipEntry.async('nodebuffer');

    // Security.json: restore app-lock settings only when the current install
    // is not already protected, so an import cannot silently replace the
    // active local password.
    if (normPath === 'Security.json') {
      let currentSecurity = {};
      try {
        currentSecurity = JSON.parse(await readFile(destPath, 'utf8'));
      } catch {
        /* no current security file */
      }

      if (currentSecurity?.enabled) continue;

      let importedSecurity;
      try {
        importedSecurity = JSON.parse(content.toString('utf8'));
      } catch {
        continue;
      }

      const restoredSecurity = {
        ...importedSecurity,
        failedPasswordAttempts: 0,
        lockedUntil: null,
      };

      await mkdir(path.dirname(destPath), { recursive: true });
      await writeFile(destPath, serializeJson(restoredSecurity), 'utf8');
      continue;
    }

    // ── User.json: smart merge ─────────────────────────────────────────────
    if (normPath === 'User.json') {
      let currentData = {};
      try {
        currentData = JSON.parse(await readFile(destPath, 'utf8'));
      } catch {
        /* no current file — start from empty */
      }
      let importedData;
      try {
        importedData = JSON.parse(content.toString('utf8'));
      } catch {
        continue;
      }
      const merged = mergeUserJson(currentData, importedData);
      await mkdir(path.dirname(destPath), { recursive: true });
      await writeFile(destPath, serializeJson(merged), 'utf8');
      continue;
    }

    // ── Channels.json: smart merge ─────────────────────────────────────────
    if (normPath === 'Channels.json') {
      let currentData = {};
      try {
        currentData = JSON.parse(await readFile(destPath, 'utf8'));
      } catch {
        /* no current file */
      }
      let importedData;
      try {
        importedData = JSON.parse(content.toString('utf8'));
      } catch {
        continue;
      }
      const merged = mergeChannelsJson(currentData, importedData);
      await mkdir(path.dirname(destPath), { recursive: true });
      await writeFile(destPath, serializeJson(merged), 'utf8');
      continue;
    }

    // ── Avatar files: write only if no avatar currently exists ─────────────
    const ext = path.extname(normPath).toLowerCase();
    const base = path.basename(normPath).toLowerCase();
    if (
      base.startsWith('avatar') &&
      ['.avif', '.bmp', '.gif', '.jpeg', '.jpg', '.png', '.webp'].includes(ext)
    ) {
      if (!(await fileExists(destPath))) {
        await mkdir(path.dirname(destPath), { recursive: true });
        await writeFile(destPath, content);
      }
      writtenAvatarPath = destPath;
      continue;
    }

    // ── Memory .md files: restore the actual backed-up memory files.
    if (topLevel === 'Memories' && normPath.endsWith('.md')) {
      const currentContent = await readFile(destPath, 'utf8').catch(() => '');
      const mergedContent = mergeMarkdown(
        currentContent,
        content.toString('utf8'),
        path.basename(normPath),
      );

      await mkdir(path.dirname(destPath), { recursive: true });
      await writeFile(destPath, mergedContent, 'utf8');
      continue;
    }

    // ── Everything else: restore the backed-up file.
    // Chats, Agents, Projects, Templates, ChannelMessages, Usage, etc.
    await mkdir(path.dirname(destPath), { recursive: true });
    await writeFile(destPath, content);
  }

  // If we wrote a new avatar file, patch avatarPath in User.json to point to
  // the correct local path (the imported path was an absolute path from the
  // source machine and is meaningless here).
  if (writtenAvatarPath !== null) {
    const userJsonPath = path.join(dataDir, 'User.json');
    try {
      const userState = JSON.parse(await readFile(userJsonPath, 'utf8'));
      const avatarPath = String(userState.profile?.avatarPath ?? '').trim();
      if (!avatarPath || !isInsideDirectory(dataDir, avatarPath)) {
        userState.profile = { ...(userState.profile ?? {}), avatarPath: writtenAvatarPath };
        await writeFile(userJsonPath, serializeJson(userState), 'utf8');
      }
    } catch {
      // Non-fatal: User.json may not exist yet or avatarPath was already set correctly.
    }
  }

  return { ok: true };
}
