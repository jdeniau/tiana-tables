import pg from 'pg';
import { describe, expect, test } from 'vitest';
import { FieldKind } from '../../resultField';
import { SslMode } from '../../sslMode';
import { postgresDriver, testables } from './index';

const {
  SSL_OPTIONS,
  asServerError,
  asTimeout,
  isConnectionLost,
  toQueryReturn,
  toResultFields,
  types,
} = testables;

/** the fields of a `pg` result the conversion reads */
function result(overrides: Partial<pg.QueryResult>): pg.QueryResult {
  return {
    command: 'SELECT',
    rowCount: 0,
    oid: 0,
    rows: [],
    fields: [],
    ...overrides,
  };
}

function field(name: string, dataTypeID: number): pg.FieldDef {
  return {
    name,
    dataTypeID,
    tableID: 16400,
    columnID: 1,
    dataTypeSize: 4,
    dataTypeModifier: -1,
    format: 'text',
  };
}

describe('toQueryReturn', () => {
  test('answers the rows of a statement that selects columns', () => {
    const rows = [{ id: 1 }];

    expect(
      toQueryReturn(result({ rows, fields: [field('id', 23)], rowCount: 1 }))
    ).toBe(rows);
  });

  // what the guarded write reads its outcome from
  test('answers the rows of an UPDATE … RETURNING', () => {
    const rows = [{ value: 'new' }];

    expect(
      toQueryReturn(
        result({ command: 'UPDATE', rows, fields: [field('value', 25)] })
      )
    ).toBe(rows);
  });

  // a guarded write that matched nothing answers no row, and it is still rows
  test('answers rows for a statement that selected columns and found none', () => {
    expect(
      toQueryReturn(
        result({ command: 'UPDATE', fields: [field('value', 25)], rowCount: 0 })
      )
    ).toEqual([]);
  });

  // measured: `UPDATE … WHERE id < 3` answers `rowCount: 2` and no field
  test('answers a write summary for a statement that selects nothing', () => {
    expect(toQueryReturn(result({ command: 'UPDATE', rowCount: 2 }))).toEqual({
      affectedRows: 2,
      insertId: null,
    });
  });

  // measured: a `CREATE TABLE` answers `rowCount: null`
  test('counts no row where pg counted none', () => {
    expect(
      toQueryReturn(result({ command: 'CREATE', rowCount: null }))
    ).toEqual({ affectedRows: 0, insertId: null });
  });
});

describe('toResultFields', () => {
  // measured: `SELECT o.id, 1 FROM app.orders o` answers the OID of `orders`, then 0
  test('names each column with its kind and the table its OID names', () => {
    expect(
      toResultFields(
        [field('email', 1043), { ...field('one', 23), tableID: 0 }],
        new Map([[16400, 'users']])
      )
    ).toEqual([
      { name: 'email', table: 'users', kind: FieldKind.String },
      { name: 'one', table: null, kind: FieldKind.Number },
    ]);
  });

  test('leaves the table out when its OID names none', () => {
    expect(
      toResultFields([field('email', 1043)], new Map([[16400, null]]))
    ).toEqual([{ name: 'email', table: null, kind: FieldKind.String }]);
  });
});

describe('asServerError', () => {
  // what pg rejects `SELECT nope FROM users` with, measured
  function refused() {
    return Object.assign(
      new pg.DatabaseError('column "nope" does not exist', 100, 'error'),
      { code: '42703' }
    );
  }

  test('tags a refused statement with its SQLSTATE, and no errno', () => {
    expect(asServerError(refused())).toMatchObject({
      message: 'column "nope" does not exist',
      detail: { kind: 'sql', code: '42703', sqlState: '42703' },
    });
    expect(asServerError(refused())).not.toHaveProperty('detail.errno');
  });

  // the retry reads `isConnectionLost` off the very same error
  test('tags the error in place', () => {
    const error = refused();

    expect(asServerError(error)).toBe(error);
  });

  test('leaves alone an error that is not the server answering', () => {
    const error = new Error('Client was closed and is not queryable');

    expect(asServerError(error)).toBe(error);
    expect(error).not.toHaveProperty('detail');
  });
});

describe('asTimeout', () => {
  // measured against a port that accepts and never answers
  test('gives the connection timeout the code of a network one', () => {
    expect(asTimeout(new Error('timeout expired'))).toMatchObject({
      code: 'ETIMEDOUT',
    });
  });

  test('leaves alone an error that already has a code', () => {
    const error = Object.assign(
      new Error('canceling statement due to statement timeout'),
      { code: '57014' }
    );

    expect(asTimeout(error)).toMatchObject({ code: '57014' });
  });

  test('leaves alone an error that is no timeout', () => {
    expect(asTimeout(new Error('boom'))).not.toHaveProperty('code');
  });
});

describe('isConnectionLost', () => {
  test.each([
    'Client has encountered a connection error and is not queryable',
    'Client was closed and is not queryable',
    'Connection terminated unexpectedly',
  ])('reads "%s" as a lost connection', (message) => {
    expect(isConnectionLost(new Error(message))).toBe(true);
  });

  test('does not read a refused statement as one', () => {
    expect(isConnectionLost(new Error('column "nope" does not exist'))).toBe(
      false
    );
  });
});

describe('types', () => {
  const decode = (oid: number, text: string) => types.getTypeParser(oid)(text);
  const { builtins } = pg.types;

  test.each([
    ['a boolean', builtins.BOOL, 't', true],
    ['an integer', builtins.INT4, '42', 42],
    ['a JSON object', builtins.JSONB, '{"a": 1}', { a: 1 }],
  ])('decodes %s into what the app reads', (_label, oid, text, value) => {
    expect(decode(oid, text)).toEqual(value);
  });

  test('decodes a date into a Date, as mysql2 does', () => {
    expect(decode(builtins.TIMESTAMPTZ, '2026-09-23 10:00:00+00')).toEqual(
      new Date('2026-09-23T10:00:00Z')
    );
  });

  // measured: `text[]` is OID 1009, an enum array has an OID of its own
  test.each([
    ['an array', 1009, '{math,poetry}'],
    ['an interval', builtins.INTERVAL, '1 day 02:00:00'],
    ['a point', 600, '(1,2)'],
    [
      'a bigint, which a number would round',
      builtins.INT8,
      '12345678901234567',
    ],
  ])('keeps %s as the server spells it', (_label, oid, text) => {
    expect(decode(oid, text)).toBe(text);
  });
});

describe('postgresDriver', () => {
  // a PostgreSQL connection opens one database: there is no `USE` to pick it later
  test('refuses to connect without a database', async () => {
    await expect(
      postgresDriver.connect(
        {
          host: 'localhost',
          port: 5432,
          user: 'postgres',
          password: '',
          ssl: SslMode.Disable,
        },
        { connectTimeoutMs: 1000, onClosed: () => {} }
      )
    ).rejects.toThrow('names a database');
  });
});

/** measured on PostgreSQL 18 accepting TLS only, with a self-signed certificate: `require` encrypts, `verify-full` refuses it */
describe('the TLS options of a mode', () => {
  test('connect in the clear by default', () => {
    expect(SSL_OPTIONS[SslMode.Disable]).toBe(false);
  });

  test('take the certificate as it comes on require', () => {
    expect(SSL_OPTIONS[SslMode.Require]).toEqual({ rejectUnauthorized: false });
  });

  test("leave Node's check of the chain and the host on verify-full", () => {
    expect(SSL_OPTIONS[SslMode.VerifyFull]).toBe(true);
  });
});
