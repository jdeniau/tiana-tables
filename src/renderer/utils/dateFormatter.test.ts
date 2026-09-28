import { describe, expect, test } from 'vitest';
import { FieldKind } from '../../sql/resultField';
import { dateTextToIso, formatDateText } from './dateFormatter';

// the texts measured through mysql2 (`dateStrings`) and pg on the dev servers
describe('formatDateText, as the server wrote it', () => {
  test('a date has no time', () => {
    expect(formatDateText('2021-12-12', FieldKind.Date, null)).toEqual({
      text: '2021-12-12',
      offset: null,
    });
  });

  test.each([
    ['2021-01-01 00:00:00', '2021-01-01 00:00:00'],
    // truncated, not rounded: rounding would show the next day
    ['2021-12-31 23:59:59.999999', '2021-12-31 23:59:59'],
    // a wall clock the machine's zone may skip is kept as is
    ['2025-03-30 02:30:00.123456', '2025-03-30 02:30:00'],
    // a timestamptz is written in the session's zone: its wall clock is the server's
    ['2025-12-22 20:02:26-05', '2025-12-22 20:02:26'],
  ])('a date-time %s shows as %s', (text, expected) => {
    expect(formatDateText(text, FieldKind.DateTime, null)).toEqual({
      text: expected,
      offset: null,
    });
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
      expect(
        formatDateText(text, kind, { from: 'UTC', to: 'Asia/Tokyo' })
      ).toEqual({
        text,
        offset: null,
      });
    }
  );
});

describe('formatDateText, moved to another zone', () => {
  const fromUtc = (to: string) => ({ from: 'UTC', to });

  // the offset is the value's own: Paris is +01:00 in winter, +02:00 in summer
  test.each([
    ['2025-12-23 01:02:26', 'Europe/Paris', '2025-12-23 02:02:26', 'UTC+01:00'],
    ['2025-07-01 01:02:26', 'Europe/Paris', '2025-07-01 03:02:26', 'UTC+02:00'],
    ['2025-12-23 01:02:26', 'Asia/Kolkata', '2025-12-23 06:32:26', 'UTC+05:30'],
    ['2025-12-23 01:02:26', 'UTC', '2025-12-23 01:02:26', 'UTC+00:00'],
  ])('%s from UTC to %s is %s, %s', (text, zone, expected, offset) => {
    expect(formatDateText(text, FieldKind.DateTime, fromUtc(zone))).toEqual({
      text: expected,
      offset,
    });
  });

  test("a wall clock is read in the server's zone", () => {
    expect(
      formatDateText('2025-12-22 20:02:26', FieldKind.DateTime, {
        from: 'America/New_York',
        to: 'UTC',
      })
    ).toEqual({ text: '2025-12-23 01:02:26', offset: 'UTC+00:00' });
  });

  test.each([
    ['2025-12-22 20:02:26-05', '2025-12-23 06:32:26', 'UTC+05:30'],
    // the local mean time of a zone before 1900 has seconds
    ['1850-01-01 00:09:21+00:09:21', '1850-01-01 05:53:28', 'UTC+05:53:28'],
  ])(
    'a timestamptz %s is moved from its own offset',
    (text, expected, offset) => {
      expect(
        formatDateText(text, FieldKind.DateTime, fromUtc('Asia/Kolkata'))
      ).toEqual({ text: expected, offset });
    }
  );

  test('a date stays the calendar day', () => {
    expect(
      formatDateText('2025-12-23', FieldKind.Date, fromUtc('Asia/Tokyo'))
    ).toEqual({ text: '2025-12-23', offset: null });
  });
});

describe('dateTextToIso', () => {
  test('a date stays the calendar day', () => {
    expect(dateTextToIso('2025-12-23', FieldKind.Date, 'UTC')).toBe(
      '2025-12-23'
    );
  });

  test("a wall clock is taken in the server's zone", () => {
    expect(
      dateTextToIso('2025-12-23 06:32:26', FieldKind.DateTime, 'Asia/Kolkata')
    ).toBe('2025-12-23T01:02:26Z');
  });

  test('a wall clock of an unknown zone stays one', () => {
    expect(dateTextToIso('2025-12-23 06:32:26', FieldKind.DateTime, null)).toBe(
      '2025-12-23T06:32:26'
    );
  });

  test('a timestamptz is its own instant, microseconds kept', () => {
    expect(
      dateTextToIso('2025-12-22 20:02:26.123456-05', FieldKind.DateTime, null)
    ).toBe('2025-12-23T01:02:26.123456Z');
  });

  test('a text Temporal refuses is left as the server wrote it', () => {
    expect(dateTextToIso('infinity', FieldKind.DateTime, 'UTC')).toBe(
      'infinity'
    );
  });
});
