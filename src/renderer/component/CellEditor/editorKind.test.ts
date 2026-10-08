import { describe, expect, it } from 'vitest';
import type { ColumnDetail } from '../../../sql/dialect/metadata';
import { FieldKind } from '../../../sql/resultField';
import { EditorKind, resolveEditorKind } from './editorKind';

function makeColumn(overrides: Partial<ColumnDetail> = {}): ColumnDetail {
  return {
    table: 'orders',
    name: 'label',
    nullable: true,
    generated: false,
    binary: false,
    hasJsonType: false,
    allowedValues: [],
    multiValued: false,
    ...overrides,
  };
}

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
    expect(resolveEditorKind(makeColumn(), fieldType)).toBe(expected);
  });

  /**
   * The protocol announces an `ENUM` and a `SET` as a string type, which the
   * driver reads as `Text` — so a closed set can only be told from the schema,
   * and the select editor hangs on that and not on the kind.
   */
  it.each([
    ['an ENUM', false, EditorKind.Enum],
    ['a SET', true, EditorKind.Set],
  ])(
    'reads %s off the schema, whatever the kind says',
    (_label, multiValued, expected) => {
      expect(
        resolveEditorKind(
          makeColumn({ allowedValues: ['draft', 'sent'], multiValued }),
          FieldKind.Number
        )
      ).toBe(expected);
    }
  );

  it('falls back to text when the kind says nothing', () => {
    // everything MySQL accepts can be written as a text literal
    expect(resolveEditorKind(makeColumn(), FieldKind.Unknown)).toBe(
      EditorKind.Text
    );
  });
});
