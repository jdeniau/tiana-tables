import type { RowSelectionState } from '@tanstack/react-table';

/** The modifiers of a click, as a file manager reads them. */
export interface SelectionModifiers {
  /** Ctrl, or Cmd on macOS: add the cell or the row (or the range) instead of replacing */
  toggle: boolean;
  /** Shift: the rows from the anchor to the clicked one */
  extend: boolean;
}

/** The cells selected while no row is: by row id, the ids of their columns. */
export type CellSelection = Readonly<Record<string, ReadonlyArray<string>>>;

/** Whole rows or single cells, never both. */
export interface GridSelection {
  rows: RowSelectionState;
  cells: CellSelection;
}

export const NO_SELECTION: GridSelection = { rows: {}, cells: {} };

/** Where the next gestures start from. */
export interface RowCursor {
  /** the row the next Shift+click extends from */
  anchorId: string | null;
  /** the row the next arrow moves from, and the one the side panel shows */
  leadId: string | null;
  /** the column of the lead cell, `null` while whole rows are selected */
  leadColumnId: string | null;
}

export const NO_CURSOR: RowCursor = {
  anchorId: null,
  leadId: null,
  leadColumnId: null,
};

/** A selection, and the cursor the gesture that made it leaves. */
export interface SelectionGesture extends RowCursor {
  selection: GridSelection;
}

/** A cell, by the ids of its row and its column. */
export interface CellPosition {
  rowId: string;
  columnId: string;
}

/** The direction of an arrow key, in display order. */
export enum GridStep {
  Up = 'up',
  Down = 'down',
  Left = 'left',
  Right = 'right',
}

/** The rows from one index to the other, both included, in either order. */
function rangeOf(
  rowIds: ReadonlyArray<string>,
  fromIndex: number,
  toIndex: number
): RowSelectionState {
  const range: RowSelectionState = {};

  for (
    let index = Math.min(fromIndex, toIndex);
    index <= Math.max(fromIndex, toIndex);
    index++
  ) {
    range[rowIds[index]] = true;
  }

  return range;
}

function rowsGesture(
  rows: RowSelectionState,
  anchorId: string | null,
  leadId: string | null
): SelectionGesture {
  return {
    selection: { rows, cells: {} },
    anchorId,
    leadId,
    leadColumnId: null,
  };
}

function cellGesture({ rowId, columnId }: CellPosition): SelectionGesture {
  return {
    selection: { rows: {}, cells: { [rowId]: [columnId] } },
    anchorId: rowId,
    leadId: rowId,
    leadColumnId: columnId,
  };
}

/** The cells, the columns of `rowId` replaced: the lists of the other rows keep their identity. */
function withColumns(
  cells: CellSelection,
  rowId: string,
  columnIds: ReadonlyArray<string>
): CellSelection {
  const others = Object.fromEntries(
    Object.entries(cells).filter(([id]) => id !== rowId)
  );

  return columnIds.length > 0 ? { ...others, [rowId]: columnIds } : others;
}

/** What a click on a cell selects, `rowIds` being the rows in display order. */
export function nextSelection(
  { rows, cells }: GridSelection,
  { anchorId, leadId, leadColumnId }: RowCursor,
  { rowId, columnId }: CellPosition,
  rowIds: ReadonlyArray<string>,
  { toggle, extend }: SelectionModifiers
): SelectionGesture {
  const anchorIndex = anchorId === null ? -1 : rowIds.indexOf(anchorId);
  const rowIndex = rowIds.indexOf(rowId);

  if (extend && anchorIndex >= 0 && rowIndex >= 0) {
    const range = rangeOf(rowIds, anchorIndex, rowIndex);

    return rowsGesture(toggle ? { ...rows, ...range } : range, anchorId, rowId);
  }

  // Ctrl+click over selected rows toggles a row
  if (toggle && Object.keys(rows).length > 0) {
    const { [rowId]: wasSelected, ...others } = rows;

    return wasSelected
      ? rowsGesture(others, rowId, leadId)
      : rowsGesture({ ...rows, [rowId]: true }, rowId, rowId);
  }

  const columnIds = cells[rowId] ?? [];

  if (toggle) {
    return columnIds.includes(columnId)
      ? {
          selection: {
            rows: {},
            cells: withColumns(
              cells,
              rowId,
              columnIds.filter((id) => id !== columnId)
            ),
          },
          anchorId: rowId,
          leadId,
          leadColumnId,
        }
      : {
          selection: {
            rows: {},
            cells: withColumns(cells, rowId, [...columnIds, columnId]),
          },
          anchorId: rowId,
          leadId: rowId,
          leadColumnId: columnId,
        };
  }

  const isOnlySelected =
    Object.keys(rows).length === 0 &&
    Object.keys(cells).length === 1 &&
    columnIds.length === 1 &&
    columnIds[0] === columnId;

  return isOnlySelected
    ? { selection: NO_SELECTION, ...NO_CURSOR }
    : cellGesture({ rowId, columnId });
}

/** The index one step away, held within `length`. */
function stepFrom(index: number, delta: number, length: number): number {
  return Math.min(Math.max(index + delta, 0), length - 1);
}

/**
 * What an arrow selects, from the lead the last gesture ended on; `null` when it moves nothing.
 * A lead cell moves in the four directions, a lead row up and down only.
 */
export function nextSelectionByArrow(
  { anchorId, leadId, leadColumnId }: RowCursor,
  rowIds: ReadonlyArray<string>,
  columnIds: ReadonlyArray<string>,
  { step, extend }: { step: GridStep; extend: boolean }
): SelectionGesture | null {
  if (rowIds.length === 0) {
    return null;
  }

  const leadIndex = leadId === null ? -1 : rowIds.indexOf(leadId);
  const columnIndex =
    leadColumnId === null ? -1 : columnIds.indexOf(leadColumnId);

  if (step === GridStep.Left || step === GridStep.Right) {
    if (extend || leadId === null || leadIndex < 0 || columnIndex < 0) {
      return null;
    }

    const delta = step === GridStep.Left ? -1 : 1;

    return cellGesture({
      rowId: leadId,
      columnId: columnIds[stepFrom(columnIndex, delta, columnIds.length)],
    });
  }

  const delta = step === GridStep.Up ? -1 : 1;
  // from no row, ↓ starts at the first one and ↑ at the last
  const targetIndex =
    leadIndex < 0
      ? delta > 0
        ? 0
        : rowIds.length - 1
      : stepFrom(leadIndex, delta, rowIds.length);
  const targetId = rowIds[targetIndex];
  const anchorIndex = anchorId === null ? -1 : rowIds.indexOf(anchorId);

  if (extend && anchorIndex >= 0) {
    return rowsGesture(
      rangeOf(rowIds, anchorIndex, targetIndex),
      anchorId,
      targetId
    );
  }

  return columnIndex >= 0
    ? cellGesture({ rowId: targetId, columnId: columnIds[columnIndex] })
    : rowsGesture({ [targetId]: true }, targetId, targetId);
}
