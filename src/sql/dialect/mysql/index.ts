import { escape } from 'mysql';
import type { Dialect } from '../types';
import { escapeIdentifier } from './escapeIdentifier';
import { mysqlGuardedUpdate } from './guardedUpdate';
import { mysqlMetadata } from './metadata';

export const mysqlDialect: Dialect = {
  escapeIdentifier,

  qualify: (databaseName, tableName) =>
    `${escapeIdentifier(databaseName)}.${escapeIdentifier(tableName)}`,

  useDatabase: (databaseName) => `USE ${escapeIdentifier(databaseName)};`,

  // the driver's own escaping, which delegates to `sqlstring` — the package
  // mysql2 escapes with too. `mysql` and never `mysql2`: the renderer calls
  // this, and mysql2 is CommonJS. Narrowed to a string on purpose: `escape`
  // takes `any`, and its object branch calls `Buffer.isBuffer`, undefined in
  // the renderer, while its `Date` branch shifts the value into a time zone it
  // never had.
  escapeLiteral: (text) => escape(text),

  // MySQL has no boolean type: `TRUE` is a synonym of `1`, and a column holding
  // one is a `TINYINT(1)` the driver hands over as a number
  booleanLiteral: (value) => (value ? '1' : '0'),

  metadata: mysqlMetadata,

  guardedUpdate: mysqlGuardedUpdate,
};
