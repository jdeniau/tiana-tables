import type { UpdateCellOutcome } from '../../../sql/updateCell';
import type { CellDetail } from '../CellDetailModal';

/** A value to write in one cell, guarded on the value it was loaded with. */
export interface CellWrite {
  detail: CellDetail;
  newValue: string | null;
  /** the value the write is guarded on: what the cell held when it was loaded */
  originalValue: unknown;
}

export interface SaveCellParams extends CellWrite {
  /** skip the guard: the user saw the conflict and chose to overwrite anyway */
  force: boolean;
}

export type SaveCell = (params: SaveCellParams) => Promise<UpdateCellOutcome>;
