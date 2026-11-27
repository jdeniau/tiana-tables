import {
  DatabaseSync,
  type SQLOutputValue,
  type StatementColumnMetadata,
  type StatementSync,
} from 'node:sqlite';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import type { Driver, FileConnectionParams } from '..';
import type { ResultField } from '../../resultField';
import { asSqlError } from '../../sqlError';
import type { SqlBoundValues, WriteResult } from '../../types';
import { toFieldKind } from './fieldKind';
import { SqliteErrorCode } from './sqliteErrorCode';

/** How long a statement waits for another process's lock, the main process frozen meanwhile. */
const BUSY_TIMEOUT_MS = 1000;

/** SQLite's primary result codes an opening fails with, by the code the stack classifies. */
const OPEN_FAILURES: ReadonlyMap<number, SqliteErrorCode> = new Map([
  [14, SqliteErrorCode.CannotOpen],
  [26, SqliteErrorCode.NotADatabase],
]);

/** What may follow a statement and run nothing: blanks, `;` and comments, an unclosed `/*` included. */
const NOTHING_TO_RUN =
  /^(?:[\s;]|--[^\n]*(?:\n|$)|\/\*(?:(?!\*\/)[\s\S])*(?:\*\/|$))*$/;

const MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER);

const countersRow = z.object({ total: z.bigint(), rowid: z.bigint() });

interface SqliteError extends Error {
  /** the extended result code: `1555` is a primary key's `SQLITE_CONSTRAINT` (`19`) */
  errcode: number;
  /** SQLite's words for the primary code: `constraint failed` */
  errstr: string;
}

function isSqliteError(error: unknown): error is SqliteError {
  return (
    error instanceof Error &&
    'errcode' in error &&
    typeof error.errcode === 'number' &&
    'errstr' in error &&
    typeof error.errstr === 'string'
  );
}

/** A statement SQLite refused, named by its words and its number, as MySQL's are. */
function asStatementError(error: unknown): unknown {
  return isSqliteError(error)
    ? asSqlError(error, { code: error.errstr, errno: error.errcode })
    : error;
}

/** An opening SQLite refused, under the code that says why. */
function asOpenFailure(error: unknown): unknown {
  // the primary code is the low byte of the extended one
  const code = isSqliteError(error) && OPEN_FAILURES.get(error.errcode & 0xff);

  return code ? Object.assign(error, { code }) : error;
}

/** An integer as the app reads it: past 2^53, as its decimal text, which a number would round. */
function toAppInteger(value: bigint): number | string {
  return value > MAX_SAFE_INTEGER || value < -MAX_SAFE_INTEGER
    ? String(value)
    : Number(value);
}

/** A row with its integers read as the app reads them, converted in place: an array row too. */
function toAppRow(
  row: Record<string, SQLOutputValue>
): Record<string, SQLOutputValue> {
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'bigint') {
      row[key] = toAppInteger(value);
    }
  }

  return row;
}

function toResultFields(
  columns: Array<StatementColumnMetadata>
): Array<ResultField> {
  return columns.map((column) => ({
    name: column.name,
    // the table itself, not its alias, as PostgreSQL answers it
    table: column.table,
    kind: toFieldKind(column.type),
  }));
}

/** `prepare` reads the first statement of a text, and leaves the rest unrun. */
function assertOneStatement(sql: string, statement: StatementSync): void {
  if (!NOTHING_TO_RUN.test(sql.slice(statement.sourceSQL.length))) {
    throw asSqlError(new Error('Only one statement can be sent at a time'), {
      code: SqliteErrorCode.MultipleStatements,
    });
  }
}

/** The file, refused when missing rather than created empty, and when not a database. */
function open(file: string): DatabaseSync {
  const location = pathToFileURL(file);

  location.searchParams.set('mode', 'rw');

  const database = new DatabaseSync(location, {
    // without it, reading an integer past 2^53 throws
    readBigInts: true,
    timeout: BUSY_TIMEOUT_MS,
    // as on the other engines, where the sqlite3 shell leaves them off
    enableForeignKeyConstraints: true,
  });

  try {
    // a file of another kind opens all the same: its first read tells
    database.prepare('SELECT count(*) FROM sqlite_schema').get();
  } catch (error) {
    database.close();

    throw error;
  }

  return database;
}

/** SQLite through `node:sqlite`, synchronous, in the main process. */
export const sqliteDriver: Driver<FileConnectionParams> = {
  async connect({ file }) {
    let database: DatabaseSync;

    try {
      database = open(file);
    } catch (error) {
      throw asOpenFailure(error);
    }

    const counters = database.prepare(
      'SELECT total_changes() AS total, last_insert_rowid() AS rowid'
    );

    function write(
      statement: StatementSync,
      values: SqlBoundValues | undefined
    ): WriteResult {
      const before = countersRow.parse(counters.get());
      const { changes } = values ? statement.run(values) : statement.run();
      const after = countersRow.parse(counters.get());

      return {
        // after a statement that wrote no row (a `CREATE TABLE`), `changes` still counts the write before it
        affectedRows: after.total === before.total ? 0 : Number(changes),
        // `last_insert_rowid()` is left as it was by every statement but an INSERT
        insertId:
          after.rowid === before.rowid ? null : toAppInteger(after.rowid),
      };
    }

    return {
      query: async ({ sql, values, rowsAsArray }) => {
        try {
          const statement = database.prepare(sql);

          assertOneStatement(sql, statement);

          const fields = toResultFields(statement.columns());

          if (fields.length === 0) {
            return [write(statement, values), fields];
          }

          // answered as arrays, which `@types/node` still types as records
          statement.setReturnArrays(rowsAsArray);

          const rows = values ? statement.all(values) : statement.all();

          return [rows.map(toAppRow), fields];
        } catch (error) {
          throw asStatementError(error);
        }
      },

      end: async () => database.close(),

      // a file has no socket to lose
      isConnectionLost: () => false,
    };
  },
};
