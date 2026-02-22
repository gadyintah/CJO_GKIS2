/**
 * Add months to a date, clamping to the last day of the month if needed.
 * e.g. Jan 31 + 1 month = Feb 28/29 (not Mar 2/3)
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const targetMonth = result.getMonth() + months;
  result.setDate(1);
  result.setMonth(targetMonth);
  // Set to last day of target month if original day exceeds it
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), lastDay));
  return result;
}

/**
 * Add years to a date, clamping to the last day of the month if needed (for Feb 29 edge cases).
 */
export function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  // Handle Feb 29 → Feb 28 when moving from leap year
  return result;
}

/**
 * Format a Date as YYYY-MM-DD string using local date parts (avoids timezone shift).
 */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
