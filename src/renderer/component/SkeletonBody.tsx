import { ReactElement } from 'react';
import { css, keyframes, styled } from 'styled-components';
import { backgroundAlt, size } from '../theme';
import type { ColumnMeta } from './TableGrid';

const ROW_HEIGHT = parseInt(size.row, 10);

/** enough to fill a region while the first page is on its way */
const SKELETON_ROW_COUNT = 20;

/** a query answering within it shows no skeleton, rather than a flash of one */
const SKELETON_DELAY_MS = 150;

// shown after the delay only: `both` holds the first frame until then, the last one after
const skeletonAppear = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

// base01 fading towards the background, which the cell is
const skeletonPulse = keyframes`
  50% {
    opacity: 0.4;
  }
`;

/** The rule to include in the stylesheet of the grid's cells. */
export const skeletonStyle = css`
  .tg-skeleton-row {
    pointer-events: none;
    animation: ${skeletonAppear} 0s ${SKELETON_DELAY_MS}ms both;
  }

  .tg-skeleton {
    width: 60%;
    height: 1em;
    background: ${backgroundAlt};
    animation: ${skeletonPulse} 1.4s ease-in-out infinite;
  }

  .tg-skeleton-row:nth-child(3n + 1) .tg-skeleton {
    width: 80%;
  }

  .tg-skeleton-row:nth-child(3n + 2) .tg-skeleton {
    width: 45%;
  }
`;

const Tbody = styled.tbody`
  display: grid;
  position: relative;
  height: ${SKELETON_ROW_COUNT * ROW_HEIGHT}px;
`;

/** The grid's body while its rows are on their way: a bar in each cell of the columns. */
export default function SkeletonBody({
  columnsMeta,
}: {
  columnsMeta: Array<ColumnMeta>;
}): ReactElement {
  return (
    <Tbody>
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
        <tr
          key={index}
          className="tg-row tg-skeleton-row"
          style={{ transform: `translateY(${index * ROW_HEIGHT}px)` }}
        >
          {columnsMeta.map((column) => (
            <td
              key={column.id}
              className={
                column.pinnedLeft === null ? 'tg-cell' : 'tg-cell tg-pinned'
              }
              data-last-pinned={column.isLastPinned || undefined}
              style={{
                width: column.width,
                left: column.pinnedLeft ?? undefined,
              }}
            >
              <span className="tg-skeleton" />
            </td>
          ))}
        </tr>
      ))}
    </Tbody>
  );
}
