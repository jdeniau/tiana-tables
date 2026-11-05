import { useEffect } from 'react';
import type { Atom } from '@tanstack/react-store';
import type { Table } from '@tanstack/react-table';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import { useDateDisplay } from '../../contexts/DateDisplayContext';
import type { useTranslation } from '../../i18n';
import type { ResultRow } from '../../sql/types';
import { useDialect } from '../hooks/useDialect';
import {
  type ClipboardContent,
  fillCopyEvent,
  writeClipboard,
} from '../utils/clipboardContent';
import {
  type RowCell,
  RowFormat,
  rowsToCsv,
  rowsToHtmlTable,
  rowsToInsert,
  rowsToJson,
  rowsToMarkdown,
  rowsToTsv,
  valuesToText,
} from './CellContextMenu/rowFormats';
import { columnNamesAtom } from './CellContextMenu/rowsCopyItem';
import type { ColumnMeta, GridFeatures } from './TableGrid';
import type { CellSelection } from './gridSelectionGesture';
import { cellsOfSelection, rowsOfSelection } from './useGridSelection';

/** What a copy wrote: whole rows in a format, or the values of cells. */
export enum CopyKind {
  Rows = 'rows',
  Values = 'values',
}

/** What a copy wrote, for the region header to say so. */
export type GridCopied =
  | { kind: CopyKind.Rows; rowCount: number; format: RowFormat }
  | { kind: CopyKind.Values; valueCount: number };

/** What the region header says of a copy. */
export function copiedText(
  copied: GridCopied,
  t: ReturnType<typeof useTranslation>['t']
): string {
  return copied.kind === CopyKind.Rows
    ? t('table.rows.copied', { count: copied.rowCount, format: copied.format })
    : t('table.values.copied', { count: copied.valueCount });
}

interface GridCopy {
  /** the rows of the selection, in the order of the grid, without the caller's own columns */
  selectedRows: () => Array<Array<RowCell>>;
  /** the selected cells, a list per row, in the order of the grid; empty while rows are selected */
  selectedValues: () => Array<Array<RowCell>>;
  /** writes values as "Copy value" does, then tells `onCopied` */
  copyValues: (lines: ReadonlyArray<ReadonlyArray<RowCell>>) => void;
  /** writes rows in a format, then tells `onCopied` */
  copyRows: (
    format: RowFormat,
    rows: ReadonlyArray<ReadonlyArray<RowCell>>
  ) => void;
  /** an INSERT needs every column to belong to one known table */
  canCopyAs: (
    format: RowFormat,
    rows: ReadonlyArray<ReadonlyArray<RowCell>>
  ) => boolean;
}

/** The value a row holds in a column: a raw query result is a list of values. */
export function columnValue(
  row: ResultRow,
  column: ColumnMeta,
  rowsAsArray: boolean
): unknown {
  return rowsAsArray ? row[column.fieldIndex] : row[column.name];
}

/**
 * Copies from a grid: on Ctrl+C in the focused grid, the values of the selected cells or the selected rows as TSV;
 * from the context menu, values, or any rows in any format.
 */
export function useGridCopy<Row extends ResultRow>(
  table: Table<GridFeatures, Row>,
  {
    enabled,
    scrollElement,
    columnsMeta,
    rowsAsArray,
    cellsAtom,
    onCopied,
  }: {
    /** whether cells and rows can be selected, and Ctrl+C copy them */
    enabled: boolean;
    scrollElement: HTMLElement | null;
    columnsMeta: ReadonlyArray<ColumnMeta>;
    rowsAsArray: boolean;
    cellsAtom: Atom<CellSelection>;
    onCopied: ((copied: GridCopied) => void) | undefined;
  }
): GridCopy {
  const dialect = useDialect();
  const { database } = useDatabaseContext();
  const { shift, serverZone } = useDateDisplay();
  const zone = serverZone?.zone ?? null;

  // the caller's own columns hold no value to copy
  const columns = columnsMeta.filter((column) => !column.render);

  const selectedRows = (): Array<Array<RowCell>> =>
    rowsOfSelection(table, cellsAtom.get()).map((row) =>
      columns.map((column) => ({
        column,
        value: columnValue(row.original, column, rowsAsArray),
      }))
    );

  const selectedValues = (): Array<Array<RowCell>> =>
    cellsOfSelection(table, cellsAtom.get(), columns).map(
      ({ row, columns: selected }) =>
        selected.map((column) => ({
          column,
          value: columnValue(row.original, column, rowsAsArray),
        }))
    );

  const copyValues = (lines: ReadonlyArray<ReadonlyArray<RowCell>>): void => {
    writeClipboard({ text: valuesToText(lines) }).then(
      () =>
        onCopied?.({
          kind: CopyKind.Values,
          valueCount: lines.flat().length,
        }),
      (error: unknown) => console.error('The values were not copied', error)
    );
  };

  const contentOf = (
    format: RowFormat,
    rows: ReadonlyArray<ReadonlyArray<RowCell>>
  ): ClipboardContent | undefined => {
    const shown = { shift, serverZone: zone };
    const withColumnNames = columnNamesAtom.get();

    switch (format) {
      case RowFormat.Tsv:
        return {
          text: rowsToTsv(rows, shown, withColumnNames),
          html: rowsToHtmlTable(rows, shown, withColumnNames),
        };
      case RowFormat.Csv:
        return { text: rowsToCsv(rows, zone, withColumnNames) };
      case RowFormat.Markdown:
        return { text: rowsToMarkdown(rows, shown) };
      case RowFormat.Json:
        return { text: rowsToJson(rows, zone) };
      case RowFormat.SqlInsert: {
        const insert = rowsToInsert(dialect, database, rows);

        return insert === undefined ? undefined : { text: insert };
      }
    }
  };

  const copyRows = (
    format: RowFormat,
    rows: ReadonlyArray<ReadonlyArray<RowCell>>
  ): void => {
    const content = rows.length > 0 ? contentOf(format, rows) : undefined;

    if (content) {
      writeClipboard(content).then(
        () =>
          onCopied?.({ kind: CopyKind.Rows, rowCount: rows.length, format }),
        // nothing to say in the header for a write that did not happen
        (error: unknown) => console.error('The rows were not copied', error)
      );
    }
  };

  const canCopyAs = (
    format: RowFormat,
    rows: ReadonlyArray<ReadonlyArray<RowCell>>
  ): boolean =>
    rows.length > 0 && contentOf(format, rows.slice(0, 1)) !== undefined;

  // Ctrl+C and the Edit menu's Copy on the focused grid, short of a text highlighted in a cell
  useEffect(() => {
    if (!scrollElement || !enabled) {
      return undefined;
    }

    const onCopy = (event: ClipboardEvent): void => {
      if (window.getSelection()?.toString()) {
        return;
      }

      const lines = selectedValues();

      if (lines.length > 0) {
        fillCopyEvent(event, { text: valuesToText(lines) });
        onCopied?.({
          kind: CopyKind.Values,
          valueCount: lines.flat().length,
        });

        return;
      }

      const rows = selectedRows();
      const content =
        rows.length > 0 ? contentOf(RowFormat.Tsv, rows) : undefined;

      if (content) {
        fillCopyEvent(event, content);
        onCopied?.({
          kind: CopyKind.Rows,
          rowCount: rows.length,
          format: RowFormat.Tsv,
        });
      }
    };

    scrollElement.addEventListener('copy', onCopy);

    return () => scrollElement.removeEventListener('copy', onCopy);
  }, [
    scrollElement,
    enabled,
    selectedValues,
    selectedRows,
    contentOf,
    onCopied,
  ]);

  return { selectedRows, selectedValues, copyValues, copyRows, canCopyAs };
}
