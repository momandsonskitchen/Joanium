import path from 'node:path';
import { mkdir, readdir, unlink, rm, copyFile } from 'node:fs/promises';
import { sanitizeFileStem } from '../../Shared/Storage/SafePath.js';
import { getWritableDataDirectory } from '../../Shared/Storage/ResourcePaths.js';
import { createSingleFileState } from '../../Shared/Storage/SingleFileState.js';
import { sortByDate } from '../../Shared/Utils/DateUtils.js';

export function createProjectStateManager({ rootDirectory }) {
  const projectsDirectory = path.join(getWritableDataDirectory(rootDirectory), 'Projects');

  return {
    async saveProject(project) {
      if (!project?.id) return null;
      const safeId = sanitizeFileStem(project.id);
      if (!safeId) return null;

      const folderPath = String(project.folderPath ?? project.rootPath ?? '').trim();
      const record = {
        ...project,
        id: safeId,
        folderPath,
        rootPath: folderPath,
      };
      const projectDir = path.join(projectsDirectory, safeId);
      await mkdir(path.join(projectDir, 'Chats'), { recursive: true });

      if (record.coverImagePath) {
        const resolvedProjectDir = path.resolve(projectDir).toLowerCase();
        const resolvedCoverPath = path.resolve(record.coverImagePath).toLowerCase();
        const projectDirPrefix = `${resolvedProjectDir}${path.sep}`;
        const isExternal =
          resolvedCoverPath !== resolvedProjectDir &&
          !resolvedCoverPath.startsWith(projectDirPrefix);

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
      const fileState = createSingleFileState(filePath, {});
      await fileState.write(record);
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
          const fileState = createSingleFileState(projectPath, {});
          const project = await fileState.read();
          projects.push({
            id: project.id,
            name: project.name,
            icon: project.icon || '',
            info: project.info ?? '',
            folderPath: project.folderPath ?? project.rootPath ?? '',
            rootPath: project.rootPath ?? project.folderPath ?? '',
            coverImagePath: project.coverImagePath ?? '',
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          });
        } catch {
          // Skip corrupt files silently.
        }
      }

      return sortByDate(projects, 'updatedAt', 'createdAt');
    },

    async loadProject(id) {
      const safeId = sanitizeFileStem(id);
      if (!safeId) throw new Error('A valid project id is required.');
      const newPath = path.join(projectsDirectory, safeId, 'Index.json');
      try {
        const fileState = createSingleFileState(newPath, {});
        return fileState.read();
      } catch {
        const oldPath = path.join(projectsDirectory, `${safeId}.json`);
        const fileState = createSingleFileState(oldPath, {});
        return fileState.read();
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
    },
  };
}
