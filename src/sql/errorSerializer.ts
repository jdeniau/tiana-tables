import { QueryResult, QueryReturnType } from './types';

export type QueryResultOrError<T extends QueryReturnType = QueryReturnType> =
  Promise<
    | { result: Awaited<QueryResult<T>>; error: undefined }
    | { result: undefined; error: Error }
  >;

export interface SqlError extends Error {
  code: string;
  errno: number;
  sql: string;
  sqlMessage: string;
  sqlState: string;
}

interface ErrorWithSqlData extends Error {
  sqlError?: Omit<SqlError, 'name' | 'message'>;
}

function isSqlError(e: unknown): e is SqlError {
  return typeof e === 'object' && e !== null && 'code' in e && 'errno' in e;
}

export function encodeError(e: unknown): ErrorWithSqlData {
  if (typeof e === 'string') {
    return { name: 'Error', message: e };
  }

  if (isSqlError(e)) {
    return { name: e.name, message: e.message, sqlError: { ...e } };
  }

  if (e instanceof Error) {
    return e;
  }

  return {
    name: 'Unknown Error',
    message: 'Unknown error while executing the query',
  };
}

export function decodeError({
  name,
  message,
  sqlError,
}: ErrorWithSqlData): Error {
  if (sqlError) {
    return { name, message, ...sqlError };
  }

  const e = new Error(message);
  e.name = name;

  return e;
}
