import type { RowDataPacket } from 'mysql2/promise';
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
export type PrimaryKeyValue = Exclude<SqlBoundValue, null>;

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

/**
 * What became of an edit. `updated` carries the value read back from the
 * server, which is the value the grid must now display — the string that was
 * written is not it (a `DATETIME` comes back as a `Date`, a `DECIMAL` rounded
 * to its scale, a JSON column normalized).
 */
export type UpdateCellOutcome =
  | { status: 'updated'; value: unknown }
  | { status: 'conflict'; reason: 'changed'; currentValue: unknown }
  | { status: 'conflict'; reason: 'deleted' };

/**
 * One row of the read-back query of `buildReadCellQuery`. A result shape, but
 * one that exists only to serve this action, so it lives with it.
 */
export interface CellReadRow extends RowDataPacket {
  value: unknown;
  /** 1 when the cell still holds the value the guard was built on, 0 otherwise */
  guardMatches: number;
}
