import invariant from 'tiny-invariant';
import { DatabaseEngine } from '../engine';
import { mysqlDialect } from './mysql';
import type { Dialect } from './types';

const DIALECTS: Record<DatabaseEngine, Dialect> = {
  [DatabaseEngine.MySQL]: mysqlDialect,
};

/** The SQL text of an engine. Pure text, so both processes call it. */
export function getDialect(engine: DatabaseEngine): Dialect {
  const dialect = DIALECTS[engine];

  // nothing validates the configuration file, so an unknown engine reaches here
  invariant(dialect, `No dialect for engine "${engine}"`);

  return dialect;
}
