import { describe, expect, it } from 'vitest';
import type { SqlError } from '../../../sql/sqlError';
import { testables } from './SqlErrorComponent';

const { formatErrorCode } = testables;

function error(overrides: Partial<SqlError>): SqlError {
  return {
    name: 'Error',
    message: 'refused',
    kind: 'sql',
    code: 'X',
    ...overrides,
  };
}

describe('formatErrorCode', () => {
  it("prints MySQL's number before its code", () => {
    expect(
      formatErrorCode(error({ code: 'ER_NO_SUCH_TABLE', errno: 1146 }))
    ).toBe('1146: ER_NO_SUCH_TABLE');
  });

  it('prints a code that comes without a number alone', () => {
    expect(formatErrorCode(error({ code: '42P01' }))).toBe('42P01');
  });

  // what an error boundary falls back to for anything else
  it('prints nothing for an error that has no code', () => {
    expect(
      formatErrorCode({ name: 'Error', message: 'crash' } as SqlError)
    ).toBeUndefined();
  });
});
