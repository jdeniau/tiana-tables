import { useCallback, useRef } from 'react';
import { css, keyframes } from 'styled-components';
import { background, stringForeground } from '../theme';

/**
 * The flash of a written cell: a closed modal and a patched value are too
 * quiet a sign that the server took the edit, so the cell is tinted in the
 * diff-inserted colour, held a moment, then let go.
 *
 * The mark is an attribute set on the `<td>` itself, not a prop threaded
 * through the memoized rows: one cell's ornament then costs no other row a
 * comparison, and `TableGrid` only has to remember which cell an edit was
 * opened from (see the performance note there).
 */

/** the attribute the grid's stylesheet keys the animation on */
const WRITTEN_ATTRIBUTE = 'data-written';

/** how long a written cell keeps its mark */
const FLASH_MS = 2400;

// A `@keyframes` block cannot take a value per theme, so it reads two
// variables that the rule below fills from the palette.
const writtenFlash = keyframes`
  0%, 25% {
    background: var(--tg-written);
  }
  100% {
    background: var(--tg-bg);
  }
`;

/** The rule to include in the stylesheet of the grid's cells. */
export const writtenCellFlashStyle = css`
  .tg-cell[${WRITTEN_ATTRIBUTE}] {
    --tg-bg: ${background};
    --tg-written: color-mix(in srgb, ${stringForeground} 35%, ${background});
    animation: ${writtenFlash} ${FLASH_MS}ms ease-out;
  }
`;

/**
 * `rememberCell` takes the `<td>` an edit is opened from; `flashCell` marks it
 * once the value is written. The mark is dropped when the animation ends, so
 * that writing the same cell again replays it.
 */
export function useWrittenCellFlash(): {
  rememberCell: (cell: HTMLTableCellElement) => void;
  flashCell: () => void;
} {
  const cellRef = useRef<HTMLTableCellElement | null>(null);

  const rememberCell = useCallback((cell: HTMLTableCellElement) => {
    cellRef.current = cell;
  }, []);

  const flashCell = useCallback(() => {
    const cell = cellRef.current;

    if (!cell) {
      return;
    }

    cell.setAttribute(WRITTEN_ATTRIBUTE, '');
    cell.addEventListener(
      'animationend',
      () => cell.removeAttribute(WRITTEN_ATTRIBUTE),
      { once: true }
    );
  }, []);

  return { rememberCell, flashCell };
}
