import type { CellDetail } from '../CellDetailModal';

/**
 * The cell a secondary click was made on: what the detail modal would open on,
 * plus where the menu opens.
 */
export interface CellMenuTarget extends CellDetail {
  /** viewport coordinates of the click, where the menu opens */
  x: number;
  y: number;
}
