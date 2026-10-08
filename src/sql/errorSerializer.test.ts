import { describe, expect, it } from 'vitest';
import { decodeError, encodeError, isErrorLike } from './errorSerializer';
import { asSqlError } from './sqlError';

describe('isErrorLike', () => {
  it('accepts an error decoded with its detail, a plain object', () => {
    const decoded = decodeError(
      encodeError(
        asSqlError(new Error('Invalid JSON text'), {
          code: 'ER_INVALID_JSON_TEXT',
          errno: 3140,
        })
      )
    );

    expect(decoded).not.toBeInstanceOf(Error);
    expect(isErrorLike(decoded)).toBe(true);
  });

  it('accepts an Error', () => {
    expect(isErrorLike(new Error('crash'))).toBe(true);
  });

  it.each([['refused'], [null], [{ message: 'no name' }], [{ name: 'Error' }]])(
    'refuses %j',
    (value) => {
      expect(isErrorLike(value)).toBe(false);
    }
  );
});
