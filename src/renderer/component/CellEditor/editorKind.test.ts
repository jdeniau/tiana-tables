import { Types } from 'mysql';
import { describe, expect, it } from 'vitest';
import { DataType } from '../../../sql/dataType';
import type { ColumnDetail } from '../../../sql/types';
import { EditorKind, looksLikeJson, resolveEditorKind } from './editorKind';

type ColumnDetailFields = Partial<Omit<ColumnDetail, 'constructor'>>;

function makeColumn(overrides: ColumnDetailFields = {}): ColumnDetail {
  return {
    Table: 'orders',
    Column: 'label',
    DataType: DataType.VarChar,
    IsNullable: 'YES',
    ColumnType: 'varchar(255)',
    ColumnDefault: null,
    Extra: '',
    ...overrides,
  } as ColumnDetail;
}

describe('looksLikeJson', () => {
  it.each(['{"a":1}', '  [1,2]  ', '{}'])('accepts %s', (text) => {
    expect(looksLikeJson(text)).toBe(true);
  });

  it.each([
    ['a bare number', '42'],
    ['a bare string', 'hello'],
    ['a broken object', '{"a":'],
  ])('rejects %s', (_label, text) => {
    expect(looksLikeJson(text)).toBe(false);
  });
});

describe('resolveEditorKind', () => {
  it.each([
    ['DATE', Types.DATE, EditorKind.Date],
    ['DATETIME', Types.DATETIME, EditorKind.DateTime],
    ['TIMESTAMP', Types.TIMESTAMP, EditorKind.DateTime],
    ['LONG', Types.LONG, EditorKind.Number],
    ['LONGLONG', Types.LONGLONG, EditorKind.Number],
    ['NEWDECIMAL', Types.NEWDECIMAL, EditorKind.Number],
    ['DOUBLE', Types.DOUBLE, EditorKind.Number],
    ['JSON', Types.JSON, EditorKind.Json],
    ['VAR_STRING', Types.VAR_STRING, EditorKind.Text],
    ['BLOB', Types.BLOB, EditorKind.Text],
  ])('gives a %s field the %s editor', (_label, fieldType, expected) => {
    expect(resolveEditorKind(makeColumn(), fieldType, '')).toBe(expected);
  });

  it.each([
    [DataType.Enum, EditorKind.Enum],
    [DataType.Set, EditorKind.Set],
  ])(
    'reads %s off the schema, which the protocol reports as a string',
    (dataType, expected) => {
      expect(
        resolveEditorKind(makeColumn({ DataType: dataType }), Types.STRING, '')
      ).toBe(expected);
    }
  );

  it('gives the JSON editor to JSON stored in a text column', () => {
    expect(
      resolveEditorKind(
        makeColumn({ DataType: DataType.Text }),
        Types.BLOB,
        '{"a":1}'
      )
    ).toBe(EditorKind.Json);
  });

  it('leaves a text column holding plain text alone', () => {
    expect(
      resolveEditorKind(
        makeColumn({ DataType: DataType.Text }),
        Types.BLOB,
        'hello'
      )
    ).toBe(EditorKind.Text);
  });

  it('never mistakes a numeric field for JSON', () => {
    expect(resolveEditorKind(makeColumn(), Types.LONG, '[1]')).toBe(
      EditorKind.Number
    );
  });

  it('falls back to text when the field type is unknown', () => {
    // no field type at hand: everything MySQL accepts can be written as text
    expect(resolveEditorKind(makeColumn(), undefined, '')).toBe(
      EditorKind.Text
    );
  });

  it('still recognizes JSON without a field type', () => {
    expect(resolveEditorKind(makeColumn(), undefined, '{"a":1}')).toBe(
      EditorKind.Json
    );
  });
});
