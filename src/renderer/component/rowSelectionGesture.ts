import type { RowSelectionState } from '@tanstack/react-table';

/** The modifiers of a click, as a file manager reads them. */
export interface SelectionModifiers {
  /** Ctrl, or Cmd on macOS: add the row (or the range) instead of replacing */
  toggle: boolean;
  /** Shift: the rows from the anchor to the clicked one */
  extend: boolean;
}

/** Where the next gestures start from. */
export interface RowCursor {
  /** the row the next Shift+click extends from */
  anchorId: string | null;
  /** the row the next arrow moves from, and the one the side panel shows */
  leadId: string | null;
}

export const NO_CURSOR: RowCursor = { anchorId: null, leadId: null };

/** A selection, and the cursor the gesture that made it leaves. */
export interface SelectionGesture extends RowCursor {
  selection: RowSelectionState;
}

/** The direction of an arrow key, in display order. */
export enum RowStep {
  Up = -1,
  Down = 1,
}

interface ArrowGesture extends SelectionGesture {
  leadId: string;
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

/** What a click on `rowId` selects, `rowIds` being the rows in display order. */
export function nextRowSelection(
  selection: RowSelectionState,
  { anchorId, leadId }: RowCursor,
  rowId: string,
  rowIds: ReadonlyArray<string>,
  { toggle, extend }: SelectionModifiers
): SelectionGesture {
  const anchorIndex = anchorId === null ? -1 : rowIds.indexOf(anchorId);
  const rowIndex = rowIds.indexOf(rowId);

  if (extend && anchorIndex >= 0 && rowIndex >= 0) {
    const range = rangeOf(rowIds, anchorIndex, rowIndex);

    return {
      selection: toggle ? { ...selection, ...range } : range,
      anchorId,
      leadId: rowId,
    };
  }

  if (toggle) {
    const { [rowId]: wasSelected, ...others } = selection;

    return wasSelected
      ? { selection: others, anchorId: rowId, leadId }
      : {
          selection: { ...selection, [rowId]: true },
          anchorId: rowId,
          leadId: rowId,
        };
  }

  const isOnlySelected =
    selection[rowId] === true && Object.keys(selection).length === 1;

  return isOnlySelected
    ? { selection: {}, ...NO_CURSOR }
    : { selection: { [rowId]: true }, anchorId: rowId, leadId: rowId };
}

/**
 * What ↑ or ↓ selects, from `leadId`, the row the last gesture ended on;
 * `null` when there is no row to move to.
 */
export function nextRowSelectionByArrow(
  { anchorId, leadId }: RowCursor,
  rowIds: ReadonlyArray<string>,
  { step, extend }: { step: RowStep; extend: boolean }
): ArrowGesture | null {
  if (rowIds.length === 0) {
    return null;
  }

  const leadIndex = leadId === null ? -1 : rowIds.indexOf(leadId);
  // from no row, ↓ starts at the first one and ↑ at the last
  const targetIndex =
    leadIndex < 0
      ? step === RowStep.Down
        ? 0
        : rowIds.length - 1
      : Math.min(Math.max(leadIndex + step, 0), rowIds.length - 1);
  const targetId = rowIds[targetIndex];
  const anchorIndex = anchorId === null ? -1 : rowIds.indexOf(anchorId);

  if (extend && anchorIndex >= 0) {
    return {
      selection: rangeOf(rowIds, anchorIndex, targetIndex),
      anchorId,
      leadId: targetId,
    };
  }

  return {
    selection: { [targetId]: true },
    anchorId: targetId,
    leadId: targetId,
  };
}
