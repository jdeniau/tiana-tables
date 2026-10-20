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

/** a cursor whose lead is its anchor, unless told otherwise */
function cursor(anchorId: string | null, leadId = anchorId) {
  return { anchorId, leadId };
}

describe('nextRowSelection', () => {
  test('a click selects the row alone, and anchors and leads on it', () => {
    expect(
      nextRowSelection({ a: true, b: true }, cursor('a'), 'c', ROW_IDS, PLAIN)
    ).toEqual({ selection: { c: true }, anchorId: 'c', leadId: 'c' });
  });

  test('a click on the only selected row deselects it, and drops the cursor', () => {
    expect(
      nextRowSelection({ c: true }, cursor('c'), 'c', ROW_IDS, PLAIN)
    ).toEqual({ selection: {}, anchorId: null, leadId: null });
  });

  test('a click on one of several selected rows selects it alone', () => {
    expect(
      nextRowSelection({ b: true, c: true }, cursor('b'), 'c', ROW_IDS, PLAIN)
    ).toEqual({ selection: { c: true }, anchorId: 'c', leadId: 'c' });
  });

  test('Ctrl adds a row, and anchors and leads on it', () => {
    expect(
      nextRowSelection({ a: true }, cursor('a'), 'c', ROW_IDS, TOGGLE)
    ).toEqual({ selection: { a: true, c: true }, anchorId: 'c', leadId: 'c' });
  });

  test('Ctrl removes a selected row, anchors on it, and keeps the lead', () => {
    expect(
      nextRowSelection(
        { a: true, b: true, c: true },
        cursor('a', 'b'),
        'c',
        ROW_IDS,
        TOGGLE
      )
    ).toEqual({ selection: { a: true, b: true }, anchorId: 'c', leadId: 'b' });
  });

  test('Shift replaces the selection with the range from the anchor, either way, and leads on the row clicked', () => {
    expect(
      nextRowSelection({ a: true, b: true }, cursor('b'), 'd', ROW_IDS, EXTEND)
    ).toEqual({
      selection: { b: true, c: true, d: true },
      anchorId: 'b',
      leadId: 'd',
    });

    expect(
      nextRowSelection({ d: true }, cursor('d'), 'b', ROW_IDS, EXTEND)
    ).toEqual({
      selection: { b: true, c: true, d: true },
      anchorId: 'd',
      leadId: 'b',
    });
  });

  test('Ctrl+Shift adds the range to the selection', () => {
    expect(
      nextRowSelection(
        { a: true, d: true },
        cursor('d'),
        'e',
        ROW_IDS,
        TOGGLE_EXTEND
      )
    ).toEqual({
      selection: { a: true, d: true, e: true },
      anchorId: 'd',
      leadId: 'e',
    });
  });

  test('Shift with no anchor, or an anchor no longer shown, is a click', () => {
    expect(nextRowSelection({}, cursor(null), 'c', ROW_IDS, EXTEND)).toEqual({
      selection: { c: true },
      anchorId: 'c',
      leadId: 'c',
    });

    expect(
      nextRowSelection({ z: true }, cursor('z'), 'c', ROW_IDS, EXTEND)
    ).toEqual({ selection: { c: true }, anchorId: 'c', leadId: 'c' });
  });
});

describe('nextRowSelectionByArrow', () => {
  const DOWN = { step: RowStep.Down, extend: false };
  const UP = { step: RowStep.Up, extend: false };
  const SHIFT_DOWN = { step: RowStep.Down, extend: true };
  const SHIFT_UP = { step: RowStep.Up, extend: true };

  test('moves to the next row, which it selects alone, anchors and leads on', () => {
    expect(nextRowSelectionByArrow(cursor('a', 'b'), ROW_IDS, DOWN)).toEqual({
      selection: { c: true },
      anchorId: 'c',
      leadId: 'c',
    });

    expect(nextRowSelectionByArrow(cursor('b'), ROW_IDS, UP)).toEqual({
      selection: { a: true },
      anchorId: 'a',
      leadId: 'a',
    });
  });

  test('from no row, or a row no longer shown, ↓ starts at the first row and ↑ at the last', () => {
    expect(nextRowSelectionByArrow(cursor(null), ROW_IDS, DOWN)?.leadId).toBe(
      'a'
    );
    expect(
      nextRowSelectionByArrow(cursor(null, 'z'), ROW_IDS, UP)?.leadId
    ).toBe('e');
  });

  test('stays on the first and the last rows', () => {
    expect(nextRowSelectionByArrow(cursor('a'), ROW_IDS, UP)).toEqual({
      selection: { a: true },
      anchorId: 'a',
      leadId: 'a',
    });
    expect(
      nextRowSelectionByArrow(cursor('e'), ROW_IDS, DOWN)?.selection
    ).toEqual({ e: true });
  });

  test('Shift selects the range from the anchor, which shrinks back towards it', () => {
    expect(
      nextRowSelectionByArrow(cursor('b', 'c'), ROW_IDS, SHIFT_DOWN)
    ).toEqual({
      selection: { b: true, c: true, d: true },
      anchorId: 'b',
      leadId: 'd',
    });

    expect(
      nextRowSelectionByArrow(cursor('b', 'd'), ROW_IDS, SHIFT_UP)
    ).toEqual({ selection: { b: true, c: true }, anchorId: 'b', leadId: 'c' });

    expect(nextRowSelectionByArrow(cursor('b'), ROW_IDS, SHIFT_UP)).toEqual({
      selection: { a: true, b: true },
      anchorId: 'b',
      leadId: 'a',
    });
  });

  test('Shift with no anchor moves as a plain arrow', () => {
    expect(
      nextRowSelectionByArrow(cursor(null, 'b'), ROW_IDS, SHIFT_DOWN)
    ).toEqual({ selection: { c: true }, anchorId: 'c', leadId: 'c' });
  });

  test('moves nowhere in a grid with no row', () => {
    expect(nextRowSelectionByArrow(cursor(null), [], DOWN)).toBeNull();
  });
});
