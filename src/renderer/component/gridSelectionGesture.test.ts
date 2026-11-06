import { describe, expect, test } from 'vitest';
import {
  type CellSelection,
  type GridSelection,
  GridStep,
  NO_SELECTION,
  type RowCursor,
  nextSelection,
  nextSelectionByArrow,
} from './gridSelectionGesture';

const ROW_IDS = ['a', 'b', 'c', 'd', 'e'];
const COLUMN_IDS = ['id', 'name', 'email'];

const PLAIN = { toggle: false, extend: false };
const TOGGLE = { toggle: true, extend: false };
const EXTEND = { toggle: false, extend: true };
const TOGGLE_EXTEND = { toggle: true, extend: true };

/** a cursor on rows, whose lead is its anchor unless told otherwise */
function cursor(anchorId: string | null, leadId = anchorId): RowCursor {
  return { anchorId, leadId, leadColumnId: null };
}

/** a cursor on a cell, anchored on its row */
function cellCursor(rowId: string, columnId: string): RowCursor {
  return { anchorId: rowId, leadId: rowId, leadColumnId: columnId };
}

function rows(...ids: Array<string>): GridSelection {
  return {
    rows: Object.fromEntries(ids.map((id) => [id, true as const])),
    cells: {},
  };
}

function cells(selected: CellSelection): GridSelection {
  return { rows: {}, cells: selected };
}

describe('nextSelection', () => {
  test('a click selects the cell alone, rows deselected, and anchors and leads on it', () => {
    expect(
      nextSelection(
        rows('a', 'b'),
        cursor('a'),
        { rowId: 'c', columnId: 'name' },
        ROW_IDS,
        PLAIN
      )
    ).toEqual({
      selection: cells({ c: ['name'] }),
      ...cellCursor('c', 'name'),
    });

    expect(
      nextSelection(
        cells({ a: ['id'], b: ['name'] }),
        cellCursor('b', 'name'),
        { rowId: 'b', columnId: 'name' },
        ROW_IDS,
        PLAIN
      ).selection
    ).toEqual(cells({ b: ['name'] }));
  });

  test('a click on the only selected cell deselects it, and drops the cursor', () => {
    expect(
      nextSelection(
        cells({ c: ['name'] }),
        cellCursor('c', 'name'),
        { rowId: 'c', columnId: 'name' },
        ROW_IDS,
        PLAIN
      )
    ).toEqual({
      selection: NO_SELECTION,
      anchorId: null,
      leadId: null,
      leadColumnId: null,
    });
  });

  test('Ctrl adds a cell of another row, and leads on it', () => {
    expect(
      nextSelection(
        cells({ a: ['id'] }),
        cellCursor('a', 'id'),
        { rowId: 'c', columnId: 'email' },
        ROW_IDS,
        TOGGLE
      )
    ).toEqual({
      selection: cells({ a: ['id'], c: ['email'] }),
      ...cellCursor('c', 'email'),
    });
  });

  test('Ctrl adds a cell of the same row', () => {
    expect(
      nextSelection(
        cells({ a: ['id'] }),
        cellCursor('a', 'id'),
        { rowId: 'a', columnId: 'email' },
        ROW_IDS,
        TOGGLE
      ).selection
    ).toEqual(cells({ a: ['id', 'email'] }));
  });

  test('Ctrl removes a selected cell, and keeps the lead', () => {
    expect(
      nextSelection(
        cells({ a: ['id', 'email'], c: ['name'] }),
        cellCursor('c', 'name'),
        { rowId: 'a', columnId: 'id' },
        ROW_IDS,
        TOGGLE
      )
    ).toEqual({
      selection: cells({ a: ['email'], c: ['name'] }),
      anchorId: 'a',
      leadId: 'c',
      leadColumnId: 'name',
    });
  });

  test('Ctrl drops a row whose last cell it removes', () => {
    expect(
      nextSelection(
        cells({ a: ['id'], c: ['name'] }),
        cellCursor('c', 'name'),
        { rowId: 'a', columnId: 'id' },
        ROW_IDS,
        TOGGLE
      ).selection
    ).toEqual(cells({ c: ['name'] }));
  });

  test('a cell toggled keeps the columns of the other rows as they were', () => {
    const others = ['name'];
    const next = nextSelection(
      cells({ a: ['id'], c: others }),
      cellCursor('a', 'id'),
      { rowId: 'a', columnId: 'email' },
      ROW_IDS,
      TOGGLE
    );

    expect(next.selection.cells.c).toBe(others);
  });

  test('Ctrl over selected rows adds a row, and anchors and leads on it', () => {
    expect(
      nextSelection(
        rows('a'),
        cursor('a'),
        { rowId: 'c', columnId: 'name' },
        ROW_IDS,
        TOGGLE
      )
    ).toEqual({ selection: rows('a', 'c'), ...cursor('c') });
  });

  test('Ctrl over selected rows removes a selected row, anchors on it, and keeps the lead', () => {
    expect(
      nextSelection(
        rows('a', 'b', 'c'),
        cursor('a', 'b'),
        { rowId: 'c', columnId: 'name' },
        ROW_IDS,
        TOGGLE
      )
    ).toEqual({ selection: rows('a', 'b'), ...cursor('c', 'b') });
  });

  test('Shift replaces the selection with the rows from the anchor, either way, and leads on the row clicked', () => {
    expect(
      nextSelection(
        rows('a', 'b'),
        cursor('b'),
        { rowId: 'd', columnId: 'id' },
        ROW_IDS,
        EXTEND
      )
    ).toEqual({ selection: rows('b', 'c', 'd'), ...cursor('b', 'd') });

    expect(
      nextSelection(
        rows('d'),
        cursor('d'),
        { rowId: 'b', columnId: 'id' },
        ROW_IDS,
        EXTEND
      )
    ).toEqual({ selection: rows('b', 'c', 'd'), ...cursor('d', 'b') });
  });

  test('Shift from a cell selects the rows from the row of the anchor cell', () => {
    expect(
      nextSelection(
        cells({ b: ['name'] }),
        cellCursor('b', 'name'),
        { rowId: 'd', columnId: 'email' },
        ROW_IDS,
        EXTEND
      )
    ).toEqual({ selection: rows('b', 'c', 'd'), ...cursor('b', 'd') });
  });

  test('Ctrl+Shift adds the range to the selected rows', () => {
    expect(
      nextSelection(
        rows('a', 'd'),
        cursor('d'),
        { rowId: 'e', columnId: 'id' },
        ROW_IDS,
        TOGGLE_EXTEND
      )
    ).toEqual({ selection: rows('a', 'd', 'e'), ...cursor('d', 'e') });
  });

  test('Ctrl+Shift from cells selects the rows alone, the cells dropped', () => {
    expect(
      nextSelection(
        cells({ b: ['name'], d: ['id'] }),
        cellCursor('b', 'name'),
        { rowId: 'd', columnId: 'email' },
        ROW_IDS,
        TOGGLE_EXTEND
      )
    ).toEqual({ selection: rows('b', 'c', 'd'), ...cursor('b', 'd') });
  });

  test('Shift with no anchor, or an anchor no longer shown, is a click', () => {
    const target = { rowId: 'c', columnId: 'name' };
    const clicked = {
      selection: cells({ c: ['name'] }),
      ...cellCursor('c', 'name'),
    };

    expect(
      nextSelection(NO_SELECTION, cursor(null), target, ROW_IDS, EXTEND)
    ).toEqual(clicked);

    expect(
      nextSelection(rows('z'), cursor('z'), target, ROW_IDS, EXTEND)
    ).toEqual(clicked);
  });
});

describe('nextSelectionByArrow', () => {
  const arrow = (step: GridStep, extend = false) => ({ step, extend });

  test('moves a lead row to the next row, which it selects alone, anchors and leads on', () => {
    expect(
      nextSelectionByArrow(
        cursor('a', 'b'),
        ROW_IDS,
        COLUMN_IDS,
        arrow(GridStep.Down)
      )
    ).toEqual({ selection: rows('c'), ...cursor('c') });

    expect(
      nextSelectionByArrow(cursor('b'), ROW_IDS, COLUMN_IDS, arrow(GridStep.Up))
    ).toEqual({ selection: rows('a'), ...cursor('a') });
  });

  test('moves a lead cell in the four directions, selecting it alone', () => {
    const from = cellCursor('b', 'name');

    expect(
      nextSelectionByArrow(from, ROW_IDS, COLUMN_IDS, arrow(GridStep.Down))
    ).toEqual({
      selection: cells({ c: ['name'] }),
      ...cellCursor('c', 'name'),
    });
    expect(
      nextSelectionByArrow(from, ROW_IDS, COLUMN_IDS, arrow(GridStep.Up))
    ).toEqual({
      selection: cells({ a: ['name'] }),
      ...cellCursor('a', 'name'),
    });
    expect(
      nextSelectionByArrow(from, ROW_IDS, COLUMN_IDS, arrow(GridStep.Left))
    ).toEqual({
      selection: cells({ b: ['id'] }),
      ...cellCursor('b', 'id'),
    });
    expect(
      nextSelectionByArrow(from, ROW_IDS, COLUMN_IDS, arrow(GridStep.Right))
    ).toEqual({
      selection: cells({ b: ['email'] }),
      ...cellCursor('b', 'email'),
    });
  });

  test('stays on the first and the last columns', () => {
    expect(
      nextSelectionByArrow(
        cellCursor('b', 'id'),
        ROW_IDS,
        COLUMN_IDS,
        arrow(GridStep.Left)
      )?.selection
    ).toEqual(cells({ b: ['id'] }));
    expect(
      nextSelectionByArrow(
        cellCursor('b', 'email'),
        ROW_IDS,
        COLUMN_IDS,
        arrow(GridStep.Right)
      )?.selection
    ).toEqual(cells({ b: ['email'] }));
  });

  test('← and → move nothing from a lead row, nor with Shift', () => {
    expect(
      nextSelectionByArrow(
        cursor('b'),
        ROW_IDS,
        COLUMN_IDS,
        arrow(GridStep.Right)
      )
    ).toBeNull();
    expect(
      nextSelectionByArrow(
        cellCursor('b', 'name'),
        ROW_IDS,
        COLUMN_IDS,
        arrow(GridStep.Right, true)
      )
    ).toBeNull();
  });

  test('from no row, or a row no longer shown, ↓ starts at the first row and ↑ at the last', () => {
    expect(
      nextSelectionByArrow(
        cursor(null),
        ROW_IDS,
        COLUMN_IDS,
        arrow(GridStep.Down)
      )?.leadId
    ).toBe('a');
    expect(
      nextSelectionByArrow(
        cursor(null, 'z'),
        ROW_IDS,
        COLUMN_IDS,
        arrow(GridStep.Up)
      )?.leadId
    ).toBe('e');
  });

  test('stays on the first and the last rows', () => {
    expect(
      nextSelectionByArrow(cursor('a'), ROW_IDS, COLUMN_IDS, arrow(GridStep.Up))
    ).toEqual({ selection: rows('a'), ...cursor('a') });
    expect(
      nextSelectionByArrow(
        cellCursor('e', 'id'),
        ROW_IDS,
        COLUMN_IDS,
        arrow(GridStep.Down)
      )?.selection
    ).toEqual(cells({ e: ['id'] }));
  });

  test('Shift selects the rows from the anchor, which shrink back towards it', () => {
    expect(
      nextSelectionByArrow(
        cursor('b', 'c'),
        ROW_IDS,
        COLUMN_IDS,
        arrow(GridStep.Down, true)
      )
    ).toEqual({ selection: rows('b', 'c', 'd'), ...cursor('b', 'd') });

    expect(
      nextSelectionByArrow(
        cursor('b', 'd'),
        ROW_IDS,
        COLUMN_IDS,
        arrow(GridStep.Up, true)
      )
    ).toEqual({ selection: rows('b', 'c'), ...cursor('b', 'c') });

    expect(
      nextSelectionByArrow(
        cursor('b'),
        ROW_IDS,
        COLUMN_IDS,
        arrow(GridStep.Up, true)
      )
    ).toEqual({ selection: rows('a', 'b'), ...cursor('b', 'a') });
  });

  test('Shift from a lead cell selects the rows from its row', () => {
    expect(
      nextSelectionByArrow(
        cellCursor('b', 'name'),
        ROW_IDS,
        COLUMN_IDS,
        arrow(GridStep.Down, true)
      )
    ).toEqual({ selection: rows('b', 'c'), ...cursor('b', 'c') });
  });

  test('Shift with no anchor moves as a plain arrow', () => {
    expect(
      nextSelectionByArrow(
        cursor(null, 'b'),
        ROW_IDS,
        COLUMN_IDS,
        arrow(GridStep.Down, true)
      )
    ).toEqual({ selection: rows('c'), ...cursor('c') });
  });

  test('a lead column no longer shown moves the row up and down, and nothing sideways', () => {
    const hidden = { anchorId: 'b', leadId: 'b', leadColumnId: 'gone' };

    expect(
      nextSelectionByArrow(hidden, ROW_IDS, COLUMN_IDS, arrow(GridStep.Down))
    ).toEqual({ selection: rows('c'), ...cursor('c') });
    expect(
      nextSelectionByArrow(hidden, ROW_IDS, COLUMN_IDS, arrow(GridStep.Right))
    ).toBeNull();
  });

  test('moves nowhere in a grid with no row', () => {
    expect(
      nextSelectionByArrow(cursor(null), [], COLUMN_IDS, arrow(GridStep.Down))
    ).toBeNull();
  });
});
