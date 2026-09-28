import { describe, expect, test } from 'vitest';
import { FieldKind } from '../../sql/resultField';
import { fontScale } from '../theme';
import { formatDateText } from '../utils/dateFormatter';
import { DEFAULT_COLUMN_WIDTH, getColumnWidth } from './columnWidth';

const CELL_PADDING = 24;

describe('getColumnWidth', () => {
  test('a column of an unknown length opens at the default width', () => {
    expect(getColumnWidth(FieldKind.String)).toBe(DEFAULT_COLUMN_WIDTH);
    expect(getColumnWidth(FieldKind.Number)).toBe(DEFAULT_COLUMN_WIDTH);
    expect(getColumnWidth(FieldKind.Unknown)).toBe(DEFAULT_COLUMN_WIDTH);
  });

  test('a datetime column fits the whole timestamp', () => {
    const { text } = formatDateText(
      '2026-09-11 14:03:09.123456',
      FieldKind.DateTime,
      null
    );

    expect(getColumnWidth(FieldKind.DateTime)).toBeGreaterThanOrEqual(
      text.length * 0.6 * fontScale.base + CELL_PADDING
    );
  });

  test('a datetime column in local time fits its offset too', () => {
    const { text, offset } = formatDateText(
      '2026-09-11 14:03:09',
      FieldKind.DateTime,
      { from: 'UTC', to: 'Asia/Kolkata' }
    );

    expect(getColumnWidth(FieldKind.DateTime, true)).toBeGreaterThanOrEqual(
      text.length * 0.6 * fontScale.base +
        8 +
        (offset ?? '').length * 0.6 * fontScale.sm +
        CELL_PADDING
    );
  });

  test('a DATE column fits its shorter format, and stays narrower', () => {
    const { text } = formatDateText('2026-09-11', FieldKind.Date, null);

    expect(getColumnWidth(FieldKind.Date)).toBeGreaterThanOrEqual(
      text.length * 0.6 * fontScale.base + CELL_PADDING
    );
    expect(getColumnWidth(FieldKind.Date)).toBeLessThan(
      getColumnWidth(FieldKind.DateTime)
    );
  });
});
