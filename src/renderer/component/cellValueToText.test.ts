import { describe, expect, test } from 'vitest';
import { FieldKind } from '../../sql/resultField';
import cellValueToText from './cellValueToText';

describe('cellValueToText', () => {
  test('renders NULL as an empty text', () => {
    expect(cellValueToText(null, FieldKind.Text)).toBe('');
    expect(cellValueToText(undefined, FieldKind.Json)).toBe('');
  });

  test('keeps a plain string as is', () => {
    expect(cellValueToText('some text', FieldKind.Text)).toBe('some text');
  });

  // the whole value, which the grid cuts to the second and moves to the machine's zone
  test('shows a date as the server wrote it, fraction and offset included', () => {
    expect(
      cellValueToText('2025-12-23 06:32:26.5+05:30', FieldKind.DateTime)
    ).toBe('2025-12-23 06:32:26.5+05:30');
  });

  test("indents a JSON column's object or array", () => {
    expect(cellValueToText('{"a":1}', FieldKind.Json)).toBe('{\n  "a": 1\n}');
    expect(cellValueToText('[1,2]', FieldKind.Json)).toBe('[\n  1,\n  2\n]');
  });

  test('indents JSON surrounded by whitespace', () => {
    expect(cellValueToText('  {"a":1}\n', FieldKind.Json)).toBe(
      '{\n  "a": 1\n}'
    );
  });

  // only what the server declares JSON is: a text column keeps its text
  test('leaves JSON stored in a text column as it is written', () => {
    expect(cellValueToText('{"a":1}', FieldKind.Text)).toBe('{"a":1}');
    expect(cellValueToText('[1,2]', FieldKind.String)).toBe('[1,2]');
  });

  test('leaves an invalid JSON text untouched', () => {
    expect(cellValueToText('{not json', FieldKind.Json)).toBe('{not json');
  });

  test('leaves a JSON scalar untouched, to keep long numbers intact', () => {
    expect(cellValueToText('12345678901234567890', FieldKind.Json)).toBe(
      '12345678901234567890'
    );
    expect(cellValueToText('"quoted"', FieldKind.Json)).toBe('"quoted"');
  });

  test('indents an object a driver answered, a spatial point', () => {
    expect(cellValueToText({ x: 1, y: 2 }, FieldKind.Unknown)).toBe(
      '{\n  "x": 1,\n  "y": 2\n}'
    );
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

    expect(text.endsWith('…')).toBe(true);
    // two characters a byte, plus `0x`, plus the ellipsis
    expect(text).toHaveLength(2 + 4096 * 2 + 1);
  });
});
