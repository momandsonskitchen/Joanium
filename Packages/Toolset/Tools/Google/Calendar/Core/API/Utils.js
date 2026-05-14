/**
 * Computes the Monday–Sunday ISO range for a week offset by `diffToMon` days from today.
 * @param {number} diffToMon - Days from today to the target Monday (negative = past).
 * @returns {{ timeMin: string, timeMax: string }}
 */
export function getWeekRange(diffToMon) {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59);
  return { timeMin: monday.toISOString(), timeMax: sunday.toISOString() };
}
