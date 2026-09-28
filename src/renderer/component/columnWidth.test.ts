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
    const rendered = formatDateText(
      '2026-09-11 14:03:09.123456',
      FieldKind.DateTime
    );

    expect(getColumnWidth(FieldKind.DateTime)).toBeGreaterThanOrEqual(
      rendered.length * 0.6 * fontScale.base + CELL_PADDING
    );
  });

  test('a DATE column fits its shorter format, and stays narrower', () => {
    const rendered = formatDateText('2026-09-11', FieldKind.Date);

    expect(getColumnWidth(FieldKind.Date)).toBeGreaterThanOrEqual(
      rendered.length * 0.6 * fontScale.base + CELL_PADDING
    );
    expect(getColumnWidth(FieldKind.Date)).toBeLessThan(
      getColumnWidth(FieldKind.DateTime)
    );
  });
});
