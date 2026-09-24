import type { SqlBoundValue } from './types';

/**
 * The contract of writing one cell: what the renderer asks for, and what it is
 * told happened. Kept apart from `types.ts`, which describes the shapes MySQL
 * answers with — these describe an action, and they cross IPC as such.
 */

/**
 * The value of a primary key part. `NULL` is excluded on purpose: MySQL forces
 * `NOT NULL` on every column of a `PRIMARY KEY`, so a key part never holds one.
 */
type PrimaryKeyValue = Exclude<SqlBoundValue, null>;

/** One primary key column of a row, with the value the row was loaded with. */
export interface PrimaryKeyPart {
  column: string;
  value: PrimaryKeyValue;
}

export interface UpdateCellRequest {
  database: string;
  table: string;
  column: string;
  /** every primary key column of the row: what makes the UPDATE target one row */
  primaryKey: Array<PrimaryKeyPart>;
  newValue: string | null;
  /** the value the cell held when the row was loaded, guarding the write */
  originalValue: SqlBoundValue;
  /** JSON columns compare as JSON, so that key order and spacing don't matter */
  isJsonColumn?: boolean;
  /** skip the guard: the user saw the conflict and chose to overwrite anyway */
  force?: boolean;
}

/** Whether an edit was written. */
export enum UpdateCellStatus {
  Updated = 'updated',
  Conflict = 'conflict',
}

/** Why a guarded write found the row in a state the editor was not opened on. */
export enum ConflictReason {
  /** the cell no longer holds what the grid showed */
  Changed = 'changed',
  /** the row is gone */
  Deleted = 'deleted',
}

/**
 * What became of an edit. `updated` carries the value read back from the
 * server, which is the value the grid must now display — the string that was
 * written is not it (a `DATETIME` comes back as a `Date`, a `DECIMAL` rounded
 * to its scale, a JSON column normalized).
 */
export type UpdateCellOutcome =
  | { status: UpdateCellStatus.Updated; value: unknown }
  | {
      status: UpdateCellStatus.Conflict;
      reason: ConflictReason.Changed;
      currentValue: unknown;
    }
  | { status: UpdateCellStatus.Conflict; reason: ConflictReason.Deleted };
