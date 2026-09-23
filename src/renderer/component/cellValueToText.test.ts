import { describe, expect, test } from 'vitest';
import { FieldKind } from '../../sql/resultField';
import cellValueToText from './cellValueToText';

describe('cellValueToText', () => {
  test('renders NULL as an empty text', () => {
    expect(cellValueToText(null, FieldKind.String)).toBe('');
    expect(cellValueToText(undefined, FieldKind.String)).toBe('');
  });

  test('keeps a plain string as is', () => {
    expect(cellValueToText('some text', FieldKind.String)).toBe('some text');
  });

  test('formats dates like the grid does', () => {
    const date = new Date('2020-01-02T03:04:05');

    expect(cellValueToText(date, FieldKind.Date)).toBe('2020-01-02');
    expect(cellValueToText(date, FieldKind.DateTime)).toBe(
      '2020-01-02 03:04:05'
    );
  });

  test('indents a JSON string', () => {
    expect(cellValueToText('{"a":1}', FieldKind.Json)).toBe('{\n  "a": 1\n}');
  });

  test('indents JSON stored in a text column', () => {
    expect(cellValueToText('[1,2]', FieldKind.String)).toBe('[\n  1,\n  2\n]');
  });

  test('indents JSON surrounded by whitespace', () => {
    expect(cellValueToText('  {"a":1}\n', FieldKind.String)).toBe(
      '{\n  "a": 1\n}'
    );
  });

  test('leaves an invalid JSON string untouched', () => {
    expect(cellValueToText('{not json', FieldKind.Json)).toBe('{not json');
  });

  test('leaves a JSON scalar untouched, to keep long numbers intact', () => {
    expect(cellValueToText('12345678901234567890', FieldKind.String)).toBe(
      '12345678901234567890'
    );
    expect(cellValueToText('"quoted"', FieldKind.String)).toBe('"quoted"');
  });

  test('indents a JSON column already parsed by mysql2', () => {
    expect(cellValueToText({ a: 1 }, FieldKind.Json)).toBe('{\n  "a": 1\n}');
  });

  test('stringifies numbers', () => {
    expect(cellValueToText(42, FieldKind.Number)).toBe('42');
  });

  /**
   * A `Uint8Array` is an object, and `JSON.stringify` writes one out as a map
   * of indexes to bytes — `{"0":98,"1":108,…}`, which is what the modal used
   * to show of a `BLOB`. It gets the same literal as the grid, only longer.
   */
  test('writes bytes as the literal the grid shows', () => {
    expect(
      cellValueToText(
        new Uint8Array([0x62, 0x6c, 0x6f, 0x62]),
        FieldKind.Binary
      )
    ).toBe('0x626C6F62');
  });

  test('a value beyond what the window can hold says it was cut', () => {
    const text = cellValueToText(
      new Uint8Array(5000).fill(0xff),
      FieldKind.Binary
    );

    expect(text.endsWith('\u2026')).toBe(true);
    // two characters a byte, plus `0x`, plus the ellipsis
    expect(text).toHaveLength(2 + 4096 * 2 + 1);
  });
});
