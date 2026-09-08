import { describe, expect, test } from 'vitest';
import {
  ConnectionFailure,
  asConnectionError,
  classifyConnectionError,
  isConnectionError,
} from './connectionError';
import { decodeError, encodeError } from './errorSerializer';
import { isSqlError } from './isSqlError';

const target = { host: 'db.example.org', port: 3306, timeoutMs: 10_000 };

function timeout() {
  return Object.assign(new Error('connect ETIMEDOUT'), { code: 'ETIMEDOUT' });
}

describe('classifyConnectionError', () => {
  test.each([
    ['ETIMEDOUT', ConnectionFailure.timeout],
    ['PROTOCOL_SEQUENCE_TIMEOUT', ConnectionFailure.timeout],
    ['ECONNREFUSED', ConnectionFailure.refused],
    ['ENOTFOUND', ConnectionFailure.unknownHost],
    ['EAI_AGAIN', ConnectionFailure.unknownHost],
    ['ER_ACCESS_DENIED_ERROR', ConnectionFailure.accessDenied],
    ['ER_DBACCESS_DENIED_ERROR', ConnectionFailure.accessDenied],
    ['ER_NOT_SUPPORTED_AUTH_MODE', ConnectionFailure.accessDenied],
    ['EHOSTUNREACH', ConnectionFailure.other],
  ])('%s is a %s', (code, reason) => {
    expect(
      classifyConnectionError(Object.assign(new Error('nope'), { code }))
    ).toBe(reason);
  });

  test('an error without a code is not guessed at', () => {
    expect(classifyConnectionError(new Error('nope'))).toBe(
      ConnectionFailure.other
    );
    expect(classifyConnectionError(undefined)).toBe(ConnectionFailure.other);
  });
});

describe('asConnectionError', () => {
  /**
   * The message is the one thing the driver says that we cannot write better,
   * so tagging must not replace it.
   */
  test('keeps the driver message and adds what it means', () => {
    const error = asConnectionError(timeout(), target);

    expect(error.message).toBe('connect ETIMEDOUT');
    expect(error.detail).toEqual({
      kind: 'connection',
      reason: ConnectionFailure.timeout,
      ...target,
    });
  });

  test('something thrown that is not an Error still becomes one', () => {
    expect(asConnectionError('boom', target)).toBeInstanceOf(Error);
  });
});

/**
 * The round trip is the thing worth pinning: the renderer reads the detail
 * flat, and reads it off a plain object — the context bridge rebuilds an
 * `Error` from its message alone and drops anything hung on it.
 */
describe('a failure on its way to the renderer', () => {
  function roundTrip(e: unknown) {
    return decodeError(encodeError(e));
  }

  test('a connection failure arrives flat, and is recognised as one', () => {
    const decoded = roundTrip(asConnectionError(timeout(), target));

    expect(isConnectionError(decoded)).toBe(true);
    expect(decoded).toMatchObject({
      message: 'connect ETIMEDOUT',
      reason: ConnectionFailure.timeout,
      ...target,
    });
  });

  test('it arrives as a plain object, not as an Error', () => {
    expect(roundTrip(asConnectionError(timeout(), target))).not.toBeInstanceOf(
      Error
    );
  });

  test('a query error still arrives flat, and is not read as a connection one', () => {
    const decoded = roundTrip(
      Object.assign(new Error("Unknown column 'nope'"), {
        code: 'ER_BAD_FIELD_ERROR',
        errno: 1054,
        sql: 'SELECT nope FROM article',
        sqlMessage: "Unknown column 'nope'",
        sqlState: '42S22',
      })
    );

    expect(isSqlError(decoded)).toBe(true);
    expect(isConnectionError(decoded)).toBe(false);
    expect(decoded).toMatchObject({ code: 'ER_BAD_FIELD_ERROR', errno: 1054 });
  });

  test('an error with nothing to add stays an Error, and no failure kind', () => {
    const decoded = roundTrip(new Error('some query failed'));

    expect(decoded).toBeInstanceOf(Error);
    expect(isConnectionError(decoded)).toBe(false);
  });
});
