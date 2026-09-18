import type { Dialect } from '../types';
import { escapeIdentifier } from './escapeIdentifier';

export const mysqlDialect: Dialect = {
  escapeIdentifier,

  qualify: (databaseName, tableName) =>
    `${escapeIdentifier(databaseName)}.${escapeIdentifier(tableName)}`,

  useDatabase: (databaseName) => `USE ${escapeIdentifier(databaseName)};`,
};
