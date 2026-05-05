import path from 'node:path';
import { mkdir, readFile, writeFile, readdir, unlink, rm, copyFile } from 'node:fs/promises';
import { sanitizeFileStem } from '../../Shared/Storage/SafePath.js';

export function createProjectStateManager({ rootDirectory }) {
  const projectsDirectory = path.join(rootDirectory, 'Data', 'Projects');

  return {
    async saveProject(project) {
      if (!project?.id) return null;
      const safeId = sanitizeFileStem(project.id);
      if (!safeId) return null;

      const record = { ...project, id: safeId };
      const projectDir = path.join(projectsDirectory, safeId);
      await mkdir(path.join(projectDir, 'Chats'), { recursive: true });

      if (record.coverImagePath) {
        const resolvedProjectDir = path.resolve(projectDir).toLowerCase();
        const resolvedCoverPath = path.resolve(record.coverImagePath).toLowerCase();
        const projectDirPrefix = `${resolvedProjectDir}${path.sep}`;
        const isExternal = resolvedCoverPath !== resolvedProjectDir
          && !resolvedCoverPath.startsWith(projectDirPrefix);

        if (isExternal) {
          try {
            const ext = path.extname(record.coverImagePath) || '.png';
            const targetPath = path.join(projectDir, `cover${ext}`);
            await copyFile(record.coverImagePath, targetPath);
            record.coverImagePath = targetPath;
          } catch (err) {
            console.error('[Joanium] Failed to copy project cover:', err);
          }
        }
      }

      if (record.coverImagePath) {
        delete record.icon;
      }

      const filePath = path.join(projectDir, 'Index.json');
      await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
      return record;
    },

    async listProjects() {
      let entries;
      try {
        entries = await readdir(projectsDirectory, { withFileTypes: true });
      } catch {
        return [];
      }

      const projects = [];

      for (const entry of entries) {
        let projectPath;
        if (entry.isDirectory()) {
          projectPath = path.join(projectsDirectory, entry.name, 'Index.json');
        } else if (entry.name.endsWith('.json')) {
          projectPath = path.join(projectsDirectory, entry.name);
        } else {
          continue;
        }

        try {
          const raw = await readFile(projectPath, 'utf8');
          const project = JSON.parse(raw);
          projects.push({
            id: project.id,
            name: project.name,
            icon: project.icon || '',
            info: project.info ?? '',
            coverImagePath: project.coverImagePath ?? '',
            createdAt: project.createdAt,
            updatedAt: project.updatedAt
          });
        } catch {
          // Skip corrupt files silently.
        }
      }

      return projects.sort(
        (a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0) - new Date(a.updatedAt ?? a.createdAt ?? 0)
      );
    },

    async loadProject(id) {
      const safeId = sanitizeFileStem(id);
      if (!safeId) throw new Error('A valid project id is required.');
      const newPath = path.join(projectsDirectory, safeId, 'Index.json');
      try {
        const raw = await readFile(newPath, 'utf8');
        return JSON.parse(raw);
      } catch {
        const oldPath = path.join(projectsDirectory, `${safeId}.json`);
        const raw = await readFile(oldPath, 'utf8');
        return JSON.parse(raw);
      }
    },

    async deleteProject(id) {
      const safeId = sanitizeFileStem(id);
      if (!safeId) throw new Error('A valid project id is required.');
      const dirPath = path.join(projectsDirectory, safeId);
      try {
        await rm(dirPath, { recursive: true, force: true });
      } catch {
        const filePath = path.join(projectsDirectory, `${safeId}.json`);
        await unlink(filePath).catch(() => {});
      }
    }
  };
}
