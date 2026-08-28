import type { ColumnMeta } from '../TableGrid';

/** What a secondary click on a body cell offers to filter on. */
export interface CellFilterTarget {
  column: ColumnMeta;
  value: unknown;
  /** viewport coordinates of the click, where the menu opens */
  x: number;
  y: number;
}
