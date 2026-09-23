import { describe, expect, it } from 'vitest';
import {
  isBinary,
  isGenerated,
  isJson,
  isMultiValued,
  isNullable,
  parseEnumValues,
} from './columnSemantics';
import { DataType } from './dataType';

describe('isNullable', () => {
  it.each([
    ['YES', true],
    ['yes', true],
    ['NO', false],
  ])('reads %s as %s', (value, expected) => {
    expect(isNullable(value)).toBe(expected);
  });
});

describe('isGenerated', () => {
  it.each(['VIRTUAL GENERATED', 'STORED GENERATED'])(
    'recognizes %s',
    (extra) => {
      expect(isGenerated(extra)).toBe(true);
    }
  );

  it('leaves an auto increment column alone', () => {
    expect(isGenerated('auto_increment')).toBe(false);
  });

  it('reads a column with no extra at all as not generated', () => {
    expect(isGenerated(null)).toBe(false);
  });
});

describe('isJson', () => {
  it('recognizes a json column', () => {
    expect(isJson(DataType.Json)).toBe(true);
  });

  it('does not take a text column holding JSON for a json column', () => {
    expect(isJson(DataType.Text)).toBe(false);
  });
});

describe('isBinary', () => {
  it.each([
    DataType.Blob,
    DataType.LongBlob,
    DataType.VarBinary,
    DataType.Bit,
    DataType.Geometry,
  ])('reads %s as bytes', (dataType) => {
    expect(isBinary(dataType)).toBe(true);
  });

  // why this is read from the schema: `text` and `blob` share a single wire type
  it('leaves a text column alone, which shares its wire type with blob', () => {
    expect(isBinary(DataType.Text)).toBe(false);
  });
});

describe('isMultiValued', () => {
  it('a SET holds several of its values at once', () => {
    expect(isMultiValued(DataType.Set)).toBe(true);
  });

  it('an ENUM holds exactly one', () => {
    expect(isMultiValued(DataType.Enum)).toBe(false);
  });
});

describe('parseEnumValues', () => {
  it('reads the values of an enum', () => {
    expect(parseEnumValues("enum('draft','sent','paid')")).toEqual([
      'draft',
      'sent',
      'paid',
    ]);
  });

  it('reads the values of a set', () => {
    expect(parseEnumValues("set('read','write')")).toEqual(['read', 'write']);
  });

  it('keeps a comma held by a value', () => {
    expect(parseEnumValues("enum('a,b','c')")).toEqual(['a,b', 'c']);
  });

  it('unescapes a doubled quote', () => {
    expect(parseEnumValues("enum('it''s','other')")).toEqual(["it's", 'other']);
  });

  it('unescapes a backslashed quote', () => {
    expect(parseEnumValues("enum('it\\'s')")).toEqual(["it's"]);
  });

  it('keeps an empty value, which is a legal enum member', () => {
    expect(parseEnumValues("enum('','a')")).toEqual(['', 'a']);
  });

  it('returns nothing for a type that is not a closed set of values', () => {
    expect(parseEnumValues('varchar(255)')).toEqual([]);
  });
});
