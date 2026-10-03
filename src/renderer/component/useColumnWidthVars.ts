import { RefObject, useLayoutEffect } from 'react';
import type { ColumnPinningState, Table } from '@tanstack/react-table';
import type { ResultRow } from '../../sql/types';
import type { GridFeatures } from './TableGrid';

// A width reaches the cells as a custom property on the table, written
// imperatively rather than rendered — TanStack's own recipe for resizing a
// large grid (`examples/react/column-resizing-performant`). With the grid
// subscribed to no table state, a drag costs no React render at all.
export const widthVar = (index: number): string => `--tg-w-${index}`;
export const leftVar = (index: number): string => `--tg-l-${index}`;

type Options<Row extends ResultRow> = {
  table: Table<GridFeatures, Row>;
  tableRef: RefObject<HTMLTableElement | null>;
  /** what rewrites the widths when the columns change */
  columns: unknown;
  columnPinning: ColumnPinningState;
  onColumnResized: ((columnName: string, width: number) => void) | undefined;
};

/** keeps `widthVar` and `leftVar` of every column on the table element, and reports the width a drag ends on */
export function useColumnWidthVars<Row extends ResultRow>({
  table,
  tableRef,
  columns,
  columnPinning,
  onColumnResized,
}: Options<Row>): void {
  useLayoutEffect(() => {
    const element = tableRef.current;

    if (!element) {
      return undefined;
    }

    const writeWidths = (): void => {
      table.getAllLeafColumns().forEach((column, index) => {
        element.style.setProperty(widthVar(index), `${column.getSize()}px`);

        if (column.getIsPinned() === 'start') {
          element.style.setProperty(
            leftVar(index),
            `${column.getStart('start')}px`
          );
        }
      });
    };

    writeWidths();

    const sizes = table.atoms.columnSizing.subscribe(writeWidths);

    // `columnResizing` names the column being dragged, and drops it on
    // release: that transition is the end of the drag, and the width the user
    // settled on is the one to remember.
    let dragged: string | false = false;

    const drags = table.atoms.columnResizing.subscribe(
      ({ isResizingColumn }) => {
        const column = dragged ? table.getColumn(dragged) : undefined;

        if (column && !isResizingColumn) {
          onColumnResized?.(column.id, column.getSize());
        }

        dragged = isResizingColumn;
      }
    );

    return () => {
      sizes.unsubscribe();
      drags.unsubscribe();
    };
  }, [table, columns, columnPinning, onColumnResized]);
}
