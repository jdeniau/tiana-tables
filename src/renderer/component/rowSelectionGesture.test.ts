import { describe, expect, test } from 'vitest';
import { nextRowSelection } from './rowSelectionGesture';

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
