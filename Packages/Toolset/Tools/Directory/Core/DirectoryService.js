import fs from 'node:fs';
import path from 'node:path';
import {
  MAX_FILE_SIZE,
  inspectWorkspaceSummary,
  isProbablyTextFile,
  normalizeBool,
  protectedDeleteReason,
  requireString,
  resolveDirectory,
  walkWorkspaceFiles,
} from '../../../Utils/WorkspaceUtils.js';

export function createDirectoryService({ rootDirectory }) {
  const fallbackDirectory = rootDirectory || process.cwd();

  function readTextFile(payload = {}) {
    const fileError = requireString(payload.filePath, 'No file path provided.');
    if (fileError) return fileError;

    const resolvedPath = resolveDirectory(payload.filePath, payload.cwd ?? fallbackDirectory);
    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      return { ok: false, error: `"${resolvedPath}" is not a file.` };
    }
    if (stat.size > MAX_FILE_SIZE) {
      return {
        ok: false,
        error: `File too large (${Math.round(stat.size / 1024)} KB > ${Math.round(MAX_FILE_SIZE / 1024)} KB limit).`,
      };
    }

    const lines = fs.readFileSync(resolvedPath, 'utf8').split('\n');
    const maxLines = Math.min(Math.max(Number(payload.maxLines) || 200, 1), 2000);
    const slicedLines = lines.slice(0, maxLines);
    const note =
      lines.length > maxLines ? `\n...(showing ${maxLines} of ${lines.length} lines)` : '';

    return {
      ok: true,
      path: resolvedPath,
      content: slicedLines.join('\n') + note,
      totalLines: lines.length,
      sizeBytes: stat.size,
    };
  }

  function listDirectory(payload = {}) {
    const directoryError = requireString(payload.dirPath, 'No directory path provided.');
    if (directoryError) return directoryError;

    const resolvedPath = resolveDirectory(payload.dirPath, payload.cwd ?? fallbackDirectory);
    if (!fs.statSync(resolvedPath).isDirectory()) {
      return { ok: false, error: `"${resolvedPath}" is not a directory.` };
    }

    const items = fs
      .readdirSync(resolvedPath, { withFileTypes: true })
      .map((entry) => ({
        name: entry.name,
        type: entry.isDirectory() ? 'dir' : entry.isFile() ? 'file' : 'other',
        size: entry.isFile() ? fs.statSync(path.join(resolvedPath, entry.name)).size : null,
      }))
      .sort((a, b) =>
        a.type !== b.type ? (a.type === 'dir' ? -1 : 1) : a.name.localeCompare(b.name),
      );

    return { ok: true, path: resolvedPath, entries: items, count: items.length };
  }

  function searchWorkspace(payload = {}) {
    const rootError = requireString(payload.rootPath, 'No workspace path provided.');
    if (rootError) return rootError;
    const queryError = requireString(payload.query, 'No search query provided.');
    if (queryError) return queryError;

    const { root, files } = walkWorkspaceFiles(payload.rootPath);
    const maxResults = Math.min(Math.max(Number(payload.maxResults) || 40, 1), 100);
    const matches = [];
    const rawQuery = String(payload.query).trim();
    const regexMatch = rawQuery.match(/^\/(.+)\/([gimsuy]*)$/);
    const matcher = regexMatch ? new RegExp(regexMatch[1], regexMatch[2]) : null;
    const needle = rawQuery.toLowerCase();

    for (const filePath of files) {
      if (matches.length >= maxResults || !isProbablyTextFile(filePath)) {
        continue;
      }

      let raw = '';
      try {
        const stat = fs.statSync(filePath);
        if (stat.size > MAX_FILE_SIZE) continue;
        raw = fs.readFileSync(filePath, 'utf8');
      } catch {
        continue;
      }

      const lines = raw.split('\n');
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        if (matcher) matcher.lastIndex = 0;
        if (matcher ? matcher.test(line) : line.toLowerCase().includes(needle)) {
          matches.push({
            path: path.relative(root, filePath),
            lineNumber: index + 1,
            line: line.trim().slice(0, 240),
          });
          if (matches.length >= maxResults) break;
        }
      }
    }

    return { ok: true, root, matches };
  }

  function inspectWorkspace(payload = {}) {
    const rootError = requireString(payload.rootPath, 'No workspace path provided.');
    if (rootError) return rootError;

    try {
      return {
        ok: true,
        summary: inspectWorkspaceSummary(resolveDirectory(payload.rootPath, fallbackDirectory)),
      };
    } catch (error) {
      return { ok: false, error: error?.message ?? String(error) };
    }
  }

  function writeFile(payload = {}) {
    const fileError = requireString(payload.filePath, 'No file path provided.');
    if (fileError) return fileError;
    const resolvedPath = resolveDirectory(payload.filePath, payload.cwd ?? fallbackDirectory);
    const append = normalizeBool(payload.append);
    const existed = fs.existsSync(resolvedPath);
    const beforeContent =
      existed && fs.statSync(resolvedPath).isFile() ? fs.readFileSync(resolvedPath, 'utf8') : '';

    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    if (append) {
      fs.appendFileSync(resolvedPath, payload.content ?? '', 'utf8');
    } else {
      fs.writeFileSync(resolvedPath, payload.content ?? '', 'utf8');
    }

    const afterContent = fs.readFileSync(resolvedPath, 'utf8');
    return {
      ok: true,
      path: resolvedPath,
      bytes: Buffer.byteLength(payload.content ?? '', 'utf8'),
      beforeContent,
      afterContent,
      created: !existed,
      appended: append,
    };
  }

  function applyFilePatch(payload = {}) {
    const fileError = requireString(payload.filePath, 'No file path provided.');
    if (fileError) return fileError;
    const searchError = requireString(payload.search, 'No search text provided.');
    if (searchError) return searchError;
    if (payload.replace == null) {
      return { ok: false, error: 'No replacement text provided.' };
    }

    const resolvedPath = resolveDirectory(payload.filePath, payload.cwd ?? fallbackDirectory);
    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
      return { ok: false, error: `"${resolvedPath}" is not a file.` };
    }

    const beforeContent = fs.readFileSync(resolvedPath, 'utf8');
    const search = String(payload.search);
    const replace = String(payload.replace);
    const replaceAll = normalizeBool(payload.replaceAll ?? payload.replace_all);
    const occurrences = beforeContent.split(search).length - 1;

    if (occurrences <= 0) {
      return { ok: false, error: 'Search text was not found in the file.' };
    }

    const afterContent = replaceAll
      ? beforeContent.split(search).join(replace)
      : beforeContent.replace(search, replace);

    fs.writeFileSync(resolvedPath, afterContent, 'utf8');
    return {
      ok: true,
      path: resolvedPath,
      replacements: replaceAll ? occurrences : 1,
      beforeContent,
      afterContent,
    };
  }

  function deleteItem(payload = {}) {
    const itemError = requireString(payload.itemPath, 'No path provided to delete.');
    if (itemError) return itemError;
    const resolvedPath = resolveDirectory(payload.itemPath, payload.cwd ?? fallbackDirectory);
    const protectedReason = protectedDeleteReason(resolvedPath);
    if (protectedReason) return { ok: false, error: protectedReason };
    if (!fs.existsSync(resolvedPath)) return { ok: false, error: 'Path does not exist.' };

    let beforeContent = '';
    let kind = 'other';
    try {
      const stat = fs.statSync(resolvedPath);
      if (stat.isFile()) {
        kind = 'file';
        if (stat.size <= MAX_FILE_SIZE) {
          beforeContent = fs.readFileSync(resolvedPath, 'utf8');
        }
      } else if (stat.isDirectory()) {
        kind = 'directory';
      }
    } catch {
      // Ignore pre-delete snapshot failures.
    }

    fs.rmSync(resolvedPath, { recursive: true, force: true });
    return { ok: true, path: resolvedPath, kind, beforeContent, afterContent: '' };
  }

  return {
    readTextFile,
    listDirectory,
    searchWorkspace,
    inspectWorkspace,
    writeFile,
    applyFilePatch,
    deleteItem,
  };
}
