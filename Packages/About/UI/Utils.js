import { formatText } from '../../Shared/Utils/DomUtils.js';

export function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value <= 0) {
    return '';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let nextValue = value;
  let unitIndex = 0;

  while (nextValue >= 1024 && unitIndex < units.length - 1) {
    nextValue /= 1024;
    unitIndex += 1;
  }

  const decimals = nextValue >= 10 || unitIndex === 0 ? 0 : 1;
  return `${nextValue.toFixed(decimals)} ${units[unitIndex]}`;
}

export function formatTransferProgress(progress, strings) {
  if (!progress) {
    return strings.idleDetail;
  }

  const transferred = formatBytes(progress.transferred);
  const total = formatBytes(progress.total);
  const speed = formatBytes(progress.bytesPerSecond);

  if (!transferred || !total) {
    return strings.idleDetail;
  }

  return formatText(strings.transferDetail, {
    transferred,
    total,
    speed: speed || '0 B',
  });
}

export function formatPercent(percent) {
  const value = Number(percent);
  if (!Number.isFinite(value) || value <= 0) {
    return '0';
  }

  if (value >= 100) {
    return '100';
  }

  return value >= 10 ? value.toFixed(0) : value.toFixed(1);
}

export function parseBuildDate(version) {
  if (!version) {
    return '';
  }

  const match = /^(\d{4})\.(\d{1,4})\./.exec(version);
  if (!match) {
    return '';
  }

  const year = Number(match[1]);
  const mmdd = match[2].padStart(4, '0');
  const month = Number(mmdd.slice(0, -2));
  const day = Number(mmdd.slice(-2));
  const date = new Date(year, month - 1, day);

  if (isNaN(date) || month < 1 || month > 12 || day < 1 || day > 31) {
    return '';
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getUpdatePresentation(updateState, strings) {
  const state = updateState ?? {};
  const status = state.status ?? 'idle';
  const statusLabel = strings.statuses?.[status] ?? strings.statuses.idle;
  let detail = strings.details?.[status] ?? strings.idleDetail;

  if (status === 'error' && state.error) {
    detail = state.error;
  }

  return {
    status,
    statusLabel,
    detail,
    progressDetail: formatTransferProgress(state.progress, strings),
    percent: formatPercent(state.progress?.percent ?? 0),
    canCheck: Boolean(state.supported) && status !== 'checking' && status !== 'downloading',
    canInstall: Boolean(state.downloaded),
    showProgress: status === 'downloading' || status === 'downloaded',
  };
}
