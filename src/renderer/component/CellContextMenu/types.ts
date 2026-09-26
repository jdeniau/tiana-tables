import type { CellDetail } from '../CellDetailModal';
import type { RowCell } from './rowFormats';

/**
 * The cell a secondary click was made on: what the detail modal would open on,
 * plus where the menu opens.
 */
export interface CellMenuTarget extends CellDetail {
  /** every value of the row, for the entries that copy it whole */
  row: Array<RowCell>;
  /** viewport coordinates of the click, where the menu opens */
  x: number;
  y: number;
}
