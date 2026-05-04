import path from 'node:path';
import { mkdir, readFile, writeFile, readdir, unlink, rm, copyFile } from 'node:fs/promises';

// ---------------------------------------------------------------------------
// ProjectState — CRUD for user projects.
// Projects are stored under Data/Projects/<id>/Index.json.
// Each project folder also contains a Chats/ subdirectory for sessions.
// ---------------------------------------------------------------------------

export function createProjectStateManager({ rootDirectory }) {
  const projectsDirectory = path.join(rootDirectory, 'Data', 'Projects');

  return {
    async saveProject(project) {
      if (!project?.id) return null;
      const projectDir = path.join(projectsDirectory, project.id);
      await mkdir(path.join(projectDir, 'Chats'), { recursive: true });

      // Handle cover image copying — move external images into the project folder
      if (project.coverImagePath) {
        const isExternal = !project.coverImagePath.startsWith(projectDir);
        if (isExternal) {
          try {
            const ext = path.extname(project.coverImagePath) || '.png';
            const targetPath = path.join(projectDir, `cover${ext}`);
            await copyFile(project.coverImagePath, targetPath);
            project.coverImagePath = targetPath;
          } catch (err) {
            console.error('[Joanium] Failed to copy project cover:', err);
          }
        }
      }

      // If we have a cover image, the icon is redundant.
      if (project.coverImagePath) {
        delete project.icon;
      }

      const filePath = path.join(projectDir, 'Index.json');
      await writeFile(filePath, `${JSON.stringify(project, null, 2)}\n`, 'utf8');
      return project;
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
            id:             project.id,
            name:           project.name,
            icon:           project.icon || '📁',
            info:           project.info ?? '',
            coverImagePath: project.coverImagePath ?? '',
            createdAt:      project.createdAt,
            updatedAt:      project.updatedAt
          });
        } catch {
          // Skip corrupt files silently
        }
      }

      return projects.sort(
        (a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0) - new Date(a.updatedAt ?? a.createdAt ?? 0)
      );
    },

    async loadProject(id) {
      const safeId = String(id).replace(/[^a-zA-Z0-9_\-]/g, '');
      const newPath = path.join(projectsDirectory, safeId, 'Index.json');
      try {
        const raw = await readFile(newPath, 'utf8');
        return JSON.parse(raw);
      } catch {
        // Fallback for legacy flat-file projects
        const oldPath = path.join(projectsDirectory, `${safeId}.json`);
        const raw = await readFile(oldPath, 'utf8');
        return JSON.parse(raw);
      }
    },

    async deleteProject(id) {
      const safeId = String(id).replace(/[^a-zA-Z0-9_\-]/g, '');
      const dirPath = path.join(projectsDirectory, safeId);
      try {
        await rm(dirPath, { recursive: true, force: true });
      } catch {
        // Might be an old file-based project
        const filePath = path.join(projectsDirectory, `${safeId}.json`);
        await unlink(filePath).catch(() => {});
      }
    }
  };
}
