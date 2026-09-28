import { DatabaseEngine } from '../../engine';
import { toHexDigits } from '../hex';
import type { Dialect } from '../types';
import { escapeIdentifier, escapeLiteral } from './escape';
import { postgresGuardedUpdate } from './guardedUpdate';
import { postgresMetadata } from './metadata';

/** The UI's database is a schema here: a connection opens one database and browses its schemas. */
export const postgresDialect: Dialect = {
  engine: DatabaseEngine.PostgreSQL,

  escapeIdentifier,

  qualify: (schemaName, tableName) =>
    `${escapeIdentifier(schemaName)}.${escapeIdentifier(tableName)}`,

  // the schema alone, as `USE` does on MySQL:
  // a name found in no other schema must not resolve to `public` behind the user's back
  useDatabase: (schemaName) =>
    `SET search_path TO ${escapeIdentifier(schemaName)};`,

  escapeLiteral,

  booleanLiteral: (value) => (value ? 'TRUE' : 'FALSE'),

  // `decode` and not `'\x…'::bytea`: the latter reads differently when
  // `standard_conforming_strings` is off, and hex digits need no escaping
  bytesLiteral: (bytes) => `decode('${toHexDigits(bytes)}', 'hex')`,

  metadata: postgresMetadata,

  guardedUpdate: postgresGuardedUpdate,
};
