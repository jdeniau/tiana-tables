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
});
