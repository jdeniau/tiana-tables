import type { RowSelectionState } from '@tanstack/react-table';

/** The modifiers of a click, as a file manager reads them. */
export interface SelectionModifiers {
  /** Ctrl, or Cmd on macOS: add the row (or the range) instead of replacing */
  toggle: boolean;
  /** Shift: the rows from the anchor to the clicked one */
  extend: boolean;
}

interface SelectionGesture {
  selection: RowSelectionState;
  /** the row the next Shift+click extends from */
  anchorId: string | null;
}

/** What a click on `rowId` selects, `rowIds` being the rows in display order. */
export function nextRowSelection(
  selection: RowSelectionState,
  anchorId: string | null,
  rowId: string,
  rowIds: ReadonlyArray<string>,
  { toggle, extend }: SelectionModifiers
): SelectionGesture {
  const anchorIndex = anchorId === null ? -1 : rowIds.indexOf(anchorId);
  const rowIndex = rowIds.indexOf(rowId);

  if (extend && anchorIndex >= 0 && rowIndex >= 0) {
    const range: RowSelectionState = {};

    for (
      let index = Math.min(anchorIndex, rowIndex);
      index <= Math.max(anchorIndex, rowIndex);
      index++
    ) {
      range[rowIds[index]] = true;
    }

    return {
      selection: toggle ? { ...selection, ...range } : range,
      anchorId,
    };
  }

  if (toggle) {
    const { [rowId]: wasSelected, ...others } = selection;

    return {
      selection: wasSelected ? others : { ...selection, [rowId]: true },
      anchorId: rowId,
    };
  }

  const isOnlySelected =
    selection[rowId] === true && Object.keys(selection).length === 1;

  return isOnlySelected
    ? { selection: {}, anchorId: null }
    : { selection: { [rowId]: true }, anchorId: rowId };
}
