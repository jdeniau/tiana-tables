import { KeyboardEvent, useEffect } from 'react';
import type { Atom } from '@tanstack/react-store';
import type { Table, Row as TanstackRow } from '@tanstack/react-table';
import type { ResultRow } from '../../sql/types';
import { registerSelectAllRows } from '../selectAll';
import type { GridFeatures } from './TableGrid';
import {
  NO_CURSOR,
  RowCursor,
  RowStep,
  SelectionGesture,
  SelectionModifiers,
  nextRowSelection,
  nextRowSelectionByArrow,
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
    cursorAtom,
    panelOpenAtom,
  }: {
    enabled: boolean;
    scrollElement: HTMLElement | null;
    /** in pixels, the same for every row */
    rowHeight: number;
    cursorAtom: Atom<RowCursor>;
    /** whether the side panel shows the lead; absent on a grid with no side panel */
    panelOpenAtom: Atom<boolean> | undefined;
  }
): RowSelection<Row> {
  const { atoms, setRowSelection, getRowModel } = table;
  const rowIds = (): Array<string> => getRowModel().rows.map(({ id }) => id);

  const apply = ({ selection, ...cursor }: SelectionGesture): void => {
    cursorAtom.set(cursor);
    setRowSelection(selection);

    // the panel shows the lead: it closes once the lead is no longer selected
    if (cursor.leadId === null || !selection[cursor.leadId]) {
      panelOpenAtom?.set(false);
    }
  };

  // a new order starts with nothing selected
  useEffect(() => {
    const sorts = atoms.sorting.subscribe(() => {
      apply({ selection: {}, ...NO_CURSOR });
    });

    return () => sorts.unsubscribe();
  }, [atoms, apply]);

  // through `table`, which changes with the rows: React Compiler caches the call of a stable member
  const { rowsById } = table.getCoreRowModel();

  // a row whose key was written, or that is gone, is selected no more
  useEffect(() => {
    const selected = Object.keys(atoms.rowSelection.get());
    const kept = selected.filter((id) => id in rowsById);

    if (kept.length < selected.length) {
      apply({
        selection: Object.fromEntries(kept.map((id) => [id, true as const])),
        ...cursorAtom.get(),
      });
    }
  }, [atoms, rowsById, cursorAtom, apply]);

  const selectRow: SelectRow<Row> = (row, modifiers) => {
    apply(
      nextRowSelection(
        atoms.rowSelection.get(),
        cursorAtom.get(),
        row.id,
        rowIds(),
        modifiers
      )
    );
    // a modified click prevented its mousedown, and with it the focus the keys and Ctrl+C need
    scrollElement?.focus({ preventScroll: true });
  };

  const selectAllRows = (): void => {
    const ids = rowIds();

    apply({
      selection: Object.fromEntries(ids.map((id) => [id, true as const])),
      anchorId: ids[0] ?? null,
      leadId: ids[0] ?? null,
    });
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
      apply({ selection: {}, ...NO_CURSOR });

      return;
    }

    const step = ARROW_STEPS[event.key];

    // Ctrl, Cmd and Alt keep their native scroll
    if (step === undefined || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const ids = rowIds();
    const next = nextRowSelectionByArrow(cursorAtom.get(), ids, {
      step,
      extend: event.shiftKey,
    });

    if (!next) {
      return;
    }

    // the arrow moves the selection, not the scroll
    event.preventDefault();
    apply(next);

    if (scrollElement) {
      revealRow(scrollElement, ids.indexOf(next.leadId), rowHeight);
    }
  };

  const showRow: ShowRow<Row> = (row) => {
    if (!panelOpenAtom) {
      return;
    }

    const cursor = cursorAtom.get();

    if (panelOpenAtom.get() && cursor.leadId === row.id) {
      panelOpenAtom.set(false);
    } else {
      // a row of the selection is shown as it stands, any other one is selected alone
      if (atoms.rowSelection.get()[row.id]) {
        cursorAtom.set({ ...cursor, leadId: row.id });
      } else {
        apply({
          selection: { [row.id]: true },
          anchorId: row.id,
          leadId: row.id,
        });
      }

      panelOpenAtom.set(true);
    }

    // the arrows then move the row shown
    scrollElement?.focus({ preventScroll: true });
  };

  return enabled
    ? {
        selectRow,
        handleKeyDown,
        showRow: panelOpenAtom ? showRow : undefined,
      }
    : { selectRow: undefined, handleKeyDown: undefined, showRow: undefined };
}
