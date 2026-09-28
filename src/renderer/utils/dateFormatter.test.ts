import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { FieldKind } from '../../sql/resultField';
import { dateTextToIso, formatDateText } from './dateFormatter';

// the texts measured through mysql2 (`dateStrings`) and pg on the dev servers
beforeEach(() => {
  vi.spyOn(Temporal.Now, 'timeZoneId').mockReturnValue('Asia/Kolkata');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('formatDateText', () => {
  test('a date has no time', () => {
    expect(formatDateText('2021-12-12', FieldKind.Date)).toBe('2021-12-12');
  });

  test.each([
    ['2021-01-01 00:00:00', '2021-01-01 00:00:00'],
    // truncated, not rounded: rounding would show the next day
    ['2021-12-31 23:59:59.999999', '2021-12-31 23:59:59'],
    // a wall clock the machine's zone may skip is kept as is
    ['2025-03-30 02:30:00.123456', '2025-03-30 02:30:00'],
  ])('a date-time %s shows as %s', (text, expected) => {
    expect(formatDateText(text, FieldKind.DateTime)).toBe(expected);
  });

  test.each([
    ['2025-12-23 01:02:26.5+00', '2025-12-23 06:32:26'],
    ['2025-12-22 20:02:26-05', '2025-12-23 06:32:26'],
    // the local mean time of a zone before 1900 has seconds
    ['1850-01-01 00:09:21+00:09:21', '1850-01-01 05:53:28'],
  ])("a timestamptz %s shows in the machine's zone as %s", (text, expected) => {
    expect(formatDateText(text, FieldKind.DateTime)).toBe(expected);
  });

  test.each([
    ['0000-00-00', FieldKind.Date],
    ['0000-00-00 00:00:00.000000', FieldKind.DateTime],
    ['2025-00-00 00:00:00', FieldKind.DateTime],
    ['0044-03-15 BC', FieldKind.Date],
    ['infinity', FieldKind.DateTime],
  ])(
    '%s, which Temporal refuses, shows as the server wrote it',
    (text, kind) => {
      expect(formatDateText(text, kind)).toBe(text);
    }
  );
});

describe('dateTextToIso', () => {
  test('a date stays the calendar day', () => {
    expect(dateTextToIso('2025-12-23', FieldKind.Date)).toBe('2025-12-23');
  });

  test("a wall clock is taken in the machine's zone", () => {
    expect(dateTextToIso('2025-12-23 06:32:26', FieldKind.DateTime)).toBe(
      '2025-12-23T01:02:26Z'
    );
  });

  test('a timestamptz is its own instant, microseconds kept', () => {
    expect(
      dateTextToIso('2025-12-22 20:02:26.123456-05', FieldKind.DateTime)
    ).toBe('2025-12-23T01:02:26.123456Z');
  });

  test('a text Temporal refuses is left as the server wrote it', () => {
    expect(dateTextToIso('infinity', FieldKind.DateTime)).toBe('infinity');
  });
});
