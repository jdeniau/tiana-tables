/** What the result tab shows of a statement the server refused. */
export interface SqlErrorData {
  code: string;
  /** MySQL's number for the error; PostgreSQL names it by `code` alone */
  errno?: number;
  sqlState?: string;
}

/** The `ErrorDetail` member this module contributes. */
export type SqlErrorDetail = { kind: 'sql' } & SqlErrorData;

/**
 * Tag a driver's error as a statement the server refused.
 * Thrown as-is, like `asConnectionError`: `encodeError` finds the detail built.
 */
export function asSqlError(
  error: Error,
  data: SqlErrorData
): Error & { detail: SqlErrorDetail } {
  return Object.assign(error, { detail: { kind: 'sql' as const, ...data } });
}

/** A refused statement as the renderer receives it: decoded flat. */
export type SqlError = Error & SqlErrorDetail;

export function isSqlError(e: unknown): e is SqlError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'kind' in e &&
    (e as { kind: unknown }).kind === 'sql'
  );
}
