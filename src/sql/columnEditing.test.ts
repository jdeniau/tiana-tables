import { describe, expect, it } from 'vitest';
import { NotEditableReason, getCellEditability } from './columnEditing';
import type { ColumnDetail } from './dialect/metadata';

function makeColumn(overrides: Partial<ColumnDetail> = {}): ColumnDetail {
  return {
    table: 'orders',
    name: 'label',
    nullable: false,
    generated: false,
    binary: false,
    json: false,
    allowedValues: [],
    multiValued: false,
    ...overrides,
  };
}

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
    expect(getCellEditability(makeColumn({ generated: true }), true)).toEqual({
      editable: false,
      reason: NotEditableReason.Generated,
    });
  });

  it('refuses a column of bytes, which a text editor would corrupt', () => {
    expect(getCellEditability(makeColumn({ binary: true }), true)).toEqual({
      editable: false,
      reason: NotEditableReason.Binary,
    });
  });

  // a row nothing identifies cannot be written, so the key is checked before the column
  it('refuses a row with no key before it looks at the column', () => {
    expect(getCellEditability(makeColumn({ binary: true }), false)).toEqual({
      editable: false,
      reason: NotEditableReason.NoPrimaryKey,
    });
  });
});
