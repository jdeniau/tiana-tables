import type {
  DescribedColumn,
  ForeignKey,
  TableStructureRow,
} from './dialect/metadata';
import { FieldKind, ResultField } from './resultField';

/**
 * The same nine columns whatever the table, with the kinds MySQL announced for them.
 * No `table`, so the grid never looks links up in a user table named like the catalogue.
 */
const TABLE_STRUCTURE_FIELDS: ResultField[] = [
  { name: 'Column', table: null, kind: FieldKind.String },
  { name: 'Type', table: null, kind: FieldKind.Text },
  { name: 'Null', table: null, kind: FieldKind.String },
  { name: 'Key', table: null, kind: FieldKind.String },
  { name: 'Default', table: null, kind: FieldKind.Text },
  { name: 'Extra', table: null, kind: FieldKind.String },
  { name: 'References', table: null, kind: FieldKind.Text },
  { name: 'Collation', table: null, kind: FieldKind.String },
  { name: 'Comment', table: null, kind: FieldKind.String },
];

/**
 * Joins described columns to their foreign keys,
 * so a dialect only describes its columns.
 */
export function toTableStructure(
  tableName: string,
  columns: DescribedColumn[],
  foreignKeys: ForeignKey[]
): [TableStructureRow[], ResultField[]] {
  const rows = columns.map((column) => {
    const references = new Set(
      foreignKeys
        .filter(
          (key) => key.table === tableName && key.column === column.Column
        )
        .map((key) => `${key.referencedTable}.${key.referencedColumn}`)
    );

    return {
      ...column,
      References: references.size > 0 ? [...references].join(', ') : null,
    };
  });

  return [rows, TABLE_STRUCTURE_FIELDS];
}
