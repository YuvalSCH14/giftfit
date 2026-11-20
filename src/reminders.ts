import type { Reminder } from './api-types';

const DAY = 24 * 60 * 60 * 1000;
const utc = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, day));

/** The next date the reminder falls on, counting today. Null when a one-time date has passed. */
export function nextOccurrence(reminder: Pick<Reminder, 'date' | 'yearly'>, today: Date): Date | null {
  const [year, month, day] = reminder.date.split('-').map(Number);
  const start = utc(today.getFullYear(), today.getMonth(), today.getDate());
  if (!reminder.yearly) {
    const date = utc(year, month - 1, day);
    return date >= start ? date : null;
  }
  for (const candidateYear of [start.getUTCFullYear(), start.getUTCFullYear() + 1]) {
    let date = utc(candidateYear, month - 1, day);
    // 29 February in a year without one falls back to the 28th.
    if (date.getUTCMonth() !== month - 1) date = utc(candidateYear, month - 1, 28);
    if (date >= start) return date;
  }
  return null;
}

export function daysUntil(reminder: Pick<Reminder, 'date' | 'yearly'>, today: Date): number | null {
  const next = nextOccurrence(reminder, today);
  if (!next) return null;
  const start = utc(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((next.getTime() - start.getTime()) / DAY);
}

/** Reminders worth flagging on the bell: within the next two weeks. */
export const SOON_DAYS = 14;

export function upcoming<T extends Pick<Reminder, 'date' | 'yearly'>>(reminders: T[], today: Date): (T & { days: number })[] {
  return reminders
    .map((reminder) => ({ ...reminder, days: daysUntil(reminder, today) }))
    .filter((reminder): reminder is T & { days: number } => reminder.days !== null)
    .sort((a, b) => a.days - b.days);
}

export function daysLabel(days: number): string {
  if (days === 0) return 'היום';
  if (days === 1) return 'מחר';
  if (days === 2) return 'בעוד יומיים';
  return `בעוד ${days} ימים`;
}
