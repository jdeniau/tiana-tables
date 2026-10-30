import { DatabaseEngine } from '../../engine';
import { toHexDigits } from '../hex';
import { rowsClause } from '../primaryKeyClause';
import type { Dialect } from '../types';
import { escapeIdentifier, escapeLiteral } from './escape';
import { postgresGuardedUpdate } from './guardedUpdate';
import { postgresMetadata } from './metadata';

function qualify(schemaName: string, tableName: string): string {
  return `${escapeIdentifier(schemaName)}.${escapeIdentifier(tableName)}`;
}

/** The UI's database is a schema here: a connection opens one database and browses its schemas. */
export const postgresDialect: Dialect = {
  engine: DatabaseEngine.PostgreSQL,

  escapeIdentifier,

  qualify,

  // the schema alone, as `USE` does on MySQL:
  // a name found in no other schema must not resolve to `public` behind the user's back
  useDatabase: (schemaName) =>
    `SET search_path TO ${escapeIdentifier(schemaName)};`,

  escapeLiteral,

  booleanLiteral: (value) => (value ? 'TRUE' : 'FALSE'),

  // `decode` and not `'\x…'::bytea`: the latter reads differently when
  // `standard_conforming_strings` is off, and hex digits need no escaping
  bytesLiteral: (bytes) => `decode('${toHexDigits(bytes)}', 'hex')`,

  // the server refuses to create a schema named `pg_…`
  isSystemDatabase: (schemaName) =>
    schemaName.startsWith('pg_') || schemaName === 'information_schema',

  metadata: postgresMetadata,

  guardedUpdate: postgresGuardedUpdate,

  // no `LIMIT` on a `DELETE` here: the primary key targets one row each
  deleteRows: ({ database, table, rows }) => {
    const where = rowsClause(rows, escapeIdentifier);

    return {
      sql: `DELETE FROM ${qualify(database, table)} WHERE ${where.sql}`,
      values: where.values,
    };
  },
};
