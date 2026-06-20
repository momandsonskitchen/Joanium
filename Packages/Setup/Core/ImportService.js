import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { getWritableDataDirectory } from '../../Shared/Storage/ResourcePaths.js';
import { serializeJson } from '../../Shared/Storage/JsonFileStore.js';
import { createDefaultUserState } from '../../Shared/UserData/UserData.js';
import { deepMerge } from '../../Shared/Utils/MergeUtils.js';

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function isEmptyValue(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object' && !Array.isArray(value)) return Object.keys(value).length === 0;
  return false;
}

function valueEquals(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeDefaultAware(current, imported, defaults) {
  if (imported === undefined) return current;
  if (current === undefined || current === null) return imported;

  if (Array.isArray(current) || Array.isArray(imported)) {
    const currentArr = Array.isArray(current) ? current : [];
    const importedArr = Array.isArray(imported) ? imported : [];
    const seen = new Set();
    const result = [];
    for (const item of [...currentArr, ...importedArr]) {
      const key = JSON.stringify(item);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(item);
    }
    return result;
  }

  if (isPlainObject(current) && isPlainObject(imported)) {
    const result = {};
    const keys = new Set([...Object.keys(imported), ...Object.keys(current)]);
    for (const key of keys) {
      if (key === '__proto__' || key === 'constructor') continue;
      result[key] = mergeDefaultAware(current[key], imported[key], defaults?.[key]);
    }
    return result;
  }

  if (isEmptyValue(current)) return imported;
  if (defaults !== undefined && valueEquals(current, defaults)) return imported;
  return current;
}

function mergeSecretDetails(current = {}, imported = {}) {
  const result = {};
  const keys = new Set([...Object.keys(imported), ...Object.keys(current)]);

  for (const key of keys) {
    if (key === '__proto__' || key === 'constructor') continue;
    const currentDetails = isPlainObject(current[key]) ? current[key] : {};
    const importedDetails = isPlainObject(imported[key]) ? imported[key] : {};
    const detailKeys = new Set([...Object.keys(importedDetails), ...Object.keys(currentDetails)]);
    const mergedDetails = {};

    for (const detailKey of detailKeys) {
      if (detailKey === '__proto__' || detailKey === 'constructor') continue;
      const currentValue = currentDetails[detailKey];
      mergedDetails[detailKey] = isEmptyValue(currentValue)
        ? importedDetails[detailKey]
        : currentValue;
    }

    result[key] = mergedDetails;
  }

  return result;
}

function mergeUserJson(current = {}, imported = {}) {
  const defaults = createDefaultUserState();
  const base = mergeDefaultAware(current, imported, defaults);

  const currentProfile = current.profile ?? {};
  const importedProfile = imported.profile ?? {};
  const mergedProfile = mergeDefaultAware(currentProfile, importedProfile, defaults.profile);

  const currentSelected = Array.isArray(current.providers?.selected)
    ? current.providers.selected
    : [];
  const importedSelected = Array.isArray(imported.providers?.selected)
    ? imported.providers.selected
    : [];
  const mergedSelected = [...new Set([...currentSelected, ...importedSelected])];

  const currentProviderDetails = current.providers?.details ?? {};
  const importedProviderDetails = imported.providers?.details ?? {};
  const mergedProviderDetails = mergeSecretDetails(currentProviderDetails, importedProviderDetails);

  const currentConnectorDetails = current.connectors?.details ?? {};
  const importedConnectorDetails = imported.connectors?.details ?? {};
  const mergedConnectorDetails = mergeSecretDetails(
    currentConnectorDetails,
    importedConnectorDetails,
  );

  const mergedCustomInstructions = mergeDefaultAware(
    current.customInstructions,
    imported.customInstructions,
    defaults.customInstructions,
  );

  const mergedUsageModes = (() => {
    const currentArr = Array.isArray(current.usageModes) ? current.usageModes : [];
    const importedArr = Array.isArray(imported.usageModes) ? imported.usageModes : [];
    const seen = new Set(currentArr.map((v) => JSON.stringify(v)));
    return [...currentArr, ...importedArr.filter((v) => !seen.has(JSON.stringify(v)))];
  })();

  const DEFAULT_PERSONA_FILENAME = 'Joana.md';
  const currentPersona = current.activePersona;
  const importedPersona = imported.activePersona;
  const mergedPersona =
    currentPersona &&
    currentPersona.namespace &&
    currentPersona.filename &&
    currentPersona.filename !== DEFAULT_PERSONA_FILENAME
      ? currentPersona
      : (importedPersona ?? currentPersona);

  const mergedTheme = mergeDefaultAware(current.theme ?? {}, imported.theme ?? {}, defaults.theme);
  const mergedAppSettings = mergeDefaultAware(
    current.appSettings ?? {},
    imported.appSettings ?? {},
    defaults.appSettings,
  );

  return {
    ...base,
    locale: mergeDefaultAware(current.locale, imported.locale, defaults.locale),
    consentAccepted: mergeDefaultAware(
      current.consentAccepted,
      imported.consentAccepted,
      defaults.consentAccepted,
    ),
    onboardingCompleted: mergeDefaultAware(
      current.onboardingCompleted,
      imported.onboardingCompleted,
      defaults.onboardingCompleted,
    ),
    completedAt: mergeDefaultAware(current.completedAt, imported.completedAt, defaults.completedAt),
    lastCompletedStep: mergeDefaultAware(
      current.lastCompletedStep,
      imported.lastCompletedStep,
      defaults.lastCompletedStep,
    ),
    profile: mergedProfile,
    customInstructions: mergedCustomInstructions,
    providers: {
      selected: mergedSelected,
      details: mergedProviderDetails,
    },
    connectors: {
      details: mergedConnectorDetails,
    },
    usageModes: mergedUsageModes,
    activePersona: mergedPersona,
    windowState: current.windowState ?? defaults.windowState,
    appSettings: mergedAppSettings,
    theme: mergedTheme,
    whatsNewSeenVersion: mergeDefaultAware(
      current.whatsNewSeenVersion,
      imported.whatsNewSeenVersion,
      defaults.whatsNewSeenVersion,
    ),
    lastDreamt: mergeDefaultAware(current.lastDreamt, imported.lastDreamt, defaults.lastDreamt),
  };
}

function mergeChannelsJson(current = {}, imported = {}) {
  return deepMerge(imported, current);
}

function isInsideDirectory(directory, filePath) {
  const relative = path.relative(directory, filePath);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Import a Joanium backup zip during setup.
 *
 * Since this runs during onboarding the current data directory is effectively
 * empty, so files are restored directly. User.json and Channels.json still
 * receive smart merges so the default state created earlier is handled correctly.
 */
export async function setupImportData(rootDirectory, zipFilePath) {
  const zipBuffer = await readFile(zipFilePath);
  const zip = await JSZip.loadAsync(zipBuffer);
  const dataDir = getWritableDataDirectory(rootDirectory);
  await mkdir(dataDir, { recursive: true });

  let hasUserJson = false;
  for (const relativePath of Object.keys(zip.files)) {
    if (relativePath.replaceAll('\\', '/').split('/')[0] === 'User.json') {
      hasUserJson = true;
      break;
    }
  }

  if (!hasUserJson) {
    return { ok: false, error: 'Invalid backup: missing User.json.' };
  }

  let writtenAvatarPath = null;

  for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;

    const normPath = relativePath.replaceAll('\\', '/');
    const topLevel = normPath.split('/')[0];

    if (topLevel === 'System.json') continue;

    const destPath = path.resolve(dataDir, normPath);
    const relative = path.relative(dataDir, destPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) continue;

    const content = await zipEntry.async('nodebuffer');

    if (normPath === 'Security.json') {
      let currentSecurity = {};
      try {
        currentSecurity = JSON.parse(await readFile(destPath, 'utf8'));
      } catch {
        /* no current security file */
      }

      if (currentSecurity?.enabled) continue;

      let importedSecurity;
      try {
        importedSecurity = JSON.parse(content.toString('utf8'));
      } catch {
        continue;
      }

      const restoredSecurity = {
        ...importedSecurity,
        failedPasswordAttempts: 0,
        lockedUntil: null,
      };

      await mkdir(path.dirname(destPath), { recursive: true });
      await writeFile(destPath, serializeJson(restoredSecurity), 'utf8');
      continue;
    }

    if (normPath === 'User.json') {
      let currentData = {};
      try {
        currentData = JSON.parse(await readFile(destPath, 'utf8'));
      } catch {
        /* no current file — start from empty */
      }
      let importedData;
      try {
        importedData = JSON.parse(content.toString('utf8'));
      } catch {
        continue;
      }
      const merged = mergeUserJson(currentData, importedData);
      await mkdir(path.dirname(destPath), { recursive: true });
      await writeFile(destPath, serializeJson(merged), 'utf8');
      continue;
    }

    if (normPath === 'Channels.json') {
      let currentData = {};
      try {
        currentData = JSON.parse(await readFile(destPath, 'utf8'));
      } catch {
        /* no current file */
      }
      let importedData;
      try {
        importedData = JSON.parse(content.toString('utf8'));
      } catch {
        continue;
      }
      const merged = mergeChannelsJson(currentData, importedData);
      await mkdir(path.dirname(destPath), { recursive: true });
      await writeFile(destPath, serializeJson(merged), 'utf8');
      continue;
    }

    const ext = path.extname(normPath).toLowerCase();
    const base = path.basename(normPath).toLowerCase();
    if (
      base.startsWith('avatar') &&
      ['.avif', '.bmp', '.gif', '.jpeg', '.jpg', '.png', '.webp'].includes(ext)
    ) {
      if (!(await fileExists(destPath))) {
        await mkdir(path.dirname(destPath), { recursive: true });
        await writeFile(destPath, content);
      }
      writtenAvatarPath = destPath;
      continue;
    }

    await mkdir(path.dirname(destPath), { recursive: true });
    await writeFile(destPath, content);
  }

  if (writtenAvatarPath !== null) {
    const userJsonPath = path.join(dataDir, 'User.json');
    try {
      const userState = JSON.parse(await readFile(userJsonPath, 'utf8'));
      const avatarPath = String(userState.profile?.avatarPath ?? '').trim();
      if (!avatarPath || !isInsideDirectory(dataDir, avatarPath)) {
        userState.profile = { ...(userState.profile ?? {}), avatarPath: writtenAvatarPath };
        await writeFile(userJsonPath, serializeJson(userState), 'utf8');
      }
    } catch {
      // Non-fatal
    }
  }

  return { ok: true };
}
