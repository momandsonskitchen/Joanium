const DAY_MS = 86400000;

export function startOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getRelativeDayGroup(value) {
  const date = new Date(value);
  const startOfToday = startOfLocalDay();
  const startOfYesterday = new Date(startOfToday.getTime() - DAY_MS);
  const startOfDay = startOfLocalDay(date);

  if (startOfDay.getTime() === startOfToday.getTime()) return 'today';
  if (startOfDay.getTime() === startOfYesterday.getTime()) return 'yesterday';
  return 'earlier';
}

export function toIso(value, fallback = Date.now()) {
  const date = value ? new Date(value) : new Date(fallback);
  return Number.isNaN(date.getTime()) ? new Date(fallback).toISOString() : date.toISOString();
}

export function todayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatRelativeSessionTime(value) {
  const date = new Date(value);
  const group = getRelativeDayGroup(value);
  if (group === 'today' || group === 'yesterday') {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Sorts an array of objects by date fields (most recent first).
 * Checks updatedAt, createdAt, and any additional fields in order.
 */
export function sortByDate(items, ...dateFields) {
  const fields = dateFields.length > 0 ? dateFields : ['updatedAt', 'createdAt'];
  return [...items].sort((a, b) => {
    for (const field of fields) {
      const aVal = a?.[field];
      const bVal = b?.[field];
      if (aVal && bVal) return new Date(bVal) - new Date(aVal);
      if (aVal) return -1;
      if (bVal) return 1;
    }
    return 0;
  });
}
