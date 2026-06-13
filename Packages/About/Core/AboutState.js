import path from 'node:path';
import { readFile, readdir, mkdir, appendFile } from 'node:fs/promises';
import electron from 'electron';
import { collectSystemInfo } from './SystemInfo.js';
import { getResourceFileUrl } from '../../Shared/Storage/ResourcePaths.js';
import { readUserState, writeUserState } from '../../Shared/UserData/UserData.js';
import { escapeRegex } from '../../Shared/Utils/StringUtils.js';

const { app } = electron;

export function createAboutStateManager({ rootDirectory }) {
  return {
    async getInfo() {
      const system = await collectSystemInfo(rootDirectory);

      // app.getVersion() always returns the correct version in both dev and
      // packaged builds, unlike reading package.json which may be unavailable
      // inside the asar archive at runtime.
      const version = app.getVersion() ?? '';
      const logoPath = getResourceFileUrl(rootDirectory, 'Assets', 'Logo', 'Logo.png');

      try {
        const packageJsonStr = await readFile(path.join(rootDirectory, 'package.json'), 'utf8');
        const packageJson = JSON.parse(packageJsonStr);

        return {
          name: packageJson.name ?? 'Joanium',
          version,
          description: packageJson.description ?? '',
          author: packageJson.author ?? '',
          logoPath,
          system,
        };
      } catch {
        return {
          name: 'Joanium',
          version,
          description: '',
          author: '',
          logoPath,
          system,
        };
      }
    },

    /**
     * Parses CHANGELOG.md for the current app version's entries and checks
     * if the user has already seen this version.
     */
    async getWhatsNew() {
      const logLines = [];
      const log = (msg) => logLines.push(`[${new Date().toISOString()}] ${msg}`);

      try {
        const version = app.getVersion() ?? '';
        log(`version=${version} isPackaged=${app.isPackaged}`);
        log(`rootDirectory=${rootDirectory}`);
        if (!version) {
          log('EXIT: no version');
          await flushWhatsNewLog(logLines);
          return { shouldShow: false };
        }

        const userState = await readUserState(rootDirectory);

        // Respect the showChangelog toggle (defaults to true when absent).
        if (userState.appSettings?.showChangelog === false) {
          log('EXIT: changelog disabled in app settings');
          await flushWhatsNewLog(logLines);
          return { shouldShow: false };
        }

        log(`whatsNewSeenVersion=${userState.whatsNewSeenVersion}`);
        if (userState.whatsNewSeenVersion === version) {
          log('EXIT: already seen');
          await flushWhatsNewLog(logLines);
          return { shouldShow: false };
        }

        // Read and parse CHANGELOG.md for the current version's section
        let changelog = '';
        const changelogPath = path.join(rootDirectory, 'CHANGELOG.md');
        log(`changelogPath=${changelogPath}`);
        try {
          changelog = await readFile(changelogPath, 'utf8');
          log(`changelog read OK, length=${changelog.length}`);
        } catch (err) {
          log(`EXIT: changelog read FAILED: ${err?.message ?? err}`);
          await flushWhatsNewLog(logLines);
          return { shouldShow: false };
        }

        const entries = parseChangelogForVersion(changelog, version);
        log(`entries count=${entries.length} entries=${JSON.stringify(entries)}`);
        if (entries.length === 0) {
          log('EXIT: no entries for this version');
          await flushWhatsNewLog(logLines);
          return { shouldShow: false };
        }

        let imagePath = '';
        try {
          const whatsNewDir = path.join(rootDirectory, 'Assets', 'App', 'WhatsNew');
          const files = await readdir(whatsNewDir);
          const images = files.filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f));
          if (images.length > 0) {
            const randomImage = images[Math.floor(Math.random() * images.length)];
            imagePath = getResourceFileUrl(rootDirectory, 'Assets', 'App', 'WhatsNew', randomImage);
          }
        } catch {
          // Fallback if directory doesn't exist
          try {
            imagePath = getResourceFileUrl(rootDirectory, 'Assets', 'App', 'New.png');
          } catch {
            // Image not available yet — show overlay without it.
          }
        }

        log(`SUCCESS: shouldShow=true imagePath=${imagePath}`);
        await flushWhatsNewLog(logLines);
        return {
          shouldShow: true,
          version,
          entries,
          imagePath,
        };
      } catch (outerErr) {
        log(`EXIT: outer catch: ${outerErr?.message ?? outerErr}`);
        await flushWhatsNewLog(logLines).catch(() => {});
        return { shouldShow: false };
      }
    },

    async markWhatsNewSeen(version) {
      if (typeof version !== 'string' || !version.trim()) return;
      const userState = await readUserState(rootDirectory);
      await writeUserState(rootDirectory, {
        ...userState,
        whatsNewSeenVersion: version.trim(),
      });
    },
  };
}

/**
 * Extracts changelog entries for a specific version from CHANGELOG.md.
 * Expects Keep a Changelog format: `## [VERSION] - DATE` followed by `* ` lines.
 * Filters out the `chore(release): bump version` noise line.
 */
function parseChangelogForVersion(changelog, version) {
  const lines = changelog.split(/\r?\n/);
  const headerPattern = new RegExp(`^##\\s*\\[${escapeRegex(version)}\\]`);
  let capturing = false;
  const entries = [];

  for (const line of lines) {
    if (capturing) {
      // Stop at the next version header or horizontal rule
      if (/^##\s*\[/.test(line) || /^---\s*$/.test(line)) break;
      const bullet = line.match(/^\*\s+(.+)$/);
      if (bullet) {
        const text = bullet[1].trim();
        // Skip noise: release bumps, chore commits, and dependency updates
        if (/^chore\(/i.test(text) || /^bump\s/i.test(text)) continue;
        entries.push(text);
      }
    } else if (headerPattern.test(line)) {
      capturing = true;
    }
  }

  return entries;
}

async function flushWhatsNewLog(lines) {
  try {
    const logDir = path.join(app.getPath('userData'), 'Logs');
    await mkdir(logDir, { recursive: true });
    await appendFile(
      path.join(logDir, 'whats-new-debug.log'),
      lines.join('\n') + '\n---\n',
      'utf8',
    );
  } catch {
    // Best-effort logging — never block the overlay.
  }
}
