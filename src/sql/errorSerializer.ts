import { ConnectionErrorDetail } from './connectionError';
import { isSqlError } from './isSqlError';
import { QueryResult, QueryReturnType } from './types';

/**
 * The envelope every handler answers with: an error crossing IPC loses
 * everything but its message, so it travels encoded next to the result rather
 * than being thrown (see `encodeError`).
 */
export type ResultOrError<T> = Promise<
  { result: T; error: undefined } | { result: undefined; error: Error }
>;

export type QueryResultOrError<T extends QueryReturnType = QueryReturnType> =
  ResultOrError<Awaited<QueryResult<T>>>;

export interface SqlError extends Error {
  code: string;
  errno: number;
  sql: string;
  sqlMessage: string;
  sqlState: string;
}

/**
 * What an error knows about itself beyond its message, tagged by what it
 * describes. One slot, because an error is one thing: a query the server
 * refused, or a connection that never opened.
 */
type ErrorDetail =
  | ({ kind: 'sql' } & Omit<SqlError, 'name' | 'message'>)
  | ConnectionErrorDetail;

/** An error on its way through IPC: error-shaped, plus its detail. */
export interface ErrorWithDetail extends Error {
  detail?: ErrorDetail;
}

/**
 * An error that already knows what it is — a connection failure tagged by
 * `asConnectionError`. `encodeError` passes its detail through rather than
 * rebuilding one.
 */
function hasErrorDetail(e: unknown): e is Error & { detail: ErrorDetail } {
  return e instanceof Error && 'detail' in e;
}

/**
 * This is a hack to encode the error object to be sent over IPC.
 * If we don't do that, the error object will only contain `message`, `name` and `stack` properties.
 *
 * Use `decodeError` to decode the error object on the renderer side.
 */
export function encodeError(e: unknown): ErrorWithDetail {
  if (typeof e === 'string') {
    return { name: 'Error', message: e };
  }

  // Before `isSqlError`: an access denied is both, and which host refused us
  // is what the user can act on. The detail is already built in that case.
  if (hasErrorDetail(e)) {
    return { name: e.name, message: e.message, detail: e.detail };
  }

  if (isSqlError(e)) {
    return { name: e.name, message: e.message, detail: { kind: 'sql', ...e } };
  }

  if (e instanceof Error) {
    return e;
  }

  return {
    name: 'Unknown Error',
    message: 'Unknown error while executing the query',
  };
}

/**
 * Used to decode an error that have been encoded using `encodeError`.
 *
 * The detail is spread flat, which is the shape every consumer reads —
 * `isSqlError` tests `code` and `errno` on the error itself, and
 * `SqlErrorComponent` prints them the same way. And the result is a plain
 * object, never an `Error`: what is thrown here is thrown from the preload, so
 * it crosses the context bridge, and the bridge rebuilds an `Error` from its
 * `name`, `message` and `stack` alone — a property added to one is dropped on
 * the way, in silence. A plain object is cloned whole.
 */
export function decodeError({
  name,
  message,
  detail,
}: ErrorWithDetail): ErrorWithDetail {
  if (detail) {
    return { name, message, ...detail };
  }

  const e = new Error(message);
  e.name = name;

  return e;
}
