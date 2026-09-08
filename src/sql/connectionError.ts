/**
 * Why a connection could not be opened, in the terms the user can act on.
 *
 * The driver only hands over a network `code`, and one of them (`ETIMEDOUT`)
 * is built by mysql2 itself with `err.errorno` rather than `errno` — so
 * `isSqlError` does not recognise it, and the code would be lost on its way
 * through IPC. The failure is therefore named here, in the main process, while
 * the original error is still whole.
 */
export enum ConnectionFailure {
  timeout = 'timeout',
  refused = 'refused',
  unknownHost = 'unknownHost',
  accessDenied = 'accessDenied',
  other = 'other',
}

/** What the renderer needs to tell the user what happened, and to what. */
export interface ConnectionErrorData {
  reason: ConnectionFailure;
  host: string;
  port: number;
  /** the deadline we gave up after, so the message can name it */
  timeoutMs: number;
}

/** The `ErrorDetail` member this module contributes. */
export type ConnectionErrorDetail = {
  kind: 'connection';
} & ConnectionErrorData;

function errorCode(e: unknown): string | undefined {
  if (typeof e === 'object' && e !== null && 'code' in e) {
    const { code } = e as { code: unknown };

    return typeof code === 'string' ? code : undefined;
  }

  return undefined;
}

export function classifyConnectionError(e: unknown): ConnectionFailure {
  switch (errorCode(e)) {
    case 'ETIMEDOUT':
    case 'PROTOCOL_SEQUENCE_TIMEOUT':
      return ConnectionFailure.timeout;

    case 'ECONNREFUSED':
      return ConnectionFailure.refused;

    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      return ConnectionFailure.unknownHost;

    case 'ER_ACCESS_DENIED_ERROR':
    case 'ER_DBACCESS_DENIED_ERROR':
    case 'ER_NOT_SUPPORTED_AUTH_MODE':
      return ConnectionFailure.accessDenied;

    default:
      return ConnectionFailure.other;
  }
}

/**
 * Tag the driver's error with what it means, keeping its message as the detail.
 *
 * The result is thrown as-is: `encodeError` finds the detail already built,
 * and `decodeError` spreads it flat for the renderer to read.
 */
export function asConnectionError(
  e: unknown,
  target: Omit<ConnectionErrorData, 'reason'>
): Error & { detail: ConnectionErrorDetail } {
  const error = e instanceof Error ? e : new Error(String(e));

  return Object.assign(error, {
    detail: {
      kind: 'connection' as const,
      reason: classifyConnectionError(e),
      ...target,
    },
  });
}

/**
 * A connection failure as the renderer receives it: decoded flat, so the tag
 * is a field of the error itself.
 */
export function isConnectionError(
  e: unknown
): e is Error & ConnectionErrorData {
  return (
    typeof e === 'object' &&
    e !== null &&
    'kind' in e &&
    (e as { kind: unknown }).kind === 'connection'
  );
}
