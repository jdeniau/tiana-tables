import { Types } from 'mysql';
import { describe, expect, test } from 'vitest';
import cellValueToText from './cellValueToText';

describe('cellValueToText', () => {
  test('renders NULL as an empty text', () => {
    expect(cellValueToText(null, Types.VARCHAR)).toBe('');
    expect(cellValueToText(undefined, Types.VARCHAR)).toBe('');
  });

  test('keeps a plain string as is', () => {
    expect(cellValueToText('some text', Types.VARCHAR)).toBe('some text');
  });

  test('formats dates like the grid does', () => {
    const date = new Date('2020-01-02T03:04:05');

    expect(cellValueToText(date, Types.DATE)).toBe('2020-01-02');
    expect(cellValueToText(date, Types.DATETIME)).toBe('2020-01-02 03:04:05');
  });

  test('indents a JSON string', () => {
    expect(cellValueToText('{"a":1}', Types.JSON)).toBe('{\n  "a": 1\n}');
  });

  test('indents JSON stored in a text column', () => {
    expect(cellValueToText('[1,2]', Types.VARCHAR)).toBe('[\n  1,\n  2\n]');
  });

  test('indents JSON surrounded by whitespace', () => {
    expect(cellValueToText('  {"a":1}\n', Types.VARCHAR)).toBe(
      '{\n  "a": 1\n}'
    );
  });

  test('leaves an invalid JSON string untouched', () => {
    expect(cellValueToText('{not json', Types.JSON)).toBe('{not json');
  });

  test('leaves a JSON scalar untouched, to keep long numbers intact', () => {
    expect(cellValueToText('12345678901234567890', Types.VARCHAR)).toBe(
      '12345678901234567890'
    );
    expect(cellValueToText('"quoted"', Types.VARCHAR)).toBe('"quoted"');
  });

  test('indents a JSON column already parsed by mysql2', () => {
    expect(cellValueToText({ a: 1 }, Types.JSON)).toBe('{\n  "a": 1\n}');
  });

  test('stringifies numbers', () => {
    expect(cellValueToText(42, Types.LONG)).toBe('42');
  });
});
