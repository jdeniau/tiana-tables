import {
  ConflictReason,
  type PrimaryKeyPart,
  type UpdateCellOutcome,
  UpdateCellStatus,
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
  /** a write made outside the modal that did not land: the modal opens on it */
  unsettledWrite?: UnsettledWrite;
}

/**
 * A write the grid attempted on its own — the context menu's "Set to NULL" —
 * and could not complete. It is settled in the modal, the one place that knows
 * how to reload a conflict or overwrite it.
 */
interface UnsettledWrite {
  newValue: string | null;
  conflict: Conflict | null;
  error: string | null;
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
  | { reason: ConflictReason.Changed; currentValue: unknown }
  | { reason: ConflictReason.Deleted };

/** The conflict an outcome reports, `null` when the write landed. */
export function conflictOf(outcome: UpdateCellOutcome): Conflict | null {
  if (outcome.status === UpdateCellStatus.Updated) {
    return null;
  }

  return outcome.reason === ConflictReason.Deleted
    ? { reason: ConflictReason.Deleted }
    : { reason: ConflictReason.Changed, currentValue: outcome.currentValue };
}
