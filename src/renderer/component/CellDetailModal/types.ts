import type { PrimaryKeyPart } from '../../../sql/updateCell';
import type { ColumnMeta } from '../TableGrid';

export interface CellDetail {
  value: unknown;
  column: ColumnMeta;
  /**
   * The primary key of the row, or `null` when nothing identifies it — a raw
   * query, or a table without a primary key. Without it no UPDATE can target
   * the row, so the value can only be read.
   */
  rowKey: Array<PrimaryKeyPart> | null;
  /** where the row sits in the loaded result, to refresh it after a write */
  rowIndex: number;
}
