import { app, BrowserWindow, dialog } from 'electron';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { getWritableDataDirectory } from '../../Shared/Storage/ResourcePaths.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
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

/**
 * Deep merge two plain objects. `current` wins on every scalar conflict.
 * Arrays are handled specially: if both sides are arrays they are unioned
 * (deduped by JSON identity). Objects are recursed into.
 */
function deepMerge(current, imported) {
  if (current === null || current === undefined) return imported;
  if (imported === null || imported === undefined) return current;

  // Both are arrays → dedupe union (JSON identity)
  if (Array.isArray(current) && Array.isArray(imported)) {
    const seen = new Set(current.map((v) => JSON.stringify(v)));
    const extras = imported.filter((v) => !seen.has(JSON.stringify(v)));
    return [...current, ...extras];
  }

  // Both are plain objects → recurse
  if (
    typeof current === 'object' &&
    typeof imported === 'object' &&
    !Array.isArray(current) &&
    !Array.isArray(imported)
  ) {
    const result = { ...imported }; // start with imported so we keep its shape
    for (const key of Object.keys(current)) {
      if (key === '__proto__' || key === 'constructor') continue;
      result[key] = deepMerge(current[key], imported[key]);
    }
    return result;
  }

  // Scalars — current wins when it has a real value (null/undefined already handled above)
  if (current !== '') return current;
  return imported;
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
  // ── Profile ──────────────────────────────────────────────────────────────
  const currentProfile = current.profile ?? {};
  const importedProfile = imported.profile ?? {};

  const mergedProfile = {
    name:
      String(currentProfile.name ?? '').trim() || String(importedProfile.name ?? '').trim() || '',
    // Avatar: keep current path if it exists; otherwise take imported path.
    // Note: the file itself is handled separately in the zip loop.
    avatarPath: currentProfile.avatarPath ?? importedProfile.avatarPath ?? null,
    dateOfBirth: {
      day:
        String(currentProfile.dateOfBirth?.day ?? '').trim() ||
        String(importedProfile.dateOfBirth?.day ?? '').trim() ||
        '',
      month:
        String(currentProfile.dateOfBirth?.month ?? '').trim() ||
        String(importedProfile.dateOfBirth?.month ?? '').trim() ||
        '',
      year:
        String(currentProfile.dateOfBirth?.year ?? '').trim() ||
        String(importedProfile.dateOfBirth?.year ?? '').trim() ||
        '',
    },
  };

  // ── Providers ────────────────────────────────────────────────────────────
  // selected: union of both
  const currentSelected = Array.isArray(current.providers?.selected)
    ? current.providers.selected
    : [];
  const importedSelected = Array.isArray(imported.providers?.selected)
    ? imported.providers.selected
    : [];
  const mergedSelected = [...new Set([...currentSelected, ...importedSelected])];

  // details: per-provider gap-fill — never overwrite an existing entry
  const currentProviderDetails = current.providers?.details ?? {};
  const importedProviderDetails = imported.providers?.details ?? {};
  const mergedProviderDetails = { ...importedProviderDetails, ...currentProviderDetails };

  // ── Connector secrets ────────────────────────────────────────────────────
  const currentConnectorDetails = current.connectors?.details ?? {};
  const importedConnectorDetails = imported.connectors?.details ?? {};
  const mergedConnectorDetails = { ...importedConnectorDetails, ...currentConnectorDetails };

  // ── Scalar / settings fields: current wins only when it has a real value ─
  const mergedCustomInstructions =
    String(current.customInstructions ?? '').trim() ||
    String(imported.customInstructions ?? '').trim() ||
    '';

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

  // theme / appSettings: deep-merge (current wins per key)
  const mergedTheme = deepMerge(current.theme ?? {}, imported.theme ?? {});
  const mergedAppSettings = deepMerge(current.appSettings ?? {}, imported.appSettings ?? {});

  // ── Onboarding / identity fields ─────────────────────────────────────────
  // Always keep current values for security-sensitive / machine-specific fields.
  return {
    // Identity / onboarding — always current
    locale: current.locale ?? imported.locale ?? 'en',
    consentAccepted: current.consentAccepted ?? imported.consentAccepted ?? false,
    onboardingCompleted: current.onboardingCompleted ?? imported.onboardingCompleted ?? false,
    completedAt: current.completedAt ?? imported.completedAt ?? null,
    lastCompletedStep: current.lastCompletedStep ?? imported.lastCompletedStep ?? 0,
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
    windowState: current.windowState,
    appSettings: mergedAppSettings,
    theme: mergedTheme,
  };
}

/**
 * Merge imported Channels.json into current.
 * Uses deepMerge so current config wins on every conflict while any new
 * channel keys from the import are preserved.
 */
function mergeChannelsJson(current = {}, imported = {}) {
  return deepMerge(current, imported);
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
 *  - Security.json / System.json → always skipped (machine-specific / sensitive)
 *  - User.json → explicit field merge:
 *      API keys / connector secrets: gap-fill only (never overwrite existing)
 *      profile (name, dob, avatar path): imported fills in empty/null values
 *      providers.selected: union of both
 *      customInstructions, usageModes, activePersona: imported fills blanks
 *      theme / appSettings: current wins per key, import fills missing keys
 *      windowState: always kept from current (machine-specific)
 *  - Channels.json → smart merge (current config wins per channel)
 *  - Avatar.* → write only if no avatar exists; fix avatarPath to local path
 *  - Memories/*.md → skipped here; use the Memory panel's AI import flow
 *  - Everything else → copy only if the destination file does not exist yet
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
    if (topLevel === 'Security.json' || topLevel === 'System.json') continue;

    const destPath = path.resolve(dataDir, normPath);

    // Prevent Zip Slip / Path Traversal: ensure resolved path stays inside dataDir
    const relative = path.relative(dataDir, destPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) continue;

    const content = await zipEntry.async('nodebuffer');

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
      await writeFile(destPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
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
      await writeFile(destPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
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
        writtenAvatarPath = destPath;
      }
      continue;
    }

    // ── Memory .md files: merge via AI import pipeline (handled separately).
    // Raw zip-level memory merging is intentionally skipped here — the Memory
    // panel's import flow (MemoryPanel.js → runMemoryImport) handles .md files
    // using the AI-assisted ImportMemory prompt, which properly deduplicates
    // and restructures content.  We simply skip .md files in the zip so we
    // don't overwrite anything the AI import has already handled.
    if (topLevel === 'Memories' && normPath.endsWith('.md')) {
      // Skip — memory files are managed by the Memory panel's import UI.
      continue;
    }

    // ── Everything else: add only if file doesn't already exist ───────────
    // Chats, Agents, Projects, Templates, ChannelMessages, Usage, etc.
    if (await fileExists(destPath)) continue;

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
      if (!userState.profile?.avatarPath) {
        userState.profile = { ...(userState.profile ?? {}), avatarPath: writtenAvatarPath };
        await writeFile(userJsonPath, `${JSON.stringify(userState, null, 2)}\n`, 'utf8');
      }
    } catch {
      // Non-fatal: User.json may not exist yet or avatarPath was already set correctly.
    }
  }

  return { ok: true };
}
