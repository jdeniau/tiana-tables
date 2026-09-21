import { describe, expect, it } from 'vitest';
import { DataType } from '../../../sql/dataType';
import { FieldKind } from '../../../sql/resultField';
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
    ['DATE', FieldKind.Date, EditorKind.Date],
    ['DATETIME', FieldKind.DateTime, EditorKind.DateTime],
    ['TIMESTAMP', FieldKind.DateTime, EditorKind.DateTime],
    ['LONG', FieldKind.Number, EditorKind.Number],
    ['LONGLONG', FieldKind.Number, EditorKind.Number],
    ['NEWDECIMAL', FieldKind.Number, EditorKind.Number],
    ['DOUBLE', FieldKind.Number, EditorKind.Number],
    ['JSON', FieldKind.Json, EditorKind.Json],
    ['VAR_STRING', FieldKind.String, EditorKind.Text],
    ['BLOB', FieldKind.Text, EditorKind.Text],
  ])('gives a %s field the %s editor', (_label, fieldType, expected) => {
    expect(resolveEditorKind(makeColumn(), fieldType, '')).toBe(expected);
  });

  /**
   * The protocol announces an `ENUM` and a `SET` as a string type, which the
   * driver reads as `Text` — so a closed set can only be told from the schema,
   * and the select editor hangs on that and not on the kind.
   */
  it.each([
    [DataType.Enum, EditorKind.Enum],
    [DataType.Set, EditorKind.Set],
  ])(
    'reads %s off the schema, whatever the kind says',
    (dataType, expected) => {
      expect(
        resolveEditorKind(
          makeColumn({ DataType: dataType }),
          FieldKind.Text,
          ''
        )
      ).toBe(expected);
    }
  );

  it('gives the JSON editor to JSON stored in a text column', () => {
    expect(
      resolveEditorKind(
        makeColumn({ DataType: DataType.Text }),
        FieldKind.Text,
        '{"a":1}'
      )
    ).toBe(EditorKind.Json);
  });

  it('leaves a text column holding plain text alone', () => {
    expect(
      resolveEditorKind(
        makeColumn({ DataType: DataType.Text }),
        FieldKind.Text,
        'hello'
      )
    ).toBe(EditorKind.Text);
  });

  it('never mistakes a numeric field for JSON', () => {
    expect(resolveEditorKind(makeColumn(), FieldKind.Number, '[1]')).toBe(
      EditorKind.Number
    );
  });

  it('falls back to text when the kind says nothing', () => {
    // everything MySQL accepts can be written as a text literal
    expect(resolveEditorKind(makeColumn(), FieldKind.Unknown, '')).toBe(
      EditorKind.Text
    );
  });

  it('still recognizes JSON on a kind that says nothing', () => {
    expect(resolveEditorKind(makeColumn(), FieldKind.Unknown, '{"a":1}')).toBe(
      EditorKind.Json
    );
  });
});
