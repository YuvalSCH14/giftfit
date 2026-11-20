import { describe, expect, it } from 'vitest';
import { daysLabel, daysUntil, upcoming } from '../src/reminders';

const today = new Date(2026, 10, 20); // 20 November 2026

describe('reminders', () => {
  it('counts days to a yearly date this year or next', () => {
    expect(daysUntil({ date: '1990-11-20', yearly: true }, today)).toBe(0);
    expect(daysUntil({ date: '1990-11-25', yearly: true }, today)).toBe(5);
    expect(daysUntil({ date: '1990-11-19', yearly: true }, today)).toBe(364);
  });

  it('treats 29 February as the 28th outside leap years', () => {
    expect(daysUntil({ date: '2024-02-29', yearly: true }, new Date(2027, 1, 27))).toBe(1);
  });

  it('drops one-time dates that passed and sorts the rest', () => {
    const list = upcoming(
      [
        { date: '2026-11-01', yearly: false },
        { date: '2026-12-05', yearly: false },
        { date: '2000-11-21', yearly: true },
      ],
      today,
    );
    expect(list.map((r) => r.days)).toEqual([1, 15]);
  });

  it('labels days in Hebrew', () => {
    expect([0, 1, 2, 9].map(daysLabel)).toEqual(['היום', 'מחר', 'בעוד יומיים', 'בעוד 9 ימים']);
  });
});
