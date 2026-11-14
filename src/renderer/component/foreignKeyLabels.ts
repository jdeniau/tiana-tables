import {
  type DisplayAfterByColumn,
  applyColumnOrder,
} from '../../configuration/columnOrder';
import type { ColumnDetailHelper } from '../../sql/ColumnDetailHelper';
import type {
  ForeignKeysHelper,
  WholeForeignKey,
} from '../../sql/ForeignKeysHelper';
import type {
  SelectLabelsRequest,
  SelectedLabel,
} from '../../sql/selectLabels';
import type { ResultRow } from '../../sql/types';
import type { PrimaryKeyPart } from '../../sql/updateCell';
import type { ColumnMeta } from './TableGrid';
import { columnValue } from './useGridCopy';

/** What the grid knows of one of its columns, in the order it shows them. */
export type GridColumn = Pick<
  ColumnMeta,
  'id' | 'fieldIndex' | 'name' | 'tableName'
>;

/** A foreign key whose label one column of the grid shows. */
export interface LabelledKey {
  /** the grid column the label is drawn in */
  columnId: string;
  foreignKey: WholeForeignKey;
  /** the grid column holding each column of the key, in the key's order */
  keyColumns: Array<GridColumn>;
  /** the column of the referenced table whose value names its rows */
  labelColumn: string;
}

/**
 * The column naming the rows of a table: the first one shown, the key's own aside.
 * `null` for bytes, which read as no text.
 */
export function labelColumnOf(
  columns: ReadonlyArray<{ name: string; binary: boolean }>,
  keyColumns: ReadonlyArray<string>,
  displayAfterByColumn: DisplayAfterByColumn | undefined
): string | null {
  const name = applyColumnOrder(
    columns.map((column) => column.name),
    displayAfterByColumn
  ).find((column) => !keyColumns.includes(column));
  const column = columns.find((candidate) => candidate.name === name);

  return column && !column.binary ? column.name : null;
}

/**
 * The keys whose label the grid shows, one per column at most.
 * A key of one column labels it; a composite key labels its last column shown that no other key labels.
 * Only the tables of `database` are known well enough to pick a label column.
 */
export function labelledKeys(
  columns: ReadonlyArray<GridColumn>,
  foreignKeys: ForeignKeysHelper,
  allColumns: ColumnDetailHelper,
  database: string,
  displayAfterOf: (table: string) => DisplayAfterByColumn | undefined
): Array<LabelledKey> {
  const tables = new Set(
    columns.flatMap(({ tableName }) => (tableName ? [tableName] : []))
  );
  const candidates = [...tables]
    .flatMap((table) =>
      foreignKeys.getWholeForeignKeys(table).map((foreignKey) => ({
        foreignKey,
        keyColumns: foreignKey.columns.map(({ column }) =>
          columns.find(
            (gridColumn) =>
              gridColumn.tableName === table && gridColumn.name === column
          )
        ),
      }))
    )
    // a key with a column the grid lacks has no value to look up
    .flatMap(({ foreignKey, keyColumns }) =>
      keyColumns.every((column) => column !== undefined) &&
      foreignKey.referencedDatabase === database
        ? [{ foreignKey, keyColumns }]
        : []
    )
    .toSorted((a, b) => a.keyColumns.length - b.keyColumns.length);

  const labelled: Array<LabelledKey> = [];
  const taken = new Set<string>();

  for (const { foreignKey, keyColumns } of candidates) {
    const labelColumn = labelColumnOf(
      allColumns.getColumnsForTable(foreignKey.referencedTable),
      foreignKey.columns.map(({ referencedColumn }) => referencedColumn),
      displayAfterOf(foreignKey.referencedTable)
    );
    const column = keyColumns
      .toSorted((a, b) => columns.indexOf(b) - columns.indexOf(a))
      .find(({ id }) => !taken.has(id));

    if (labelColumn && column) {
      taken.add(column.id);
      labelled.push({
        columnId: column.id,
        foreignKey,
        keyColumns,
        labelColumn,
      });
    }
  }

  return labelled;
}

/** What a key is found by, `null` for one holding a value no key can be compared with: NULL, bytes, an object. */
export function keyText(values: ReadonlyArray<unknown>): string | null {
  if (
    !values.every(
      (value) => typeof value === 'string' || typeof value === 'number'
    )
  ) {
    return null;
  }

  return JSON.stringify(values.map(String));
}

function keyValuesOf(
  row: ResultRow,
  { keyColumns }: LabelledKey,
  rowsAsArray: boolean
): Array<unknown> {
  return keyColumns.map((column) => columnValue(row, column, rowsAsArray));
}

/** The text of the key a row holds, `null` when it points at no row. */
export function rowKeyText(
  row: ResultRow,
  labelledKey: LabelledKey,
  rowsAsArray: boolean
): string | null {
  return keyText(keyValuesOf(row, labelledKey, rowsAsArray));
}

/** The question for the labels of these rows, each key asked once; `null` when none points at a row. */
export function labelsRequest(
  rows: ReadonlyArray<ResultRow>,
  labelledKey: LabelledKey,
  rowsAsArray: boolean
): SelectLabelsRequest | null {
  const { foreignKey, labelColumn } = labelledKey;
  const keys = new Map<string, Array<PrimaryKeyPart>>();

  for (const row of rows) {
    const values = keyValuesOf(row, labelledKey, rowsAsArray);
    const text = keyText(values);

    if (text !== null) {
      keys.set(
        text,
        foreignKey.columns.map(({ referencedColumn }, index) => ({
          column: referencedColumn,
          value: values[index] as PrimaryKeyPart['value'],
        }))
      );
    }
  }

  if (keys.size === 0) {
    return null;
  }

  return {
    database: foreignKey.referencedDatabase,
    table: foreignKey.referencedTable,
    labelColumn,
    keys: [...keys.values()],
  };
}

/** Labels by the text of their key: a plain object, which the query cache keeps as is while its content stays the same. */
export type LabelsByKey = Record<string, string>;

/** The labels answered, by the text of their key: a label that reads as no text is left out. */
export function labelsByKey(
  answers: ReadonlyArray<SelectedLabel>
): LabelsByKey {
  const labels: LabelsByKey = {};

  for (const { key, label } of answers) {
    const text = keyText(key);

    if (
      text !== null &&
      (typeof label === 'string' || typeof label === 'number') &&
      label !== ''
    ) {
      labels[text] = String(label);
    }
  }

  return labels;
}
