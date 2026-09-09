import type { CSSProperties } from 'react';
import { css } from 'styled-components';

/**
 * Fill the parent, whatever it is. The three declarations answer three
 * different parents and only one of them ever decides the size:
 *
 * - `flex: 1` is `1 1 0%` — a definite basis, so in a flex container the size
 *   comes from grow/shrink and `height` is never consulted;
 * - `height: 100%` is what remains in a block of definite height, where `flex`
 *   means nothing: antd's `Form` and `Layout.Content` are both blocks;
 * - `min-height: 0` lifts the automatic minimum, without which an item cannot
 *   shrink below its own content.
 *
 * Reach for the three rather than a subset: a subset is inert in the parent it
 * does not cover, and what fails then is not the box but the scroller, which
 * quietly moves up the tree.
 */
export const fill = css`
  flex: 1;
  min-height: 0;
  height: 100%;
`;

/** The same rule for a component only reachable through a style object. */
export const fillStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  height: '100%',
};
