import { KeyboardEvent, useEffect, useRef } from 'react';
import type { Atom } from '@tanstack/react-store';
import type { Table, Row as TanstackRow } from '@tanstack/react-table';
import type { ResultRow } from '../../sql/types';
import { registerSelectAllRows } from '../selectAll';
import type { GridFeatures } from './TableGrid';
import {
  RowStep,
  SelectionModifiers,
  nextRowSelection,
  nextRowSelectionByArrow,
  nextShownRow,
} from './rowSelectionGesture';

/** what a click on a row selects, read as a file manager reads its modifiers */
export type SelectRow<Row extends ResultRow> = (
  row: TanstackRow<GridFeatures, Row>,
  modifiers: SelectionModifiers
) => void;

/** what the eye of a row does: show it in the side panel, or close the panel on it */
export type ShowRow<Row extends ResultRow> = (
  row: TanstackRow<GridFeatures, Row>
) => void;

interface RowSelection<Row extends ResultRow> {
  /** stable, so that the `memo` of `BodyRow` still holds; absent on a grid whose rows cannot be selected */
  selectRow: SelectRow<Row> | undefined;
  /** Escape, ↑ and ↓ on the focused grid; absent with `selectRow` */
  handleKeyDown: ((event: KeyboardEvent<HTMLDivElement>) => void) | undefined;
  /** stable as `selectRow`; absent on a grid with no side panel */
  showRow: ShowRow<Row> | undefined;
}

const ARROW_STEPS: Partial<Record<string, RowStep>> = {
  ArrowUp: RowStep.Up,
  ArrowDown: RowStep.Down,
};

/** Scrolls the least that shows the whole row, below the sticky heads. */
function revealRow(
  scrollElement: HTMLElement,
  index: number,
  rowHeight: number
): void {
  const headHeight = scrollElement.querySelector('thead')?.offsetHeight ?? 0;
  // from the top of the body, which starts below the heads
  const top = index * rowHeight;

  if (top < scrollElement.scrollTop) {
    scrollElement.scrollTop = top;
  } else if (
    headHeight + top + rowHeight >
    scrollElement.scrollTop + scrollElement.clientHeight
  ) {
    scrollElement.scrollTop =
      headHeight + top + rowHeight - scrollElement.clientHeight;
  }
}

/** The gestures that select the rows of a grid, and what empties the selection. */
export function useRowSelection<Row extends ResultRow>(
  table: Table<GridFeatures, Row>,
  {
    enabled,
    scrollElement,
    rowHeight,
    shownRowAtom,
  }: {
    enabled: boolean;
    scrollElement: HTMLElement | null;
    /** in pixels, the same for every row */
    rowHeight: number;
    /** the row the side panel shows, `null` while it is closed */
    shownRowAtom: Atom<string | null> | undefined;
  }
): RowSelection<Row> {
  // the row the next Shift+click extends from
  const anchorRef = useRef<string | null>(null);
  // the row the next arrow moves from
  const leadRef = useRef<string | null>(null);

  // a new order starts with nothing selected
  useEffect(() => {
    const sorts = table.atoms.sorting.subscribe(() => {
      table.resetRowSelection(true);
      anchorRef.current = null;
      leadRef.current = null;
    });

    return () => sorts.unsubscribe();
  }, [table]);

  // the open panel follows the selection, and closes with it
  useEffect(() => {
    if (!shownRowAtom) {
      return undefined;
    }

    const selections = table.atoms.rowSelection.subscribe((selection) => {
      shownRowAtom.set(
        nextShownRow(
          shownRowAtom.get(),
          leadRef.current,
          selection,
          table.getRowModel().rows.map(({ id }) => id)
        )
      );
    });
    // a row picked in the panel is the one the next arrow moves from
    const shownRows = shownRowAtom.subscribe((id) => {
      if (id !== null && table.atoms.rowSelection.get()[id]) {
        leadRef.current = id;
      }
    });

    return () => {
      selections.unsubscribe();
      shownRows.unsubscribe();
    };
  }, [table, shownRowAtom]);

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
  const selectRow: SelectRow<Row> = (row, modifiers) => {
    const core = row.table;
    const next = nextRowSelection(
      core.atoms.rowSelection.get(),
      anchorRef.current,
      row.id,
      core.getRowModel().rows.map(({ id }) => id),
      modifiers
    );

    anchorRef.current = next.anchorId;
    leadRef.current = Object.keys(next.selection).length > 0 ? row.id : null;
    core.setRowSelection(next.selection);
    // a modified click prevented its mousedown, and with it the focus the keys and Ctrl+C need
    scrollElement?.focus({ preventScroll: true });
  };

  const selectAllRows = (): void => {
    table.toggleAllRowsSelected(true);
    anchorRef.current = table.getRowModel().rows[0]?.id ?? null;
    leadRef.current = anchorRef.current;
    // Ctrl+C copies the rows of the focused grid only
    scrollElement?.focus({ preventScroll: true });
  };

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
      leadRef.current = null;

      return;
    }

    const step = ARROW_STEPS[event.key];

    // Ctrl, Cmd and Alt keep their native scroll
    if (step === undefined || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const rowIds = table.getRowModel().rows.map(({ id }) => id);
    const next = nextRowSelectionByArrow(
      anchorRef.current,
      leadRef.current,
      rowIds,
      { step, extend: event.shiftKey }
    );

    if (!next) {
      return;
    }

    // the arrow moves the selection, not the scroll
    event.preventDefault();
    anchorRef.current = next.anchorId;
    leadRef.current = next.leadId;
    table.setRowSelection(next.selection);

    if (scrollElement) {
      revealRow(scrollElement, rowIds.indexOf(next.leadId), rowHeight);
    }
  };

  const showRow: ShowRow<Row> = (row) => {
    if (!shownRowAtom) {
      return;
    }

    if (shownRowAtom.get() === row.id) {
      shownRowAtom.set(null);
    } else {
      const core = row.table;

      // a row of the selection is shown as it stands, any other one is selected alone
      if (!core.atoms.rowSelection.get()[row.id]) {
        anchorRef.current = row.id;
        leadRef.current = row.id;
        core.setRowSelection({ [row.id]: true });
      }

      shownRowAtom.set(row.id);
    }

    // the arrows then move the row shown
    scrollElement?.focus({ preventScroll: true });
  };

  return enabled
    ? {
        selectRow,
        handleKeyDown,
        showRow: shownRowAtom ? showRow : undefined,
      }
    : { selectRow: undefined, handleKeyDown: undefined, showRow: undefined };
}
