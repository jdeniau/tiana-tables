import { KeyboardEvent, useEffect } from 'react';
import type { Atom } from '@tanstack/react-store';
import type { Table, Row as TanstackRow } from '@tanstack/react-table';
import type { ResultRow } from '../../sql/types';
import { registerSelectAllRows } from '../selectAll';
import type { ColumnMeta, GridFeatures } from './TableGrid';
import { findCellElement } from './gridCellElement';
import {
  type CellSelection,
  GridStep,
  NO_CURSOR,
  NO_SELECTION,
  RowCursor,
  SelectionGesture,
  SelectionModifiers,
  nextSelection,
  nextSelectionByArrow,
} from './gridSelectionGesture';

/** what a click on a cell selects, read as a file manager reads its modifiers */
export type SelectCell<Row extends ResultRow> = (
  row: TanstackRow<GridFeatures, Row>,
  columnId: string,
  modifiers: SelectionModifiers
) => void;

/** what the eye of a row does: show it in the side panel, or close the panel on it */
export type ShowRow<Row extends ResultRow> = (
  row: TanstackRow<GridFeatures, Row>
) => void;

interface GridSelectionGestures<Row extends ResultRow> {
  /** stable, so that the `memo` of `BodyRow` still holds; absent on a grid whose cells cannot be selected */
  selectCell: SelectCell<Row> | undefined;
  /** Escape and the arrows on the focused grid; absent with `selectCell` */
  handleKeyDown: ((event: KeyboardEvent<HTMLDivElement>) => void) | undefined;
  /** stable as `selectCell`; absent on a grid with no side panel */
  showRow: ShowRow<Row> | undefined;
}

/** The rows of the selection, in the order of the grid: the selected rows, or those holding a selected cell. */
export function rowsOfSelection<Row extends ResultRow>(
  table: Table<GridFeatures, Row>,
  cells: CellSelection
): Array<TanstackRow<GridFeatures, Row>> {
  return table
    .getRowModel()
    .rows.filter((row) => row.getIsSelected() || row.id in cells);
}

/** The selected cells, by row in the order of the grid, their columns in the order of `columns`. */
export function cellsOfSelection<Row extends ResultRow>(
  table: Table<GridFeatures, Row>,
  cells: CellSelection,
  columns: ReadonlyArray<ColumnMeta>
): Array<{ row: TanstackRow<GridFeatures, Row>; columns: Array<ColumnMeta> }> {
  return table
    .getRowModel()
    .rows.filter((row) => row.id in cells)
    .map((row) => ({
      row,
      columns: columns.filter((column) => cells[row.id].includes(column.id)),
    }));
}

const ARROW_STEPS: Partial<Record<string, GridStep>> = {
  ArrowUp: GridStep.Up,
  ArrowDown: GridStep.Down,
  ArrowLeft: GridStep.Left,
  ArrowRight: GridStep.Right,
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

/** Scrolls the least that shows the whole cell, between the pinned columns and the eyes. */
function revealCell(scrollElement: HTMLElement, cell: HTMLElement): void {
  const row = cell.parentElement;

  if (!row || cell.classList.contains('tg-pinned')) {
    return;
  }

  const pinnedWidth = [...row.querySelectorAll<HTMLElement>('.tg-pinned')]
    .map((pinned) => pinned.offsetWidth)
    .reduce((sum, width) => sum + width, 0);
  const eyeWidth = row.querySelector<HTMLElement>('.tg-eye')?.offsetWidth ?? 0;
  const left = cell.offsetLeft - pinnedWidth;
  const right = cell.offsetLeft + cell.offsetWidth + eyeWidth;

  if (left < scrollElement.scrollLeft) {
    scrollElement.scrollLeft = left;
  } else if (right > scrollElement.scrollLeft + scrollElement.clientWidth) {
    scrollElement.scrollLeft = right - scrollElement.clientWidth;
  }
}

/** The gestures that select the cells or the rows of a grid, and what empties the selection. */
export function useGridSelection<Row extends ResultRow>(
  table: Table<GridFeatures, Row>,
  {
    enabled,
    scrollElement,
    rowHeight,
    columnsMeta,
    cellsAtom,
    cursorAtom,
    panelOpenAtom,
  }: {
    enabled: boolean;
    scrollElement: HTMLElement | null;
    /** in pixels, the same for every row */
    rowHeight: number;
    columnsMeta: ReadonlyArray<ColumnMeta>;
    cellsAtom: Atom<CellSelection>;
    cursorAtom: Atom<RowCursor>;
    /** whether the side panel shows the lead; absent on a grid with no side panel */
    panelOpenAtom: Atom<boolean> | undefined;
  }
): GridSelectionGestures<Row> {
  const { atoms, setRowSelection, getRowModel } = table;
  const rowIds = (): Array<string> => getRowModel().rows.map(({ id }) => id);
  // the caller's own columns hold no value to select
  const columnIds = columnsMeta
    .filter((column) => !column.render)
    .map(({ id }) => id);

  const apply = ({ selection, ...cursor }: SelectionGesture): void => {
    cursorAtom.set(cursor);
    setRowSelection(selection.rows);
    cellsAtom.set(selection.cells);

    // the panel shows the lead: it closes once the lead holds nothing selected
    if (
      cursor.leadId === null ||
      !(selection.rows[cursor.leadId] || selection.cells[cursor.leadId])
    ) {
      panelOpenAtom?.set(false);
    }
  };

  // a new order starts with nothing selected
  useEffect(() => {
    const sorts = atoms.sorting.subscribe(() => {
      apply({ selection: NO_SELECTION, ...NO_CURSOR });
    });

    return () => sorts.unsubscribe();
  }, [atoms, apply]);

  // through `table`, which changes with the rows: React Compiler caches the call of a stable member
  const { rowsById } = table.getCoreRowModel();

  // a row whose key was written, or that is gone, is selected no more, nor are its cells
  useEffect(() => {
    const rows = atoms.rowSelection.get();
    const cells = cellsAtom.get();
    const isGone = (id: string): boolean => !(id in rowsById);

    if (Object.keys(rows).some(isGone) || Object.keys(cells).some(isGone)) {
      apply({
        selection: {
          rows: Object.fromEntries(
            Object.entries(rows).filter(([id]) => !isGone(id))
          ),
          cells: Object.fromEntries(
            Object.entries(cells).filter(([id]) => !isGone(id))
          ),
        },
        ...cursorAtom.get(),
      });
    }
  }, [atoms, rowsById, cellsAtom, cursorAtom, apply]);

  const selectCell: SelectCell<Row> = (row, columnId, modifiers) => {
    apply(
      nextSelection(
        { rows: atoms.rowSelection.get(), cells: cellsAtom.get() },
        cursorAtom.get(),
        { rowId: row.id, columnId },
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
      selection: {
        rows: Object.fromEntries(ids.map((id) => [id, true as const])),
        cells: {},
      },
      anchorId: ids[0] ?? null,
      leadId: ids[0] ?? null,
      leadColumnId: null,
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
      apply({ selection: NO_SELECTION, ...NO_CURSOR });

      return;
    }

    const step = ARROW_STEPS[event.key];

    // Ctrl, Cmd and Alt keep their native scroll
    if (step === undefined || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const ids = rowIds();
    const next = nextSelectionByArrow(cursorAtom.get(), ids, columnIds, {
      step,
      extend: event.shiftKey,
    });

    if (next === null || next.leadId === null) {
      return;
    }

    // the arrow moves the selection, not the scroll
    event.preventDefault();
    apply(next);

    if (!scrollElement) {
      return;
    }

    if (step === GridStep.Left || step === GridStep.Right) {
      // the row stays where it is, so its cell is mounted
      const cell = findCellElement(
        scrollElement,
        next.leadId,
        columnsMeta.findIndex(({ id }) => id === next.leadColumnId)
      );

      if (cell) {
        revealCell(scrollElement, cell);
      }
    } else {
      revealRow(scrollElement, ids.indexOf(next.leadId), rowHeight);
    }
  };

  const showRow: ShowRow<Row> = (row) => {
    if (!panelOpenAtom) {
      return;
    }

    const cursor = cursorAtom.get();
    const columns = cellsAtom.get()[row.id];

    if (panelOpenAtom.get() && cursor.leadId === row.id) {
      panelOpenAtom.set(false);
    } else {
      // a row of the selection is shown as it stands, any other one is selected alone
      if (atoms.rowSelection.get()[row.id]) {
        cursorAtom.set({ ...cursor, leadId: row.id });
      } else if (columns) {
        cursorAtom.set({ ...cursor, leadId: row.id, leadColumnId: columns[0] });
      } else {
        apply({
          selection: { rows: { [row.id]: true }, cells: {} },
          anchorId: row.id,
          leadId: row.id,
          leadColumnId: null,
        });
      }

      panelOpenAtom.set(true);
    }

    // the arrows then move the row shown
    scrollElement?.focus({ preventScroll: true });
  };

  return enabled
    ? {
        selectCell,
        handleKeyDown,
        showRow: panelOpenAtom ? showRow : undefined,
      }
    : { selectCell: undefined, handleKeyDown: undefined, showRow: undefined };
}
