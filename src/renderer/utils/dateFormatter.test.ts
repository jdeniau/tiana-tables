import { describe, expect, test } from 'vitest';
import { formatDate, formatDateTime } from './dateFormatter';

describe('dateTiFormatter', () => {
  test.each([
    ['2021-01-01T00:00:00', '2021-01-01 00:00:00'],
    ['2021-12-12T23:59:59', '2021-12-12 23:59:59'],
  ])('formatDate(%s) should return %s', (date, expected) => {
    expect(formatDateTime(new Date(date))).toBe(expected);
  });

  test.each([
    ['2021-01-01T00:00:00', '2021-01-01'],
    ['2021-12-12T23:59:59', '2021-12-12'],
  ])('formatDate(%s) should return %s', (date, expected) => {
    expect(formatDate(new Date(date))).toBe(expected);
  });
});
