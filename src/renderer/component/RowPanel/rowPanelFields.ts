import { keyColumnsFirst } from '../../../configuration/columnOrder';
import type { ResultField } from '../../../sql/resultField';
import type { ResultRow } from '../../../sql/types';
import cellValueToText from '../cellValueToText';

/** One field of the row the side panel shows. */
export interface RowPanelField {
  field: ResultField;
  /** the position of the field in the result, which also tells two homonyms apart */
  fieldIndex: number;
  value: unknown;
  /** the whole value, as the detail modal shows it; empty for NULL */
  text: string;
}

/** The fields of a row in the order of the grid: the primary key first. */
export function rowPanelFields(
  row: ResultRow,
  fields: ReadonlyArray<ResultField>,
  primaryKeys: ReadonlyArray<string> | undefined,
  rowsAsArray: boolean
): Array<RowPanelField> {
  const all = fields.map((field, fieldIndex): RowPanelField => {
    const value = rowsAsArray ? row[fieldIndex] : row[field.name];

    return {
      field,
      fieldIndex,
      value,
      text: cellValueToText(value, field.kind),
    };
  });

  return keyColumnsFirst(
    all,
    ({ field }) => primaryKeys?.includes(field.name) ?? false
  );
}

/** The fields whose name or value holds `query`, whatever the case. */
export function filterRowPanelFields(
  fields: ReadonlyArray<RowPanelField>,
  query: string
): Array<RowPanelField> {
  const needle = query.trim().toLowerCase();

  return fields.filter(
    ({ field, text }) =>
      field.name.toLowerCase().includes(needle) ||
      text.toLowerCase().includes(needle)
  );
}

/** How the side panel names a row: its key, `id = 12`, or nothing without one. */
export function rowKeyText(
  row: ResultRow,
  primaryKeys: ReadonlyArray<string> | undefined
): string | null {
  return primaryKeys && primaryKeys.length > 0
    ? primaryKeys.map((pk) => `${pk} = ${String(row[pk])}`).join(', ')
    : null;
}
