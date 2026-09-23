import type { DatabaseEngine } from '../engine';
import type { QueryReturnType } from '../types';
import type { UpdateCellOutcome, UpdateCellRequest } from '../updateCell';
import type { DialectMetadata } from './metadata';
import type { BuiltQuery, ReadQuery } from './readQuery';

/**
 * The edited cell as read back after the write:
 * its value, and whether the guard still holds.
 */
interface CellRead {
  value: unknown;
  guardMatches: boolean;
}

/**
 * Writing one cell only if it still holds what the grid showed,
 * and telling what became of it.
 */
export interface GuardedUpdate {
  write: BuiltQuery;

  /** Settled by the write alone, or `undefined` when the read-back must tell. */
  outcomeOfWrite(written: QueryReturnType): UpdateCellOutcome | undefined;

  /** The cell after the write, `undefined` when its row is gone. */
  readBack: ReadQuery<CellRead | undefined>;

  outcomeOfReadBack(
    written: QueryReturnType,
    read: CellRead | undefined
  ): UpdateCellOutcome;
}

/**
 * The SQL text that differs from one server to another.
 *
 * No driver import belongs here: the renderer builds SQL of its own, so it
 * loads this too.
 */
export interface Dialect {
  /** The engine this text is written for, which also picks its grammar. */
  engine: DatabaseEngine;

  /** Quote one identifier; the caller assembles the qualification itself. */
  escapeIdentifier(identifier: string): string;

  /** A table named by its database: `` `db`.`t` `` on MySQL. */
  qualify(databaseName: string, tableName: string): string;

  /** The statement making unqualified names resolve in `databaseName`. */
  useDatabase(databaseName: string): string;

  /** Quote a string so it reads as one value, whatever it holds. */
  escapeLiteral(text: string): string;

  /** How this server spells a boolean in a comparison. */
  booleanLiteral(value: boolean): string;

  /** What the app asks this server about itself. */
  metadata: DialectMetadata;

  guardedUpdate(request: UpdateCellRequest): GuardedUpdate;
}
