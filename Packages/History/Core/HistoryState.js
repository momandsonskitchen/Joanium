import path from 'node:path';
import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises';

// ---------------------------------------------------------------------------
// createHistoryStateManager
//
// Manages reading and writing chat session JSON files under:
//   Data/Chats/                        (global sessions)
//   Data/Projects/<projectId>/Chats/   (project-scoped sessions)
// ---------------------------------------------------------------------------

export function createHistoryStateManager({ rootDirectory }) {
  const chatsDirectory    = path.join(rootDirectory, 'Data', 'Chats');
  const projectsDirectory = path.join(rootDirectory, 'Data', 'Projects');

  function getChatsDirectory(projectId) {
    if (!projectId) return chatsDirectory;
    return path.join(
      projectsDirectory,
      String(projectId).replace(/[^a-zA-Z0-9_\-]/g, ''),
      'Chats'
    );
  }

  async function saveSession(session) {
    if (!session?.id) return null;
    const targetDir = getChatsDirectory(session.projectId);
    await mkdir(targetDir, { recursive: true });
    const filePath = path.join(targetDir, `${session.id}.json`);
    await writeFile(filePath, `${JSON.stringify(session, null, 2)}\n`, 'utf8');
    return session;
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
        const raw     = await readFile(path.join(targetDir, file), 'utf8');
        const session = JSON.parse(raw);
        sessions.push({
          id:           session.id,
          title:        session.title,
          pinned:       session.pinned ?? false,
          createdAt:    session.createdAt,
          updatedAt:    session.updatedAt,
          messageCount: Array.isArray(session.messages) ? session.messages.length : 0
        });
      } catch {
        // Skip corrupt or unreadable files silently
      }
    }

    return sessions.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }

  async function loadSession(id, projectId) {
    const safeId    = String(id).replace(/[^a-zA-Z0-9_\-]/g, '');
    const targetDir = getChatsDirectory(projectId);
    const filePath  = path.join(targetDir, `${safeId}.json`);
    const raw       = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  }

  async function deleteSession(id, projectId) {
    const safeId    = String(id).replace(/[^a-zA-Z0-9_\-]/g, '');
    const targetDir = getChatsDirectory(projectId);
    const filePath  = path.join(targetDir, `${safeId}.json`);
    await unlink(filePath);
  }

  async function renameSession(id, newTitle, projectId) {
    const safeId    = String(id).replace(/[^a-zA-Z0-9_\-]/g, '');
    const targetDir = getChatsDirectory(projectId);
    const filePath  = path.join(targetDir, `${safeId}.json`);
    const raw       = await readFile(filePath, 'utf8');
    const session   = JSON.parse(raw);
    session.title     = String(newTitle).trim() || session.title;
    session.updatedAt = new Date().toISOString();
    await writeFile(filePath, `${JSON.stringify(session, null, 2)}\n`, 'utf8');
    return session;
  }

  async function pinSession(id, pinned, projectId) {
    const safeId    = String(id).replace(/[^a-zA-Z0-9_\-]/g, '');
    const targetDir = getChatsDirectory(projectId);
    const filePath  = path.join(targetDir, `${safeId}.json`);
    const raw       = await readFile(filePath, 'utf8');
    const session   = JSON.parse(raw);
    session.pinned  = Boolean(pinned);
    await writeFile(filePath, `${JSON.stringify(session, null, 2)}\n`, 'utf8');
    return session;
  }

  return {
    saveSession,
    listSessions,
    loadSession,
    deleteSession,
    renameSession,
    pinSession
  };
}
