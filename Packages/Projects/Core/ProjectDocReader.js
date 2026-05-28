import path from 'node:path';
import { readFile, readdir } from 'node:fs/promises';

// ---------------------------------------------------------------------------
// ProjectDocReader
//
// When a project is open, automatically injects the contents of key doc files
// from the project's folder into the system prompt. This gives the AI full
// context about the project without the user having to manually attach files.
//
// Files injected (matched case-insensitively):
//   readme.md   — project overview and usage
//   agents.md   — agent definitions and behaviours
//   claude.md   — Claude-specific instructions
//   gemini.md   — Gemini-specific instructions
//   design.md   — design decisions and architecture notes
// ---------------------------------------------------------------------------

const PROJECT_DOC_FILES = ['readme.md', 'agents.md', 'claude.md', 'gemini.md', 'design.md'];

/**
 * Reads available project doc files from the given folder.
 *
 * @param {string} folderPath  Absolute path to the project's root folder.
 * @returns {Promise<Array<{ file: string, content: string }>>}
 *   Resolves to an array of { file, content } for each doc file that exists
 *   and is non-empty, preserving the canonical order of PROJECT_DOC_FILES.
 */
export async function readProjectDocs(folderPath) {
  const normalized = String(folderPath ?? '').trim();
  if (!normalized) return [];

  // Build a case-insensitive map of actual filenames in the folder so we can
  // find docs regardless of how the user capitalised their filenames.
  let actualNames;
  try {
    const entries = await readdir(normalized);
    actualNames = new Map(entries.map((name) => [name.toLowerCase(), name]));
  } catch {
    // Folder doesn't exist or isn't readable — skip silently.
    return [];
  }

  const results = [];

  for (const docFile of PROJECT_DOC_FILES) {
    const actualName = actualNames.get(docFile);
    if (!actualName) continue;

    const filePath = path.join(normalized, actualName);
    try {
      const raw = await readFile(filePath, 'utf8');
      const content = raw.trim();
      if (content) {
        results.push({ file: actualName, content });
      }
    } catch {
      // File disappeared between readdir and readFile — skip.
    }
  }

  return results;
}

/**
 * Formats the doc files into a prompt section ready to be injected into the
 * system prompt as part of the project context.
 *
 * Each file is presented with an explicit label so the AI knows exactly which
 * file it read and won't re-read it if the user asks about it later. A summary
 * header listing all pre-loaded files is included at the top so the AI can
 * confidently tell the user "I already have README.md" and avoid context bloat.
 *
 * @param {Array<{ file: string, content: string }>} docs
 * @returns {string}  The formatted prompt section, or '' if no docs found.
 */
export function formatProjectDocsPrompt(docs) {
  if (!docs?.length) return '';

  const fileList = docs.map(({ file }) => `- ${file}`).join('\n');

  const sections = docs
    .map(
      ({ file, content }) =>
        `### File: ${file}\n` +
        `<!-- pre-loaded by Joanium — do NOT read this file again from disk -->\n\n` +
        content,
    )
    .join('\n\n---\n\n');

  return (
    `## Project Documentation (pre-loaded)\n\n` +
    `The following files have already been read from the project folder and are ` +
    `included below in full. Do NOT read them again from disk — use the content ` +
    `provided here instead.\n\n` +
    `Files loaded:\n${fileList}\n\n` +
    `---\n\n` +
    sections
  );
}
