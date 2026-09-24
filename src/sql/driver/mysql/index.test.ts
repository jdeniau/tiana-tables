import { describe, expect, test } from 'vitest';
import { FieldKind } from '../../resultField';
import { SslMode } from '../../sslMode';
import { testables } from './index';

const { SSL_OPTIONS, asServerError, toResultFields } = testables;

/** the four fields the conversion reads, which the driver keeps to itself */
function column(overrides: {
  name?: string;
  orgTable?: string;
  type?: number;
  characterSet?: number;
}) {
  return {
    name: 'c',
    orgTable: '',
    type: 253,
    characterSet: 224,
    ...overrides,
  };
}

describe('asServerError', () => {
  // the fields mysql2 rejects a statement with, measured against MariaDB 11.8
  function refused() {
    return Object.assign(new Error("Unknown column 'nope' in 'SELECT'"), {
      code: 'ER_BAD_FIELD_ERROR',
      errno: 1054,
      sqlState: '42S22',
      sqlMessage: "Unknown column 'nope' in 'SELECT'",
      sql: 'SELECT nope FROM t',
    });
  }

  test('tags a statement the server refused, keeping its message', () => {
    const error = asServerError(refused());

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      message: "Unknown column 'nope' in 'SELECT'",
      detail: {
        kind: 'sql',
        code: 'ER_BAD_FIELD_ERROR',
        errno: 1054,
        sqlState: '42S22',
      },
    });
  });

  // the retry reads `isConnectionLost` off the very same error
  test('tags the error in place, rather than a copy', () => {
    const error = refused();

    expect(asServerError(error)).toBe(error);
  });

  // mysql2 builds its own ETIMEDOUT with `errorno`, not `errno`
  test('leaves alone a code the server did not number', () => {
    const error = Object.assign(new Error('connect ETIMEDOUT'), {
      code: 'ETIMEDOUT',
      errorno: 'ETIMEDOUT',
    });

    expect(asServerError(error)).not.toHaveProperty('detail');
  });

  test('leaves alone what is not the server answering', () => {
    const error = new Error(
      "Can't add new command when connection is in closed state"
    );

    expect(asServerError(error)).not.toHaveProperty('detail');
  });
});

describe('toResultFields', () => {
  /**
   * Measured: `FROM information_schema.TABLES t` answers `table: 't'` and
   * `orgTable: 'TABLES'`, and every reader of this looks a real table up by
   * name — so the alias is not even taken in.
   */
  test('names the table a column really came from', () => {
    const [field] = toResultFields([
      column({ name: 'TABLE_NAME', orgTable: 'TABLES' }),
    ]);

    expect(field.table).toBe('TABLES');
  });

  // mysql2 spells "this belongs to no table" as an empty string
  test('a column belonging to no table has none', () => {
    const [field] = toResultFields([column({ name: 'n', type: 3 })]);

    expect(field.table).toBeNull();
  });

  test('carries the kind of the column, and its name as selected', () => {
    const [field] = toResultFields([
      column({ name: 'ident', orgTable: 'items', type: 3 }),
    ]);

    expect(field).toEqual({
      name: 'ident',
      table: 'items',
      kind: FieldKind.Number,
    });
  });

  // mysql2 types it as an array, and answers `undefined` for a write
  test('a statement that returned no rows has no columns', () => {
    expect(toResultFields(undefined)).toEqual([]);
  });

  // the collation is read too, or a `VARBINARY` would read as a string — the
  // two share type 253, and only 63 separates them
  test('hands the collation over, not only the type', () => {
    const [field] = toResultFields([column({ characterSet: 63 })]);

    expect(field.kind).toBe(FieldKind.Binary);
  });
});

/** measured on MariaDB 11.8, whose certificate is self-signed: `require` encrypts, `verify-full` refuses it */
describe('the TLS options of a mode', () => {
  test('connect in the clear by default', () => {
    expect(SSL_OPTIONS[SslMode.Disable]).toBeUndefined();
  });

  test('take the certificate as it comes on require', () => {
    expect(SSL_OPTIONS[SslMode.Require]).toEqual({ rejectUnauthorized: false });
  });

  // mysql2 checks the chain alone unless told otherwise
  test('check the host name too on verify-full', () => {
    expect(SSL_OPTIONS[SslMode.VerifyFull]).toEqual({
      rejectUnauthorized: true,
      verifyIdentity: true,
    });
  });
});
