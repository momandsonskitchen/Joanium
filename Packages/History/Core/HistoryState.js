import { createHash } from 'node:crypto';
import path from 'node:path';
import { mkdir, readdir, unlink } from 'node:fs/promises';
import { sanitizeFileStem } from '../../Shared/Storage/SafePath.js';
import { getWritableDataDirectory } from '../../Shared/Storage/ResourcePaths.js';
import { createSingleFileState } from '../../Shared/Storage/SingleFileState.js';
import { createUniqueId } from '../../Shared/Utils/StringUtils.js';

// ---------------------------------------------------------------------------
// createHistoryStateManager
//
// Manages reading and writing chat session JSON files under:
//   Data/Chats/                        (global sessions)
//   Data/Projects/<projectId>/Chats/   (project-scoped sessions)
// ---------------------------------------------------------------------------

export function createHistoryStateManager({ rootDirectory }) {
  const dataDirectory = getWritableDataDirectory(rootDirectory);
  const chatsDirectory = path.join(dataDirectory, 'Chats');
  const projectsDirectory = path.join(dataDirectory, 'Projects');

  function getChatsDirectory(projectId) {
    if (!projectId) return chatsDirectory;
    return path.join(projectsDirectory, sanitizeFileStem(projectId), 'Chats');
  }

  function getSessionFilePath(id, projectId) {
    const safeId = sanitizeFileStem(id);
    if (!safeId) throw new Error('A valid session id is required.');
    return path.join(getChatsDirectory(projectId), `${safeId}.json`);
  }

  function buildMemoryFingerprint(messages = []) {
    const userTurns = (Array.isArray(messages) ? messages : [])
      .filter((message) => message?.role === 'user')
      .map((message) => ({
        content: String(message.content ?? message.modelContent ?? '').trim(),
        attachments: Array.isArray(message.attachments)
          ? message.attachments
              .map((attachment) => attachment?.name ?? attachment?.filename ?? attachment?.kind)
              .filter(Boolean)
          : [],
      }))
      .filter((message) => message.content || message.attachments.length > 0);

    if (userTurns.length === 0) return '';
    return createHash('sha256').update(JSON.stringify(userTurns)).digest('hex');
  }

  function withPersonalMemoryState(record, existing = null) {
    const fingerprint = buildMemoryFingerprint(record.messages);
    const syncedFingerprint = existing?.personalMemorySyncedFingerprint ?? null;
    const alreadySynced = Boolean(fingerprint && syncedFingerprint === fingerprint);

    return {
      ...record,
      personalMemoryFingerprint: fingerprint || null,
      personalMemoryPending: Boolean(fingerprint && !alreadySynced),
      personalMemorySyncedAt: alreadySynced ? (existing?.personalMemorySyncedAt ?? null) : null,
      personalMemorySyncedFingerprint: alreadySynced ? syncedFingerprint : null,
    };
  }

  async function readSessionFile(filePath) {
    const fileState = createSingleFileState(filePath, {});
    return fileState.read();
  }

  async function readExistingSession(filePath) {
    try {
      return await readSessionFile(filePath);
    } catch {
      return null;
    }
  }

  async function saveSession(session) {
    if (!session?.id) return null;
    const safeId = sanitizeFileStem(session.id);
    if (!safeId) return null;

    const targetDir = getChatsDirectory(session.projectId);
    await mkdir(targetDir, { recursive: true });
    const filePath = path.join(targetDir, `${safeId}.json`);
    const existing = await readExistingSession(filePath);

    // Preserve metadata that saveCurrentSession in ChatApp never sends:
    //   • fork provenance (forkedFromId/forkedFromTitle) — a fork badge would
    //     disappear on the first auto-save after opening the fork.
    //   • pinned — pinning is managed independently; auto-saves must not wipe it.
    const forkedFromId = session.forkedFromId ?? existing?.forkedFromId ?? null;
    const forkedFromTitle = session.forkedFromTitle ?? existing?.forkedFromTitle ?? null;
    // Only carry the existing pinned state when the incoming payload omits it.
    const pinned = session.pinned !== undefined ? session.pinned : (existing?.pinned ?? false);
    // When the renderer omits updatedAt (e.g. star-only saves that set
    // bumpUpdatedAt:false), fall back to whatever is already on disk so the
    // session keeps its original timestamp and stays in the correct date group.
    const updatedAt = session.updatedAt ?? existing?.updatedAt ?? null;

    const merged = {
      ...session,
      id: safeId,
      pinned,
      ...(updatedAt != null ? { updatedAt } : {}),
      ...(forkedFromId != null ? { forkedFromId } : {}),
      ...(forkedFromTitle != null ? { forkedFromTitle } : {}),
    };

    const record = withPersonalMemoryState(merged, existing);
    const fileState = createSingleFileState(filePath, {});
    await fileState.write(record);
    return record;
  }

  async function listSessions(projectId) {
    const targetDir = getChatsDirectory(projectId);
    let files;
    try {
      files = await readdir(targetDir);
    } catch {
      return [];
    }

    const sessions = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const session = await readSessionFile(path.join(targetDir, file));
        sessions.push({
          id: session.id,
          title: session.title,
          pinned: session.pinned ?? false,
          personalMemoryPending: Boolean(session.personalMemoryPending),
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          messageCount: Array.isArray(session.messages) ? session.messages.length : 0,
          forkedFromId: session.forkedFromId ?? null,
          forkedFromTitle: session.forkedFromTitle ?? null,
        });
      } catch {
        // Skip corrupt or unreadable files silently
      }
    }

    // ── Live-sync fork provenance ────────────────────────────────────────
    // Build a quick id→title map from the sessions we just loaded so that
    // the "forked from" badge always reflects the source's current title,
    // and so we can detect when the source no longer exists.
    const titleById = new Map(sessions.map((s) => [s.id, s.title ?? null]));

    for (const session of sessions) {
      if (!session.forkedFromId) continue;

      if (!titleById.has(session.forkedFromId)) {
        // Source was deleted — clear the dead reference so the badge
        // disappears rather than showing a broken link.
        session.forkedFromId = null;
        session.forkedFromTitle = null;
        // Persist the cleared state so future list calls are clean.
        void (async () => {
          try {
            const filePath = getSessionFilePath(session.id, projectId);
            const record = await readSessionFile(filePath);
            record.forkedFromId = null;
            record.forkedFromTitle = null;
            const fileState = createSingleFileState(filePath, {});
            await fileState.write(record);
          } catch {
            // Best-effort — ignore write failures.
          }
        })();
      } else {
        // Source exists — always show its latest title (handles renames).
        session.forkedFromTitle = titleById.get(session.forkedFromId) ?? null;
      }
    }

    return sessions.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }

  async function loadSession(id, projectId) {
    return readSessionFile(getSessionFilePath(id, projectId));
  }

  async function deleteSession(id, projectId) {
    await unlink(getSessionFilePath(id, projectId));
  }

  async function deleteAllSessions(projectId) {
    const targetDir = getChatsDirectory(projectId);
    let files;
    try {
      files = await readdir(targetDir);
    } catch {
      return;
    }
    await Promise.all(
      files
        .filter((f) => f.endsWith('.json'))
        .map((f) => unlink(path.join(targetDir, f)).catch(() => {})),
    );
  }

  async function renameSession(id, newTitle, projectId) {
    const filePath = getSessionFilePath(id, projectId);
    const session = await readSessionFile(filePath);
    session.title = String(newTitle).trim() || session.title;
    session.updatedAt = new Date().toISOString();
    const fileState = createSingleFileState(filePath, {});
    await fileState.write(session);
    return session;
  }

  async function pinSession(id, pinned, projectId) {
    const filePath = getSessionFilePath(id, projectId);
    const session = await readSessionFile(filePath);
    session.pinned = Boolean(pinned);
    const fileState = createSingleFileState(filePath, {});
    await fileState.write(session);
    return session;
  }

  async function collectSessionFiles() {
    const files = [];

    try {
      const entries = await readdir(chatsDirectory, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          files.push({ filePath: path.join(chatsDirectory, entry.name), projectId: null });
        }
      }
    } catch {
      // No global chat directory yet.
    }

    try {
      const projects = await readdir(projectsDirectory, { withFileTypes: true });
      for (const project of projects) {
        if (!project.isDirectory()) continue;
        const projectId = project.name;
        const projectChatsDir = path.join(projectsDirectory, projectId, 'Chats');
        const entries = await readdir(projectChatsDir, { withFileTypes: true }).catch(() => []);
        for (const entry of entries) {
          if (entry.isFile() && entry.name.endsWith('.json')) {
            files.push({ filePath: path.join(projectChatsDir, entry.name), projectId });
          }
        }
      }
    } catch {
      // No project chat directory yet.
    }

    return files;
  }

  async function listPendingMemorySessions({ limit = 8 } = {}) {
    const max = Math.min(Math.max(Number(limit) || 8, 1), 25);
    const sessions = [];

    for (const { filePath, projectId } of await collectSessionFiles()) {
      try {
        const session = await readSessionFile(filePath);
        if (!session.personalMemoryPending) continue;
        sessions.push({ ...session, projectId: session.projectId ?? projectId ?? null });
      } catch {
        // Skip corrupt sessions.
      }
    }

    return sessions
      .sort((left, right) => new Date(right.updatedAt ?? 0) - new Date(left.updatedAt ?? 0))
      .slice(0, max);
  }

  async function markMemorySynced(id, { projectId = null, fingerprint = null } = {}) {
    const filePath = getSessionFilePath(id, projectId);
    const session = await readSessionFile(filePath);
    const nextFingerprint = fingerprint || session.personalMemoryFingerprint || null;

    session.personalMemoryPending = false;
    session.personalMemorySyncedAt = new Date().toISOString();
    session.personalMemorySyncedFingerprint = nextFingerprint;
    const fileState = createSingleFileState(filePath, {});
    await fileState.write(session);
    return session;
  }

  // ---------------------------------------------------------------------------
  // forkSession
  //
  // Creates a new session that is an exact replica of `id` up to (and
  // including) message at `upToMessageIndex`.  The fork carries metadata
  // linking it back to the original session so the History panel can display
  // the "forked from" badge.
  //
  // Returns the newly-created session record.
  // ---------------------------------------------------------------------------
  async function forkSession(id, upToMessageIndex, projectId) {
    const source = await readSessionFile(getSessionFilePath(id, projectId));

    const allMessages = Array.isArray(source.messages) ? source.messages : [];
    const clampedIndex =
      upToMessageIndex == null
        ? allMessages.length
        : Math.min(Math.max(Number(upToMessageIndex) + 1, 0), allMessages.length);

    const forkedMessages = allMessages.slice(0, clampedIndex);
    const now = new Date().toISOString();
    const newId = `fork-${createUniqueId()}`;

    const forked = {
      ...source,
      id: newId,
      title: source.title || 'Forked conversation',
      messages: forkedMessages,
      createdAt: now,
      updatedAt: now,
      pinned: false,
      // Fork provenance — links back to the source session
      forkedFromId: source.id,
      forkedFromTitle: source.title ?? null,
      // Reset memory-sync state so the fork is evaluated independently
      personalMemoryPending: false,
      personalMemoryFingerprint: null,
      personalMemorySyncedAt: null,
      personalMemorySyncedFingerprint: null,
    };

    return saveSession(forked);
  }

  return {
    saveSession,
    listSessions,
    loadSession,
    deleteSession,
    deleteAllSessions,
    renameSession,
    pinSession,
    listPendingMemorySessions,
    markMemorySynced,
    forkSession,
  };
}
