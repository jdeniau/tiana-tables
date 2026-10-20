import { describe, expect, test } from 'vitest';
import {
  RowStep,
  nextRowSelection,
  nextRowSelectionByArrow,
} from './rowSelectionGesture';

const ROW_IDS = ['a', 'b', 'c', 'd', 'e'];

const PLAIN = { toggle: false, extend: false };
const TOGGLE = { toggle: true, extend: false };
const EXTEND = { toggle: false, extend: true };
const TOGGLE_EXTEND = { toggle: true, extend: true };

describe('nextRowSelection', () => {
  test('a click selects the row alone, and anchors on it', () => {
    expect(
      nextRowSelection({ a: true, b: true }, 'a', 'c', ROW_IDS, PLAIN)
    ).toEqual({
      selection: { c: true },
      anchorId: 'c',
    });
  });

  test('a click on the only selected row deselects it, and drops the anchor', () => {
    expect(nextRowSelection({ c: true }, 'c', 'c', ROW_IDS, PLAIN)).toEqual({
      selection: {},
      anchorId: null,
    });
  });

  test('a click on one of several selected rows selects it alone', () => {
    expect(
      nextRowSelection({ b: true, c: true }, 'b', 'c', ROW_IDS, PLAIN)
    ).toEqual({ selection: { c: true }, anchorId: 'c' });
  });

  test('Ctrl adds a row, and anchors on it', () => {
    expect(nextRowSelection({ a: true }, 'a', 'c', ROW_IDS, TOGGLE)).toEqual({
      selection: { a: true, c: true },
      anchorId: 'c',
    });
  });

  test('Ctrl removes a selected row, and anchors on it', () => {
    expect(
      nextRowSelection({ a: true, c: true }, 'a', 'c', ROW_IDS, TOGGLE)
    ).toEqual({ selection: { a: true }, anchorId: 'c' });
  });

  test('Shift replaces the selection with the range from the anchor, either way', () => {
    expect(
      nextRowSelection({ a: true, b: true }, 'b', 'd', ROW_IDS, EXTEND)
    ).toEqual({ selection: { b: true, c: true, d: true }, anchorId: 'b' });

    expect(nextRowSelection({ d: true }, 'd', 'b', ROW_IDS, EXTEND)).toEqual({
      selection: { b: true, c: true, d: true },
      anchorId: 'd',
    });
  });

  test('Ctrl+Shift adds the range to the selection', () => {
    expect(
      nextRowSelection({ a: true, d: true }, 'd', 'e', ROW_IDS, TOGGLE_EXTEND)
    ).toEqual({ selection: { a: true, d: true, e: true }, anchorId: 'd' });
  });

  test('Shift with no anchor, or an anchor no longer shown, is a click', () => {
    expect(nextRowSelection({}, null, 'c', ROW_IDS, EXTEND)).toEqual({
      selection: { c: true },
      anchorId: 'c',
    });

    expect(nextRowSelection({ z: true }, 'z', 'c', ROW_IDS, EXTEND)).toEqual({
      selection: { c: true },
      anchorId: 'c',
    });
  });
});

describe('nextRowSelectionByArrow', () => {
  const DOWN = { step: RowStep.Down, extend: false };
  const UP = { step: RowStep.Up, extend: false };
  const SHIFT_DOWN = { step: RowStep.Down, extend: true };
  const SHIFT_UP = { step: RowStep.Up, extend: true };

  test('moves to the next row, which it selects alone, anchors and leads on', () => {
    expect(nextRowSelectionByArrow('a', 'b', ROW_IDS, DOWN)).toEqual({
      selection: { c: true },
      anchorId: 'c',
      leadId: 'c',
    });

    expect(nextRowSelectionByArrow('b', 'b', ROW_IDS, UP)).toEqual({
      selection: { a: true },
      anchorId: 'a',
      leadId: 'a',
    });
  });

  test('from no row, or a row no longer shown, ↓ starts at the first row and ↑ at the last', () => {
    expect(nextRowSelectionByArrow(null, null, ROW_IDS, DOWN)?.leadId).toBe(
      'a'
    );
    expect(nextRowSelectionByArrow(null, 'z', ROW_IDS, UP)?.leadId).toBe('e');
  });

  test('stays on the first and the last rows', () => {
    expect(nextRowSelectionByArrow('a', 'a', ROW_IDS, UP)).toEqual({
      selection: { a: true },
      anchorId: 'a',
      leadId: 'a',
    });
    expect(nextRowSelectionByArrow('e', 'e', ROW_IDS, DOWN)?.selection).toEqual(
      { e: true }
    );
  });

  test('Shift selects the range from the anchor, which shrinks back towards it', () => {
    expect(nextRowSelectionByArrow('b', 'c', ROW_IDS, SHIFT_DOWN)).toEqual({
      selection: { b: true, c: true, d: true },
      anchorId: 'b',
      leadId: 'd',
    });

    expect(nextRowSelectionByArrow('b', 'd', ROW_IDS, SHIFT_UP)).toEqual({
      selection: { b: true, c: true },
      anchorId: 'b',
      leadId: 'c',
    });

    expect(nextRowSelectionByArrow('b', 'b', ROW_IDS, SHIFT_UP)).toEqual({
      selection: { a: true, b: true },
      anchorId: 'b',
      leadId: 'a',
    });
  });

  test('Shift with no anchor moves as a plain arrow', () => {
    expect(nextRowSelectionByArrow(null, 'b', ROW_IDS, SHIFT_DOWN)).toEqual({
      selection: { c: true },
      anchorId: 'c',
      leadId: 'c',
    });
  });

  test('moves nowhere in a grid with no row', () => {
    expect(nextRowSelectionByArrow(null, null, [], DOWN)).toBeNull();
  });
});
