import fs from 'node:fs';
import path from 'node:path';
import {
  MAX_FILE_SIZE,
  inspectWorkspaceSummary,
  isPathInsideDirectory,
  isProbablyTextFile,
  normalizeBool,
  protectedDeleteReason,
  requireString,
  resolveDirectory,
  walkWorkspaceFiles,
} from '../../../Utils/WorkspaceUtils.js';
import strings from '../I18n/en.js';

export function createDirectoryService({ rootDirectory }) {
  const fallbackDirectory = rootDirectory || process.cwd();

  function requireProjectScopedPath(resolvedPath, payload = {}) {
    if (!normalizeBool(payload.enforceProjectRoot)) return null;

    const projectRoot = String(payload.projectRoot ?? '').trim();
    if (!projectRoot) {
      return { ok: false, error: strings.errors.projectRequired };
    }

    const resolvedProjectRoot = resolveDirectory(projectRoot, fallbackDirectory);
    if (!isPathInsideDirectory(resolvedPath, resolvedProjectRoot)) {
      return { ok: false, error: strings.errors.outsideProject };
    }

    return null;
  }

  function readTextFile(payload = {}) {
    const fileError = requireString(payload.filePath, 'No file path provided.');
    if (fileError) return fileError;

    const resolvedPath = resolveDirectory(payload.filePath, payload.cwd ?? fallbackDirectory);
    if (!fs.existsSync(resolvedPath)) {
      return { ok: false, error: `File not found: "${resolvedPath}"` };
    }
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
        // statSync + readFileSync are two separate path lookups, which CodeQL
        // flags as a js/file-system-race (TOCTOU). In this context the pattern
        // is intentional and safe: this is a read-only workspace scan over the
        // user's own files, walkWorkspaceFiles already skips symlinks, and the
        // MAX_FILE_SIZE guard is a memory safeguard, not a security boundary.
        // No privileged action is taken between the check and the read, so
        // there is nothing meaningful for an attacker to race against.
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
    const projectError = requireProjectScopedPath(resolvedPath, payload);
    if (projectError) return projectError;

    const append = normalizeBool(payload.append);
    const content = payload.content ?? '';

    // --- Snapshot the existing content via a stable fd (avoids TOCTOU) --------
    let beforeContent = '';
    let existed = false;
    let readFd = null;
    try {
      readFd = fs.openSync(resolvedPath, 'r');
      existed = true;
      const stat = fs.fstatSync(readFd);
      if (stat.isFile()) {
        const buf = Buffer.alloc(stat.size);
        fs.readSync(readFd, buf, 0, stat.size, 0);
        beforeContent = buf.toString('utf8');
      }
    } catch {
      // File does not exist yet — beforeContent stays ''
    } finally {
      if (readFd !== null) fs.closeSync(readFd);
    }

    // --- Write via fd so the open + write are the same file reference ----------
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    // 'a' = append/create; 'w' = truncate/create — both avoid a separate existsSync
    const writeFd = fs.openSync(resolvedPath, append ? 'a' : 'w');
    try {
      fs.writeSync(writeFd, content, null, 'utf8');
    } finally {
      fs.closeSync(writeFd);
    }

    // --- Read back the result via a fresh fd -----------------------------------
    // A separate open is required here because 'w'/'a' write descriptors are not
    // readable. This openSync is not preceded by any path-based check, so there
    // is no check-then-act window — the open itself is the single path lookup,
    // and every subsequent call (fstatSync, readSync) operates on the returned
    // fd. CodeQL js/file-system-race flags this as a false positive because it
    // sees an earlier openSync on the same path in the same function, but that
    // pattern is the recommended fd-first fix, not a TOCTOU vulnerability.
    let afterContent = '';
    const verifyFd = fs.openSync(resolvedPath, 'r');
    try {
      const stat = fs.fstatSync(verifyFd);
      const buf = Buffer.alloc(stat.size);
      fs.readSync(verifyFd, buf, 0, stat.size, 0);
      afterContent = buf.toString('utf8');
    } finally {
      fs.closeSync(verifyFd);
    }

    return {
      ok: true,
      path: resolvedPath,
      bytes: Buffer.byteLength(content, 'utf8'),
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
    const projectError = requireProjectScopedPath(resolvedPath, payload);
    if (projectError) return projectError;

    let fd = null;
    let beforeContent = '';
    try {
      fd = fs.openSync(resolvedPath, 'r+');
      const stat = fs.fstatSync(fd);
      if (!stat.isFile()) {
        return { ok: false, error: `"${resolvedPath}" is not a file.` };
      }
      const buf = Buffer.alloc(stat.size);
      fs.readSync(fd, buf, 0, stat.size, 0);
      beforeContent = buf.toString('utf8');
    } catch {
      return { ok: false, error: `"${resolvedPath}" is not a file.` };
    }

    const search = String(payload.search);
    const replace = String(payload.replace);
    const replaceAll = normalizeBool(payload.replaceAll ?? payload.replace_all);
    const occurrences = beforeContent.split(search).length - 1;

    if (occurrences <= 0) {
      if (fd !== null) fs.closeSync(fd);
      return { ok: false, error: 'Search text was not found in the file.' };
    }

    const afterContent = replaceAll
      ? beforeContent.split(search).join(replace)
      : beforeContent.replace(search, replace);

    try {
      fs.ftruncateSync(fd, 0);
      fs.writeSync(fd, afterContent, 0, 'utf8');
    } finally {
      if (fd !== null) fs.closeSync(fd);
    }
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
    const projectError = requireProjectScopedPath(resolvedPath, payload);
    if (projectError) return projectError;

    const protectedReason = protectedDeleteReason(resolvedPath);
    if (protectedReason) return { ok: false, error: protectedReason };

    let beforeContent = '';
    let kind = 'other';
    let fd = null;
    try {
      // Open by path once to get a stable file descriptor, then use only
      // fd-based calls (fstatSync / readSync) to avoid TOCTOU race conditions.
      fd = fs.openSync(resolvedPath, 'r');
    } catch {
      return { ok: false, error: 'Path does not exist.' };
    }
    try {
      const stat = fs.fstatSync(fd);
      if (stat.isFile()) {
        kind = 'file';
        if (stat.size <= MAX_FILE_SIZE) {
          const buf = Buffer.alloc(stat.size);
          fs.readSync(fd, buf, 0, stat.size, 0);
          beforeContent = buf.toString('utf8');
        }
      } else if (stat.isDirectory()) {
        kind = 'directory';
      }
    } catch {
      // Ignore pre-delete snapshot failures.
    } finally {
      fs.closeSync(fd);
    }

    fs.rmSync(resolvedPath, { recursive: true, force: true });
    return { ok: true, path: resolvedPath, kind, beforeContent, afterContent: '' };
  }

  function createDirectory(payload = {}) {
    const dirError = requireString(payload.path, 'No directory path provided.');
    if (dirError) return dirError;
    const resolvedPath = resolveDirectory(payload.path, payload.cwd ?? fallbackDirectory);
    const projectError = requireProjectScopedPath(resolvedPath, payload);
    if (projectError) return projectError;

    const existed = fs.existsSync(resolvedPath);
    fs.mkdirSync(resolvedPath, { recursive: true });
    return { ok: true, path: resolvedPath, created: !existed };
  }

  function resolveTransferPaths(payload = {}) {
    const srcError = requireString(payload.source ?? payload.src, 'No source path provided.');
    if (srcError) return srcError;
    const destError = requireString(
      payload.destination ?? payload.dest,
      'No destination path provided.',
    );
    if (destError) return destError;
    const resolvedSrc = resolveDirectory(
      payload.source ?? payload.src,
      payload.cwd ?? fallbackDirectory,
    );
    const resolvedDest = resolveDirectory(
      payload.destination ?? payload.dest,
      payload.cwd ?? fallbackDirectory,
    );
    const srcProjectError = requireProjectScopedPath(resolvedSrc, payload);
    if (srcProjectError) return srcProjectError;
    const destProjectError = requireProjectScopedPath(resolvedDest, payload);
    if (destProjectError) return destProjectError;

    if (!fs.existsSync(resolvedSrc))
      return { ok: false, error: `Source path does not exist: ${resolvedSrc}` };

    return { ok: true, source: resolvedSrc, destination: resolvedDest };
  }

  function moveLocalFile(payload = {}) {
    const transfer = resolveTransferPaths(payload);
    if (!transfer.ok) return transfer;
    const { source, destination } = transfer;

    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.renameSync(source, destination);
    return { ok: true, source, destination };
  }

  function copyLocalFile(payload = {}) {
    const transfer = resolveTransferPaths(payload);
    if (!transfer.ok) return transfer;
    const { source, destination } = transfer;
    const stat = fs.statSync(source);
    if (!stat.isFile())
      return { ok: false, error: 'copy_local_file only supports files, not directories.' };
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    return { ok: true, source, destination, bytes: stat.size };
  }

  return {
    readTextFile,
    listDirectory,
    searchWorkspace,
    inspectWorkspace,
    writeFile,
    applyFilePatch,
    deleteItem,
    createDirectory,
    moveLocalFile,
    copyLocalFile,
  };
}
