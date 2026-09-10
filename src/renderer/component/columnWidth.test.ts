import { Types } from 'mysql';
import { describe, expect, test } from 'vitest';
import { fontScale } from '../theme';
import { formatDate, formatDateTime } from '../utils/dateFormatter';
import { DEFAULT_COLUMN_WIDTH, getColumnWidth } from './columnWidth';

const CELL_PADDING = 24;

describe('getColumnWidth', () => {
  test('a column of an unknown length opens at the default width', () => {
    expect(getColumnWidth(Types.VAR_STRING)).toBe(DEFAULT_COLUMN_WIDTH);
    expect(getColumnWidth(Types.LONG)).toBe(DEFAULT_COLUMN_WIDTH);
    expect(getColumnWidth(undefined)).toBe(DEFAULT_COLUMN_WIDTH);
  });

  test.each([
    ['DATETIME', Types.DATETIME],
    ['DATETIME2', Types.DATETIME2],
    ['TIMESTAMP', Types.TIMESTAMP],
    ['TIMESTAMP2', Types.TIMESTAMP2],
    ['NEWDATE', Types.NEWDATE],
  ])('a %s column fits the whole timestamp', (_name, type) => {
    const rendered = formatDateTime(new Date(2026, 8, 11, 14, 3, 9));

    expect(getColumnWidth(type)).toBeGreaterThanOrEqual(
      rendered.length * 0.6 * fontScale.base + CELL_PADDING
    );
  });

  test('a DATE column fits its shorter format, and stays narrower', () => {
    const rendered = formatDate(new Date(2026, 8, 11));

    expect(getColumnWidth(Types.DATE)).toBeGreaterThanOrEqual(
      rendered.length * 0.6 * fontScale.base + CELL_PADDING
    );
    expect(getColumnWidth(Types.DATE)).toBeLessThan(
      getColumnWidth(Types.DATETIME)
    );
  });
});
