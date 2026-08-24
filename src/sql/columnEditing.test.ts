import { describe, expect, it } from 'vitest';
import {
  NotEditableReason,
  getCellEditability,
  isGenerated,
  isJsonColumn,
  isNullable,
  parseEnumValues,
} from './columnEditing';
import { DataType } from './dataType';
import type { ColumnDetail } from './types';

// `RowDataPacket` pins `constructor.name`, which a partial would widen back to
// `string` — the schema fields are the only ones a fixture ever overrides
type ColumnDetailFields = Partial<Omit<ColumnDetail, 'constructor'>>;

function makeColumn(overrides: ColumnDetailFields = {}): ColumnDetail {
  return {
    Table: 'orders',
    Column: 'label',
    DataType: DataType.VarChar,
    IsNullable: 'NO',
    ColumnType: 'varchar(255)',
    ColumnDefault: null,
    Extra: '',
    ...overrides,
  } as ColumnDetail;
}

describe('isNullable', () => {
  it.each([
    ['YES', true],
    ['yes', true],
    ['NO', false],
  ])('reads %s as %s', (isNullableValue, expected) => {
    expect(isNullable(makeColumn({ IsNullable: isNullableValue }))).toBe(
      expected
    );
  });
});

describe('isGenerated', () => {
  it.each(['VIRTUAL GENERATED', 'STORED GENERATED'])(
    'recognizes %s',
    (extra) => {
      expect(isGenerated(makeColumn({ Extra: extra }))).toBe(true);
    }
  );

  it('leaves an auto increment column alone', () => {
    expect(isGenerated(makeColumn({ Extra: 'auto_increment' }))).toBe(false);
  });
});

describe('isJsonColumn', () => {
  it('recognizes a json column', () => {
    expect(isJsonColumn(makeColumn({ DataType: DataType.Json }))).toBe(true);
  });

  it('does not take a text column holding JSON for a json column', () => {
    expect(isJsonColumn(makeColumn({ DataType: DataType.Text }))).toBe(false);
  });
});

describe('getCellEditability', () => {
  it('accepts a plain column of a row with a primary key', () => {
    expect(getCellEditability(makeColumn(), true)).toEqual({ editable: true });
  });

  it('refuses a row that nothing identifies', () => {
    expect(getCellEditability(makeColumn(), false)).toEqual({
      editable: false,
      reason: NotEditableReason.NoPrimaryKey,
    });
  });

  it('refuses a column absent from the schema', () => {
    expect(getCellEditability(undefined, true)).toEqual({
      editable: false,
      reason: NotEditableReason.UnknownColumn,
    });
  });

  it('refuses a generated column, which the server would not let us write', () => {
    expect(
      getCellEditability(makeColumn({ Extra: 'STORED GENERATED' }), true)
    ).toEqual({ editable: false, reason: NotEditableReason.Generated });
  });

  it.each([
    DataType.Blob,
    DataType.LongBlob,
    DataType.VarBinary,
    DataType.Bit,
    DataType.Geometry,
  ])(
    'refuses a %s column, whose bytes a text editor would corrupt',
    (dataType) => {
      expect(
        getCellEditability(makeColumn({ DataType: dataType }), true)
      ).toEqual({ editable: false, reason: NotEditableReason.Binary });
    }
  );

  it('accepts a text column, which shares its wire type with blob', () => {
    // the whole point of deciding from the schema: `text` and `blob` are
    // indistinguishable in the grid, and `text` is what the modal is best at
    expect(
      getCellEditability(makeColumn({ DataType: DataType.Text }), true)
    ).toEqual({ editable: true });
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
