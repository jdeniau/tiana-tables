import {
  type DisplayAfterByColumn,
  applyColumnOrder,
} from '../../configuration/columnOrder';
import type { ColumnDetailHelper } from '../../sql/ColumnDetailHelper';
import type { ForeignKeysHelper } from '../../sql/ForeignKeysHelper';
import type { FieldKind } from '../../sql/resultField';
import type {
  SelectLabelsRequest,
  SelectedLabel,
} from '../../sql/selectLabels';
import type { ResultRow } from '../../sql/types';
import { isStringOrNumber } from '../utils/isStringOrNumber';
import type { ColumnMeta } from './TableGrid';
import { columnValue } from './useGridCopy';

/** What the grid knows of one of its columns, in the order it shows them. */
export type GridColumn = Pick<
  ColumnMeta,
  'id' | 'fieldIndex' | 'name' | 'tableName'
>;

/** A column of the grid holding a foreign key of its own, and where the label of the row it points at is read. */
export interface LabelledKey {
  /** the grid column holding the key, its label drawn after its value */
  column: GridColumn;
  referencedDatabase: string;
  referencedTable: string;
  referencedColumn: string;
  /** the column of the referenced table whose value names its rows */
  labelColumn: string;
}

/**
 * The column naming the rows of a table: the first one shown, keys and bytes aside.
 * `keyColumns` are the columns of every key of the table: they hold ids, not names.
 */
export function labelColumnOf(
  columns: ReadonlyArray<{ name: string; binary: boolean }>,
  keyColumns: ReadonlyArray<string>,
  displayAfterByColumn: DisplayAfterByColumn | undefined
): string | null {
  const binaryColumns = new Set(
    columns.flatMap(({ name, binary }) => (binary ? [name] : []))
  );
  const shown = applyColumnOrder(
    columns.map(({ name }) => name),
    displayAfterByColumn
  );

  return (
    shown.find(
      (name) => !keyColumns.includes(name) && !binaryColumns.has(name)
    ) ?? null
  );
}

/**
 * The keys whose label the grid shows: those of one column, a composite key having no column of its own to label.
 * Only the tables of `database` are known well enough to pick a label column.
 */
export function labelledKeys(
  columns: ReadonlyArray<GridColumn>,
  foreignKeys: ForeignKeysHelper,
  allColumns: ColumnDetailHelper,
  database: string,
  displayAfterOf: (table: string) => DisplayAfterByColumn | undefined
): Array<LabelledKey> {
  return columns.flatMap((column) => {
    const foreignKey = foreignKeys
      .getWholeForeignKeys(column.tableName ?? '')
      .find(
        ({ columns: [first, ...others] }) =>
          others.length === 0 && first.column === column.name
      );

    if (!foreignKey || foreignKey.referencedDatabase !== database) {
      return [];
    }

    const {
      referencedDatabase,
      referencedTable,
      columns: [{ referencedColumn }],
    } = foreignKey;
    const labelColumn = labelColumnOf(
      allColumns.getColumnsForTable(referencedTable),
      [
        referencedColumn,
        ...foreignKeys
          .getWholeForeignKeys(referencedTable)
          .flatMap(({ columns: ownKey }) => ownKey.map(({ column }) => column)),
      ],
      displayAfterOf(referencedTable)
    );

    return labelColumn
      ? [
          {
            column,
            referencedDatabase,
            referencedTable,
            referencedColumn,
            labelColumn,
          },
        ]
      : [];
  });
}

/** The question for the labels of these rows, each key asked once; `null` when none points at a row. */
export function labelsRequest(
  rows: ReadonlyArray<ResultRow>,
  {
    column,
    referencedDatabase,
    referencedTable,
    referencedColumn,
    labelColumn,
  }: LabelledKey,
  rowsAsArray: boolean
): SelectLabelsRequest | null {
  const keys = new Map<string, string | number>();

  for (const row of rows) {
    const value = columnValue(row, column, rowsAsArray);

    if (isStringOrNumber(value)) {
      keys.set(String(value), value);
    }
  }

  if (keys.size === 0) {
    return null;
  }

  return {
    database: referencedDatabase,
    table: referencedTable,
    keyColumn: referencedColumn,
    labelColumn,
    keys: [...keys.values()],
  };
}

/** Labels by their key as text: a plain object, which the query cache keeps as is while its content stays the same. */
export type LabelsByKey = Record<string, string>;

/** What the query cache keeps of the labels of one column: plain data too. */
export interface ColumnLabels {
  /** the kind of the column the labels are read from */
  kind: FieldKind;
  byKey: LabelsByKey;
}

/** The labels answered, by their key as text: the server answers a label as text, NULL for a NULL, and an empty one is left out. */
export function labelsByKey(
  answers: ReadonlyArray<SelectedLabel>
): LabelsByKey {
  const labels: LabelsByKey = {};

  for (const { key, label } of answers) {
    if (isStringOrNumber(key) && typeof label === 'string' && label !== '') {
      labels[String(key)] = label;
    }
  }

  return labels;
}

/** The label of the row a key points at, the same for `9` and `'9'`: a key named like a method of `Object` finds none. */
export function findLabel(
  labels: LabelsByKey,
  value: unknown
): string | undefined {
  return isStringOrNumber(value) && Object.hasOwn(labels, String(value))
    ? labels[String(value)]
    : undefined;
}
