import os from 'node:os';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

function resolveOsName(platform) {
  if (platform === 'darwin') return 'macOS';
  if (platform === 'win32') return 'Windows';
  if (platform === 'linux') return 'Linux';
  return platform;
}

function safeUserInfo() {
  try {
    return os.userInfo();
  } catch {
    return {};
  }
}

function getSystemInfoFile(rootDirectory) {
  return path.join(rootDirectory, 'Data', 'System.json');
}

async function persistSystemInfo(rootDirectory, info) {
  const filePath = getSystemInfoFile(rootDirectory);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(info, null, 2)}\n`, 'utf8');
}

export async function readCachedSystemInfo(rootDirectory) {
  try {
    const raw = await readFile(getSystemInfoFile(rootDirectory), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function collectSystemInfo(rootDirectory) {
  const cpus = os.cpus();
  const firstCpu = cpus[0] ?? {};
  const localeInfo = Intl.DateTimeFormat().resolvedOptions();
  const userInfo = safeUserInfo();
  const platform = process.platform;

  const info = {
    osName: resolveOsName(platform),
    osVersion: typeof os.version === 'function' ? os.version() : '',
    platform,
    arch: os.arch(),
    kernel: os.release(),
    hostname: os.hostname(),
    username: userInfo.username ?? '',
    homeDir: os.homedir(),
    tmpDir: os.tmpdir(),
    totalMem: os.totalmem(),
    freeMem: os.freemem(),
    cpuModel: String(firstCpu.model ?? 'Unknown CPU').replace(/\s+/g, ' ').trim(),
    cpuCores: cpus.length,
    cpuSpeed: firstCpu.speed ? `${firstCpu.speed} MHz` : '',
    shell: platform === 'win32' ? process.env.ComSpec ?? '' : process.env.SHELL ?? '',
    locale: localeInfo.locale ?? '',
    timezone: localeInfo.timeZone ?? '',
    node: process.versions.node ?? '',
    electron: process.versions.electron ?? '',
    chrome: process.versions.chrome ?? '',
    collectedAt: new Date().toISOString()
  };

  await persistSystemInfo(rootDirectory, info).catch(() => {});
  return info;
}
