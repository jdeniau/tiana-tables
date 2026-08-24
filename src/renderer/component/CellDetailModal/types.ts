import type {
  PrimaryKeyPart,
  UpdateCellOutcome,
} from '../../../sql/updateCell';
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

export interface SaveCellParams {
  detail: CellDetail;
  newValue: string | null;
  /**
   * The value the write is guarded on. Not always `detail.value`: reloading a
   * reported conflict moves the guard onto the value the server now holds.
   */
  originalValue: unknown;
  force: boolean;
}

export type SaveCell = (params: SaveCellParams) => Promise<UpdateCellOutcome>;

/** Why a write found the row in a state the editor was not opened on. */
export type Conflict =
  | { reason: 'changed'; currentValue: unknown }
  | { reason: 'deleted' };
