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

export function formatRelativeSessionTime(value) {
  const date = new Date(value);
  const group = getRelativeDayGroup(value);
  if (group === 'today' || group === 'yesterday') {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
