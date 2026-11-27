import { MAX_LABEL_LENGTH } from '../../selectLabels';
import { toHexDigits } from '../hex';
import {
  keysInClause,
  primaryKeyClause,
  rowsClause,
} from '../primaryKeyClause';
import type { Dialect } from '../types';
import { escapeIdentifier, escapeLiteral } from './escape';
import { sqliteGuardedUpdate } from './guardedUpdate';
import { sqliteMetadata } from './metadata';

function qualify(databaseName: string, tableName: string): string {
  return `${escapeIdentifier(databaseName)}.${escapeIdentifier(tableName)}`;
}

/** A connection opens one file, which the UI lists as its one database, `main`. */
export const sqliteDialect: Omit<Dialect, 'engine'> = {
  escapeIdentifier,

  qualify,

  escapeLiteral,

  // what a BOOLEAN column holds: SQLite has no boolean, `TRUE` is only another way to write `1`
  booleanLiteral: (value) => (value ? '1' : '0'),

  bytesLiteral: (bytes) => `X'${toHexDigits(bytes)}'`,

  // `main` is the only database listed, and the user's own file
  isSystemDatabase: () => false,

  metadata: sqliteMetadata,

  guardedUpdate: sqliteGuardedUpdate,

  // no `LIMIT` on a `DELETE`: SQLite reads one only when compiled for it, and Node's is not
  deleteRows: ({ database, table, rows }) => {
    const where = rowsClause(rows, escapeIdentifier);

    return {
      sql: `DELETE FROM ${qualify(database, table)} WHERE ${where.sql}`,
      values: where.values,
    };
  },

  selectRow: ({ database, table, key }) => {
    const where = primaryKeyClause(key, escapeIdentifier, 'key');

    return {
      sql: `SELECT * FROM ${qualify(database, table)} WHERE ${where.sql} LIMIT 1`,
      values: where.values,
    };
  },

  selectLabels: ({ database, table, keyColumn, labelColumn, keys }) => {
    const where = keysInClause(keyColumn, keys, escapeIdentifier);

    return {
      sql:
        `SELECT ${escapeIdentifier(keyColumn)}, substr(CAST(${escapeIdentifier(labelColumn)} AS TEXT), 1, ${MAX_LABEL_LENGTH}) ` +
        `FROM ${qualify(database, table)} WHERE ${where.sql}`,
      values: where.values,
    };
  },

  selectLabelColumn: ({ database, table, labelColumn }) => ({
    sql: `SELECT ${escapeIdentifier(labelColumn)} FROM ${qualify(database, table)} LIMIT 0`,
    values: {},
  }),
};
