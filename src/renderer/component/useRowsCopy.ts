import { useEffect } from 'react';
import type { Table } from '@tanstack/react-table';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import { useDateDisplay } from '../../contexts/DateDisplayContext';
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
} from './CellContextMenu/rowFormats';
import { columnNamesAtom } from './CellContextMenu/rowsCopyItem';
import type { ColumnMeta, GridFeatures } from './TableGrid';

/** What a copy of rows wrote, for the region header to say so. */
export interface RowsCopied {
  rowCount: number;
  format: RowFormat;
}

interface RowsCopy {
  /** the selected rows, in the order of the grid, without the caller's own columns */
  selectedRows: () => Array<Array<RowCell>>;
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

/** Copies rows of a grid: the selected ones as TSV on Ctrl+C in the focused grid, any rows in any format from the context menu. */
export function useRowsCopy<Row extends ResultRow>(
  table: Table<GridFeatures, Row>,
  {
    enabled,
    scrollElement,
    columnsMeta,
    rowsAsArray,
    onCopied,
  }: {
    /** whether rows can be selected, and Ctrl+C copy them */
    enabled: boolean;
    scrollElement: HTMLElement | null;
    columnsMeta: ReadonlyArray<ColumnMeta>;
    rowsAsArray: boolean;
    onCopied: ((copied: RowsCopied) => void) | undefined;
  }
): RowsCopy {
  const dialect = useDialect();
  const { database } = useDatabaseContext();
  const { shift, serverZone } = useDateDisplay();
  const zone = serverZone?.zone ?? null;

  const selectedRows = (): Array<Array<RowCell>> => {
    const columns = columnsMeta.filter((column) => !column.render);

    return table
      .getRowModel()
      .rows.filter((row) => row.getIsSelected())
      .map((row) =>
        columns.map((column) => ({
          column,
          value: columnValue(row.original, column, rowsAsArray),
        }))
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
        () => onCopied?.({ rowCount: rows.length, format }),
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
      const rows = selectedRows();

      if (window.getSelection()?.toString() || rows.length === 0) {
        return;
      }

      const content = contentOf(RowFormat.Tsv, rows);

      if (content) {
        fillCopyEvent(event, content);
        onCopied?.({ rowCount: rows.length, format: RowFormat.Tsv });
      }
    };

    scrollElement.addEventListener('copy', onCopy);

    return () => scrollElement.removeEventListener('copy', onCopy);
  }, [scrollElement, enabled, selectedRows, contentOf, onCopied]);

  return { selectedRows, copyRows, canCopyAs };
}
