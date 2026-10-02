import { KeyboardEvent, useCallback, useEffect, useRef } from 'react';
import type { Table, Row as TanstackRow } from '@tanstack/react-table';
import type { ResultRow } from '../../sql/types';
import { registerSelectAllRows } from '../selectAll';
import type { GridFeatures } from './TableGrid';
import { SelectionModifiers, nextRowSelection } from './rowSelectionGesture';

/** what a click on a row selects, read as a file manager reads its modifiers */
export type SelectRow<Row extends ResultRow> = (
  row: TanstackRow<GridFeatures, Row>,
  modifiers: SelectionModifiers
) => void;

interface RowSelection<Row extends ResultRow> {
  /** stable, so that the `memo` of `BodyRow` still holds; absent on a grid whose rows cannot be selected */
  selectRow: SelectRow<Row> | undefined;
  /** Escape on the focused grid; absent with `selectRow` */
  handleKeyDown: ((event: KeyboardEvent<HTMLDivElement>) => void) | undefined;
}

/** The gestures that select the rows of a grid, and what empties the selection. */
export function useRowSelection<Row extends ResultRow>(
  table: Table<GridFeatures, Row>,
  {
    enabled,
    scrollElement,
  }: { enabled: boolean; scrollElement: HTMLElement | null }
): RowSelection<Row> {
  // the row the next Shift+click extends from
  const anchorRef = useRef<string | null>(null);

  // a new order starts with nothing selected
  useEffect(() => {
    const sorts = table.atoms.sorting.subscribe(() => {
      table.resetRowSelection(true);
      anchorRef.current = null;
    });

    return () => sorts.unsubscribe();
  }, [table]);

  const { rowsById } = table.getCoreRowModel();

  // a row whose key was written, or that is gone, is selected no more
  useEffect(() => {
    const selected = Object.keys(table.atoms.rowSelection.get());
    const kept = selected.filter((id) => id in rowsById);

    if (kept.length < selected.length) {
      table.setRowSelection(
        Object.fromEntries(kept.map((id) => [id, true as const]))
      );
    }
  }, [table, rowsById]);

  // the table is reached through the row, which keeps this stable
  const selectRow = useCallback<SelectRow<Row>>(
    (row, modifiers) => {
      const core = row.table;
      const next = nextRowSelection(
        core.atoms.rowSelection.get(),
        anchorRef.current,
        row.id,
        core.getRowModel().rows.map(({ id }) => id),
        modifiers
      );

      anchorRef.current = next.anchorId;
      core.setRowSelection(next.selection);
      // a modified click prevented its mousedown, and with it the focus Escape needs
      scrollElement?.focus({ preventScroll: true });
    },
    [scrollElement]
  );

  const selectAllRows = useCallback((): void => {
    table.toggleAllRowsSelected(true);
    anchorRef.current = table.getRowModel().rows[0]?.id ?? null;
  }, [table]);

  // Ctrl+A and the Edit menu's Select All, wherever the focus is short of text
  useEffect(
    () =>
      scrollElement && enabled
        ? registerSelectAllRows(scrollElement, selectAllRows)
        : undefined,
    [scrollElement, enabled, selectAllRows]
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      table.resetRowSelection(true);
      anchorRef.current = null;
    }
  };

  return enabled
    ? { selectRow, handleKeyDown }
    : { selectRow: undefined, handleKeyDown: undefined };
}
