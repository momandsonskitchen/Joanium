import path from 'node:path';
import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { sanitizeMarkdownFilename } from '../../Shared/Storage/SafePath.js';
import { getWritableDataDirectory } from '../../Shared/Storage/ResourcePaths.js';

const HIDDEN_PREFIXES = ['Archive-', 'Old-', '_'];
const DEFAULT_MAX_CONTEXT_CHARS = 24000;

const DEFAULT_MEMORY_FILES = [
  [
    'Memory.md',
    'Memory',
    'Important facts, reminders, and notes the user has explicitly asked to remember long-term.',
  ],
  ['User.md', 'User Profile', 'Core identity details about the user.'],
  ['Likes.md', 'Likes', 'Things the user enjoys, prefers, or feels positively about.'],
  ['Dislikes.md', 'Dislikes', 'Things the user dislikes, avoids, or finds frustrating.'],
  ['Family.md', 'Family', 'Family members, relationships, and relevant personal context.'],
  ['Friends.md', 'Friends', 'Close friends, social circle, and relationship context.'],
  ['Relationships.md', 'Relationships', 'Romantic or significant personal relationships.'],
  ['Education.md', 'Education', 'Education background, courses, degrees, and learning style.'],
  ['Career.md', 'Career', 'Professional life, work history, skills, and career situations.'],
  ['Goals.md', 'Goals', 'Short-term and long-term goals the user is working toward.'],
  ['Health.md', 'Health', 'Health information the user has chosen to share.'],
  [
    'Wellbeing.md',
    'Wellbeing',
    'Mental and emotional state, stress patterns, and coping preferences.',
  ],
  ['Support.md', 'Support', 'How the user prefers to be supported during difficult moments.'],
  [
    'Communication.md',
    'Communication',
    'Preferred tone, response length, directness, and communication style.',
  ],
  ['Values.md', 'Values', 'Core beliefs, principles, and what matters most to the user.'],
  [
    'Habits.md',
    'Habits',
    'Daily routines, recurring behaviors, and habits being built or changed.',
  ],
  ['Wishlist.md', 'Wishlist', 'Things the user wants to buy, experience, or receive.'],
  [
    'Routines.md',
    'Daily Routines',
    'The user daily rhythm, rituals, meals, and schedule patterns.',
  ],
  ['Fashion.md', 'Fashion & Style', 'Style, clothing preferences, brands, and aesthetics.'],
  [
    'Learning.md',
    'Learning & Development',
    'Skills, books, courses, and topics the user is learning.',
  ],
  [
    'Meetings.md',
    'Meetings & Commitments',
    'Recurring meetings, deadlines, and important commitments.',
  ],
  [
    'WorkChallenges.md',
    'Work Challenges',
    'Recurring work difficulties, blockers, and professional stressors.',
  ],
  ['WorkStyle.md', 'Work Style', 'How the user works best and what environments help them focus.'],
  [
    'ImportantDates.md',
    'Important Dates',
    'Birthdays, anniversaries, deadlines, and recurring dates.',
  ],
  [
    'Finance.md',
    'Finance',
    'Money goals, spending habits, income context, and financial concerns.',
  ],
  [
    'Astrology.md',
    'Astrology',
    'Astrological details and how much the user engages with astrology.',
  ],
  ['Workspace.md', 'Workspace', 'Physical and digital work setup, devices, apps, and preferences.'],
  [
    'Personality.md',
    'Personality',
    'Personality traits, self-perception, and common behavior patterns.',
  ],
  ['Pets.md', 'Pets', 'Pets, names, ages, and their role in the user life.'],
  ['Travel.md', 'Travel', 'Travel history, upcoming trips, dream destinations, and travel style.'],
  [
    'Entertainment.md',
    'Entertainment',
    'Movies, shows, books, podcasts, games, music, and artists.',
  ],
  ['Skills.md', 'Skills', 'Practical, professional, creative, and personal skills.'],
  ['Projects.md', 'Projects', 'Active personal or professional projects and their context.'],
  [
    'Context.md',
    'Current Context',
    'Recent events, current mood, stressors, or situational awareness.',
  ],
  ['Humor.md', 'Humor', 'The user sense of humor and humor they dislike.'],
  [
    'Food.md',
    'Food & Diet',
    'Food preferences, restrictions, favorite cuisines, and cooking habits.',
  ],
  [
    'Secrets.md',
    'Secrets & Confessions',
    'Sensitive information shared in confidence and handled carefully.',
  ],
  [
    'LivingSituation.md',
    'Living Situation',
    'Where and how the user lives and how they feel about it.',
  ],
  ['Fears.md', 'Fears & Insecurities', 'Fears, anxieties, insecurities, and recurring worries.'],
  [
    'Dreams.md',
    'Dreams & Aspirations',
    'Big-picture dreams, bucket-list items, and aspirational plans.',
  ],
  ['Struggles.md', 'Personal Struggles', 'Ongoing personal challenges and difficult situations.'],
  ['SocialLife.md', 'Social Life', 'How the user socializes and current social dynamics.'],
].map(([filename, title, description]) => ({
  filename,
  title,
  description,
  content: `# ${title}\n`,
}));

const DEFAULT_ORDER = new Map(
  DEFAULT_MEMORY_FILES.map((entry, index) => [entry.filename.toLowerCase(), index]),
);
const DEFAULT_META = new Map(
  DEFAULT_MEMORY_FILES.map((entry) => [entry.filename.toLowerCase(), entry]),
);

function isVisibleFilename(filename) {
  return /\.md$/i.test(filename) && !HIDDEN_PREFIXES.some((prefix) => filename.startsWith(prefix));
}

function normalizeFilename(filename, fallback = 'Memory.md') {
  const sanitized = sanitizeMarkdownFilename(filename || fallback);
  if (!sanitized || !isVisibleFilename(sanitized)) {
    throw new Error('A valid memory filename is required.');
  }
  return sanitized;
}

function titleFromFilename(filename) {
  return filename.replace(/\.md$/i, '').replace(/[_-]+/g, ' ').trim() || 'Memory';
}

function getMeta(filename) {
  return DEFAULT_META.get(String(filename ?? '').toLowerCase()) ?? null;
}

function stripHeading(content = '') {
  const lines = String(content).replace(/\r\n/g, '\n').split('\n');
  if (lines[0]?.trim().startsWith('#')) {
    lines.shift();
  }
  return lines.join('\n').trim();
}

function hasMeaningfulContent(content = '') {
  return Boolean(stripHeading(content));
}

function countBulletLines(content = '') {
  return String(content)
    .split('\n')
    .filter((line) => /^\s*[-*]\s+/.test(line)).length;
}

function normalizeForComparison(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function finalizeContent(content, filename) {
  const meta = getMeta(filename);
  const heading = `# ${meta?.title ?? titleFromFilename(filename)}`;
  const base =
    String(content ?? '')
      .replace(/\r\n/g, '\n')
      .trim() ||
    meta?.content ||
    heading;
  const lines = (base.startsWith('#') ? base : `${heading}\n\n${base}`).split('\n');
  const seenBullets = new Set();
  const deduped = [];
  let previousBlank = false;

  for (const line of lines) {
    const bullet = line.match(/^(\s*[-*]\s+)(.+)$/);
    if (bullet) {
      const normalized = normalizeForComparison(bullet[2]);
      if (normalized && seenBullets.has(normalized)) {
        continue;
      }
      seenBullets.add(normalized);
      deduped.push(`${bullet[1]}${bullet[2].trim()}`);
      previousBlank = false;
      continue;
    }

    const isBlank = !line.trim();
    if (isBlank && previousBlank) {
      continue;
    }
    deduped.push(line);
    previousBlank = isBlank;
  }

  return `${deduped.join('\n').trim()}\n`;
}

export function createMemoryStateManager({ rootDirectory }) {
  const memoriesDir = path.join(getWritableDataDirectory(rootDirectory), 'Memories');

  async function ensureLibrary() {
    await mkdir(memoriesDir, { recursive: true });

    await Promise.all(
      DEFAULT_MEMORY_FILES.map(async (entry) => {
        const filePath = path.join(memoriesDir, entry.filename);
        try {
          await stat(filePath);
        } catch {
          await writeFile(filePath, entry.content, 'utf8');
        }
      }),
    );
  }

  async function readMemoryFile(filename) {
    const safeFilename = normalizeFilename(filename);
    await ensureLibrary();
    const meta = getMeta(safeFilename);
    const filePath = path.join(memoriesDir, safeFilename);
    const content = await readFile(filePath, 'utf8').catch(
      () => meta?.content ?? `# ${titleFromFilename(safeFilename)}\n`,
    );
    const trimmed = content.trim();

    return {
      filename: safeFilename,
      title: meta?.title ?? titleFromFilename(safeFilename),
      description: meta?.description ?? 'Custom personal memory file.',
      content,
      empty: !hasMeaningfulContent(trimmed),
      bulletCount: countBulletLines(trimmed),
      lineCount: hasMeaningfulContent(trimmed)
        ? stripHeading(trimmed).split(/\r?\n/).filter(Boolean).length
        : 0,
    };
  }

  async function listMemories() {
    await ensureLibrary();
    const entries = await readdir(memoriesDir, { withFileTypes: true });
    const filenames = entries
      .filter((entry) => entry.isFile() && isVisibleFilename(entry.name))
      .map((entry) => entry.name);
    const uniqueFilenames = [...new Set(filenames)];
    const memories = await Promise.all(uniqueFilenames.map((filename) => readMemoryFile(filename)));

    return memories
      .map(({ content: _content, ...memory }) => memory)
      .sort((left, right) => {
        const leftOrder = DEFAULT_ORDER.get(left.filename.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder =
          DEFAULT_ORDER.get(right.filename.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
        return leftOrder - rightOrder || left.filename.localeCompare(right.filename);
      });
  }

  async function saveMemory(filename, content) {
    const safeFilename = normalizeFilename(filename);
    await ensureLibrary();
    const finalContent = finalizeContent(content, safeFilename);
    await writeFile(path.join(memoriesDir, safeFilename), finalContent, 'utf8');
    return readMemoryFile(safeFilename);
  }

  async function searchMemories(query, limit = 5) {
    const terms = normalizeForComparison(query).split(' ').filter(Boolean);
    if (terms.length === 0) return [];

    const memories = await Promise.all(
      (await listMemories()).map((entry) => readMemoryFile(entry.filename)),
    );
    return memories
      .map((memory) => {
        const header = normalizeForComparison(`${memory.filename} ${memory.title}`);
        const body = normalizeForComparison(stripHeading(memory.content));
        const matches = [];
        let score = 0;

        for (const term of terms) {
          if (header.includes(term)) score += 6;
          if (body.includes(term)) score += 5;
        }

        for (const line of memory.content.split(/\r?\n/)) {
          const normalized = normalizeForComparison(line);
          if (normalized && terms.some((term) => normalized.includes(term))) {
            matches.push(line.trim());
            score += 3;
            if (matches.length >= 3) break;
          }
        }

        return {
          filename: memory.filename,
          title: memory.title,
          description: memory.description,
          score,
          matches,
        };
      })
      .filter((entry) => entry.score > 0)
      .sort(
        (left, right) => right.score - left.score || left.filename.localeCompare(right.filename),
      )
      .slice(0, Math.min(Math.max(Number(limit) || 5, 1), 12));
  }

  async function getMemoryContext(maxChars = DEFAULT_MAX_CONTEXT_CHARS) {
    const memories = await Promise.all(
      (await listMemories()).map((entry) => readMemoryFile(entry.filename)),
    );
    const sections = memories
      .filter((memory) => !memory.empty)
      .map((memory) => {
        const body = stripHeading(memory.content);
        return body ? `## ${memory.title}\n${body}` : '';
      })
      .filter(Boolean);

    if (sections.length === 0) {
      return '';
    }

    const context = `Personal memory:\n${sections.join('\n\n')}`.trim();
    return context.length > maxChars ? context.slice(0, maxChars) : context;
  }

  async function getMemoryCatalog() {
    const memories = await Promise.all(
      (await listMemories()).map((entry) => readMemoryFile(entry.filename)),
    );
    return memories.map((memory) => ({
      filename: memory.filename,
      title: memory.title,
      description: memory.description,
      content: memory.content,
      empty: memory.empty,
    }));
  }

  async function applyMemoryUpdates(payload = {}) {
    const entries = [
      ...(Array.isArray(payload.updates) ? payload.updates : []),
      ...(Array.isArray(payload.newFiles) ? payload.newFiles : []),
    ];
    const saved = [];

    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue;
      const filename = normalizeFilename(entry.filename);
      const content = String(entry.content ?? '').trim();
      if (!content) continue;
      saved.push(await saveMemory(filename, content));
    }

    return saved.map(({ content: _content, ...memory }) => memory);
  }

  async function getExportPrompt() {
    const promptPath = path.join(rootDirectory, 'Prompts', 'ExportProfile.md');
    return readFile(promptPath, 'utf8');
  }

  async function getImportPrompt() {
    const promptPath = path.join(rootDirectory, 'Prompts', 'ImportMemory.md');
    return readFile(promptPath, 'utf8');
  }

  async function deleteMemory(filename) {
    const safeFilename = normalizeFilename(filename);
    const filePath = path.join(memoriesDir, safeFilename);
    await unlink(filePath);
  }

  return {
    listMemories,
    readMemoryFile,
    saveMemory,
    deleteMemory,
    searchMemories,
    getMemoryContext,
    getMemoryCatalog,
    applyMemoryUpdates,
    getExportPrompt,
    getImportPrompt,
  };
}
