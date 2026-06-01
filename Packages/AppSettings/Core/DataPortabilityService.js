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

  // Scalars — current wins when it has a real value
  if (current !== null && current !== undefined && current !== '') return current;
  return imported;
}

/**
 * Merge imported User.json into current User.json.
 *
 * Rules:
 *  - API keys (`providers.details`) are NEVER imported — current always kept.
 *  - Connector secrets (`connectors.details`) are NEVER imported.
 *  - providers.selected = union of both (via deepMerge array handling).
 *  - Everything else: deepMerge — current wins on conflicts, imported fills gaps.
 *  - Future unknown keys in User.json are automatically handled without any
 *    hardcoding here.
 */
function mergeUserJson(current = {}, imported = {}) {
  // Deep-merge everything except the secrets we always guard
  const merged = deepMerge(current, imported);

  // Always restore current secrets — never let imported overwrite them
  merged.providers = {
    ...merged.providers,
    details: current.providers?.details ?? {},
  };
  merged.connectors = {
    ...merged.connectors,
    details: current.connectors?.details ?? {},
  };

  return merged;
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
 *  - User.json → deep merge (API keys never imported)
 *  - Channels.json → smart merge (current config wins per channel)
 *  - Avatar.* → keep current (never overwrite)
 *  - Memories/*.md → append imported content under a divider if not already present
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

    // ── Avatar files: never overwrite the current avatar ──────────────────
    const ext = path.extname(normPath).toLowerCase();
    const base = path.basename(normPath).toLowerCase();
    if (
      base.startsWith('avatar') &&
      ['.avif', '.bmp', '.gif', '.jpeg', '.jpg', '.png', '.webp'].includes(ext)
    ) {
      if (await fileExists(destPath)) continue;
    }

    // ── Memory .md files: append imported content if not already present ───
    if (topLevel === 'Memories' && normPath.endsWith('.md')) {
      await mkdir(path.dirname(destPath), { recursive: true });
      const importedText = content.toString('utf8').trim();

      if (await fileExists(destPath)) {
        const currentText = (await readFile(destPath, 'utf8')).trimEnd();
        const alreadyPresent =
          currentText === importedText ||
          currentText.startsWith(`${importedText}\n`) ||
          currentText.endsWith(`\n${importedText}`) ||
          currentText.includes(`\n${importedText}\n`);
        if (!alreadyPresent) {
          await writeFile(
            destPath,
            `${currentText}\n\n<!-- Imported -->\n\n${importedText}\n`,
            'utf8',
          );
        }
      } else {
        await writeFile(destPath, `${importedText}\n`, 'utf8');
      }
      continue;
    }

    // ── Everything else: add only if file doesn't already exist ───────────
    // Chats, Agents, Projects, Templates, ChannelMessages, Usage, etc.
    if (await fileExists(destPath)) continue;

    await mkdir(path.dirname(destPath), { recursive: true });
    await writeFile(destPath, content);
  }

  return { ok: true };
}
