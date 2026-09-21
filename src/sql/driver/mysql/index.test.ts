import { describe, expect, test } from 'vitest';
import { FieldKind } from '../../resultField';
import { testables } from './index';

const { toResultFields } = testables;

/** the four fields the conversion reads, which the driver keeps to itself */
function column(overrides: {
  name?: string;
  orgTable?: string;
  type?: number;
  characterSet?: number;
}) {
  return {
    name: 'c',
    orgTable: '',
    type: 253,
    characterSet: 224,
    ...overrides,
  };
}

describe('toResultFields', () => {
  /**
   * Measured: `FROM information_schema.TABLES t` answers `table: 't'` and
   * `orgTable: 'TABLES'`, and every reader of this looks a real table up by
   * name — so the alias is not even taken in.
   */
  test('names the table a column really came from', () => {
    const [field] = toResultFields([
      column({ name: 'TABLE_NAME', orgTable: 'TABLES' }),
    ]);

    expect(field.table).toBe('TABLES');
  });

  // mysql2 spells "this belongs to no table" as an empty string
  test('a column belonging to no table has none', () => {
    const [field] = toResultFields([column({ name: 'n', type: 3 })]);

    expect(field.table).toBeNull();
  });

  test('carries the kind of the column, and its name as selected', () => {
    const [field] = toResultFields([
      column({ name: 'ident', orgTable: 'items', type: 3 }),
    ]);

    expect(field).toEqual({
      name: 'ident',
      table: 'items',
      kind: FieldKind.Number,
    });
  });

  // mysql2 types it as an array, and answers `undefined` for a write
  test('a statement that returned no rows has no columns', () => {
    expect(toResultFields(undefined)).toEqual([]);
  });

  // the collation is read too, or a `VARBINARY` would read as a string — the
  // two share type 253, and only 63 separates them
  test('hands the collation over, not only the type', () => {
    const [field] = toResultFields([column({ characterSet: 63 })]);

    expect(field.kind).toBe(FieldKind.Binary);
  });
});
