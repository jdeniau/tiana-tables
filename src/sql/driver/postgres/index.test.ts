import pg from 'pg';
import { describe, expect, test } from 'vitest';
import { FieldKind } from '../../resultField';
import { postgresDriver, testables } from './index';

const {
  asServerError,
  asTimeout,
  isConnectionLost,
  toQueryReturn,
  toResultFields,
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
  test('names each column with its kind, and no table yet', () => {
    expect(toResultFields([field('email', 1043), field('id', 23)])).toEqual([
      { name: 'email', table: null, kind: FieldKind.String },
      { name: 'id', table: null, kind: FieldKind.Number },
    ]);
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

describe('postgresDriver', () => {
  // a PostgreSQL connection opens one database: there is no `USE` to pick it later
  test('refuses to connect without a database', async () => {
    await expect(
      postgresDriver.connect(
        { host: 'localhost', port: 5432, user: 'postgres', password: '' },
        { connectTimeoutMs: 1000, onClosed: () => {} }
      )
    ).rejects.toThrow('names a database');
  });
});
