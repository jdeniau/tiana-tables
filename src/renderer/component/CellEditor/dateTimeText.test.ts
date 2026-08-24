import { describe, expect, it } from 'vitest';
import { fromDateInputValue, toDateInputValue } from './dateTimeText';

describe('toDateInputValue', () => {
  it('keeps the date of a DATE literal', () => {
    expect(toDateInputValue('2026-01-15', false)).toBe('2026-01-15');
  });

  it('drops the time when the input only holds a date', () => {
    expect(toDateInputValue('2026-01-15 10:30:00', false)).toBe('2026-01-15');
  });

  it('swaps the space of a DATETIME literal for a T', () => {
    expect(toDateInputValue('2026-01-15 10:30:00', true)).toBe(
      '2026-01-15T10:30:00'
    );
  });

  it('completes the seconds a literal leaves out', () => {
    expect(toDateInputValue('2026-01-15 10:30', true)).toBe(
      '2026-01-15T10:30:00'
    );
  });

  it('gives midnight to a date asked for with a time', () => {
    expect(toDateInputValue('2026-01-15', true)).toBe('2026-01-15T00:00:00');
  });

  it('accepts a literal already spelled with a T', () => {
    expect(toDateInputValue('2026-01-15T10:30:00', true)).toBe(
      '2026-01-15T10:30:00'
    );
  });

  it.each([
    ['the zero date MySQL accepts and no calendar does', '0000-00-00'],
    ['a zero datetime', '0000-00-00 00:00:00'],
    ['anything that is not a date', 'not a date'],
    ['an empty value', ''],
  ])('shows nothing for %s', (_label, text) => {
    expect(toDateInputValue(text, true)).toBe('');
    expect(toDateInputValue(text, false)).toBe('');
  });
});

describe('fromDateInputValue', () => {
  it('leaves a date alone', () => {
    expect(fromDateInputValue('2026-01-15', false)).toBe('2026-01-15');
  });

  it('swaps the T back for a space', () => {
    expect(fromDateInputValue('2026-01-15T10:30:00', true)).toBe(
      '2026-01-15 10:30:00'
    );
  });

  it('puts back the seconds the input drops when they are zero', () => {
    // Chromium hands over `2026-01-15T10:30` for a whole minute
    expect(fromDateInputValue('2026-01-15T10:30', true)).toBe(
      '2026-01-15 10:30:00'
    );
  });

  it('gives midnight to a value with no time at all', () => {
    expect(fromDateInputValue('2026-01-15', true)).toBe('2026-01-15 00:00:00');
  });

  it('round-trips a DATETIME literal untouched', () => {
    const literal = '2026-01-15 10:30:45';

    expect(fromDateInputValue(toDateInputValue(literal, true), true)).toBe(
      literal
    );
  });
});
