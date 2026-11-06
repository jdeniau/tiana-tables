import {
  type DisplayAfterByColumn,
  applyColumnOrder,
} from '../../../configuration/columnOrder';
import type { WholeForeignKey } from '../../../sql/ForeignKeysHelper';
import { FieldKind, type ResultField } from '../../../sql/resultField';
import type { ResultRow } from '../../../sql/types';
import type { PrimaryKeyPart } from '../../../sql/updateCell';
import type { EditableValue } from '../CellEditor/editableValue';
import {
  type RowDetailField,
  rowDetailFields,
} from '../RowDetailPanel/rowDetailFields';

/** a number as a key column holds it: no exponent, no hexadecimal, no `Infinity` */
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

/** what the server can be asked to compare a key column with */
function keyValue(value: unknown): string | number | null {
  return typeof value === 'string' || typeof value === 'number' ? value : null;
}

/**
 * The key to look the linked row up by, or `null` when there is nothing to look up:
 * the edited column takes the draft, the other columns of the key the row's value.
 */
export function linkedRowKey(
  key: WholeForeignKey,
  editedColumn: string,
  edited: EditableValue,
  editedKind: FieldKind,
  row: ResultRow
): Array<PrimaryKeyPart> | null {
  const isNumber = editedKind === FieldKind.Number;
  const draft = isNumber ? edited.text.trim() : edited.text;

  // PostgreSQL refuses to compare an integer column with `abc` or `1e3`, and MySQL reads `abc` as 0
  if (
    edited.isNull ||
    draft.trim() === '' ||
    (isNumber && !PLAIN_NUMBER.test(draft))
  ) {
    return null;
  }

  const parts: Array<PrimaryKeyPart> = [];

  for (const { column, referencedColumn } of key.columns) {
    const value = column === editedColumn ? draft : keyValue(row[column]);

    // a key holding a NULL is not checked by the server: it points at no row
    if (value === null) {
      return null;
    }

    parts.push({ column: referencedColumn, value });
  }

  return parts;
}

/** The fields of the linked row in the order its table is shown in, the key's own columns left out. */
export function linkedRowFields(
  row: ResultRow,
  fields: ReadonlyArray<ResultField>,
  keyColumns: ReadonlyArray<string>,
  displayAfterByColumn: DisplayAfterByColumn | undefined
): Array<RowDetailField> {
  const byName = new Map(
    rowDetailFields(row, fields, undefined, false).map((entry) => [
      entry.field.name,
      entry,
    ])
  );

  return applyColumnOrder([...byName.keys()], displayAfterByColumn)
    .filter((name) => !keyColumns.includes(name))
    .flatMap((name) => byName.get(name) ?? []);
}

/** How the card names the row it looks for: `id = 32`, `article_id = 9, media_id = 237`. */
export function linkedRowKeyText(key: ReadonlyArray<PrimaryKeyPart>): string {
  return key.map(({ column, value }) => `${column} = ${value}`).join(', ');
}
