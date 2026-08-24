import { Types } from 'mysql';
import { describe, expect, it } from 'vitest';
import {
  findValidationError,
  isSameValue,
  toBoundValue,
  toEditableValue,
  toSqlValue,
} from './editableValue';

describe('toEditableValue', () => {
  it('marks an absent value as NULL, with no text', () => {
    expect(toEditableValue(null, Types.VAR_STRING)).toEqual({
      isNull: true,
      text: '',
    });
  });

  it('spells a datetime the way MySQL does', () => {
    expect(
      toEditableValue(new Date(2026, 0, 15, 10, 30, 45), Types.DATETIME)
    ).toEqual({ isNull: false, text: '2026-01-15 10:30:45' });
  });

  it('drops the time of a date column', () => {
    expect(
      toEditableValue(new Date(2026, 0, 15, 10, 30, 45), Types.DATE)
    ).toEqual({ isNull: false, text: '2026-01-15' });
  });

  it('indents a JSON value so that it can be read and edited', () => {
    expect(toEditableValue('{"a":1}', Types.JSON).text).toBe('{\n  "a": 1\n}');
  });
});

describe('toSqlValue', () => {
  it('sends NULL for an absent value', () => {
    expect(toSqlValue({ isNull: true, text: 'ignored' })).toBeNull();
  });

  it('sends the text otherwise, empty text included', () => {
    expect(toSqlValue({ isNull: false, text: '' })).toBe('');
  });
});

describe('isSameValue', () => {
  it('tells an empty text from NULL apart', () => {
    // the difference the placeholder of the modal exists for: writing `''`
    // over a NULL is a real change
    expect(
      isSameValue({ isNull: true, text: '' }, { isNull: false, text: '' })
    ).toBe(false);
  });

  it('recognizes an untouched value', () => {
    expect(
      isSameValue({ isNull: false, text: 'a' }, { isNull: false, text: 'a' })
    ).toBe(true);
  });
});

describe('findValidationError', () => {
  it.each(['{"a":1}', '[1,2]', '42', '"text"', 'null'])(
    'accepts %s in a JSON column',
    (text) => {
      expect(findValidationError({ isNull: false, text }, true)).toBeNull();
    }
  );

  it.each(['{"a":', '', 'not json'])('refuses %s in a JSON column', (text) => {
    expect(findValidationError({ isNull: false, text }, true)).toBe(
      'invalidJson'
    );
  });

  it('accepts NULL in a JSON column', () => {
    expect(findValidationError({ isNull: true, text: '' }, true)).toBeNull();
  });

  it('leaves a text column alone, even one that held JSON', () => {
    // turning a text column that happened to hold JSON into something else is
    // a legitimate edit
    expect(findValidationError({ isNull: false, text: 'plain' }, false)).toBe(
      null
    );
  });
});

describe('toBoundValue', () => {
  it('keeps a Date, which mysql2 knows how to format', () => {
    const date = new Date(2026, 0, 15);

    expect(toBoundValue(date)).toBe(date);
  });

  it.each([
    [null, null],
    [undefined, null],
    ['text', 'text'],
    [42, 42],
  ])('passes %s through as %s', (value, expected) => {
    expect(toBoundValue(value)).toBe(expected);
  });

  it('sends a parsed JSON column back as JSON text', () => {
    expect(toBoundValue({ a: 1 })).toBe('{"a":1}');
  });
});
