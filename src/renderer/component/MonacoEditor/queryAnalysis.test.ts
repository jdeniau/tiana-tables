import { describe, expect, it } from 'vitest';
import { QuerySchema, analyzeQuery } from './queryAnalysis';

const SCHEMA: QuerySchema = {
  database: 'db_user',
  tables: new Set(['users', 'orders', 'my table']),
  columns: new Map([
    ['users', new Set(['id', 'name'])],
    ['orders', new Set(['id', 'user_id'])],
  ]),
};

/** the text each range covers, to check the positions without counting columns */
function highlighted(sql: string, schema = SCHEMA): string[] {
  const lines = sql.split('\n');

  return analyzeQuery(sql, schema)
    .semanticTokens.sort(
      (a, b) =>
        a.range.startLineNumber - b.range.startLineNumber ||
        a.range.startColumn - b.range.startColumn
    )
    .map(
      ({ kind, range }) =>
        `${kind}:${lines[range.startLineNumber - 1].slice(
          range.startColumn - 1,
          range.endColumn - 1
        )}`
    );
}

function unknownColumns(sql: string, schema = SCHEMA): string[] {
  return analyzeQuery(sql, schema).unknownColumns.map(
    ({ table, column }) => `${table}.${column}`
  );
}

describe('semantic tokens', () => {
  it('finds a table and its alias', () => {
    expect(highlighted('SELECT * FROM users u')).toEqual([
      'table:users',
      'alias:u',
    ]);
  });

  it('reports 1-based lines and columns', () => {
    expect(
      analyzeQuery('SELECT *\nFROM users u', SCHEMA).semanticTokens
    ).toEqual([
      {
        kind: 'table',
        range: {
          startLineNumber: 2,
          endLineNumber: 2,
          startColumn: 6,
          endColumn: 11,
        },
      },
      {
        kind: 'alias',
        range: {
          startLineNumber: 2,
          endLineNumber: 2,
          startColumn: 12,
          endColumn: 13,
        },
      },
    ]);
  });

  it('handles the AS keyword', () => {
    expect(highlighted('SELECT * FROM users AS u')).toEqual([
      'table:users',
      'alias:u',
    ]);
  });

  it('colors alias usages, not the columns they qualify', () => {
    expect(highlighted('SELECT u.name FROM users u')).toEqual([
      'alias:u',
      'table:users',
      'alias:u',
    ]);
  });

  it('colors a table used as a qualifier when it has no alias', () => {
    expect(highlighted('SELECT users.name FROM users')).toEqual([
      'table:users',
      'table:users',
    ]);
  });

  it('handles a join with aliases on both sides', () => {
    expect(
      highlighted('SELECT u.id FROM users u JOIN orders o ON o.user_id = u.id')
    ).toEqual([
      'alias:u',
      'table:users',
      'alias:u',
      'table:orders',
      'alias:o',
      'alias:o',
      'alias:u',
    ]);
  });

  it('keeps quoted names in one range', () => {
    expect(highlighted('SELECT * FROM `my table`')).toEqual([
      'table:`my table`',
    ]);
  });

  it('still highlights what precedes an unfinished clause', () => {
    expect(highlighted('SELECT u.name FROM users u JOIN ')).toEqual([
      'alias:u',
      'table:users',
      'alias:u',
    ]);
  });

  it('leaves an unknown qualifier alone', () => {
    // `userss` is a typo, not the `userss` database of the `users` table —
    // nothing here can tell the difference, so it stays uncolored
    expect(highlighted('SELECT userss.name FROM users')).toEqual([
      'table:users',
    ]);
  });

  it('handles several statements', () => {
    expect(
      highlighted('SELECT * FROM users u; SELECT * FROM orders o')
    ).toEqual(['table:users', 'alias:u', 'table:orders', 'alias:o']);
  });

  it('ignores a table that does not exist', () => {
    expect(highlighted('SELECT * FROM userz')).toEqual([]);
  });

  it('still names the alias of an unknown table', () => {
    // the query declares the alias itself, no schema needed to trust it
    expect(highlighted('SELECT z.name FROM userz z')).toEqual([
      'alias:z',
      'alias:z',
    ]);
  });

  it('returns nothing for a query without a table', () => {
    expect(highlighted('SELECT 1')).toEqual([]);
    expect(highlighted('')).toEqual([]);
  });
});

describe('database qualified tables', () => {
  it('covers the current database prefix with the table name', () => {
    expect(highlighted('SELECT * FROM db_user.users u')).toEqual([
      'table:db_user.users',
      'alias:u',
    ]);
  });

  it('ignores a table qualified by another database', () => {
    // `users` exists here, but nothing says the other database has one
    expect(highlighted('SELECT * FROM other_db.users u')).toEqual(['alias:u']);
  });

  it('ignores a table the current database does not have', () => {
    expect(highlighted('SELECT * FROM db_user.userz z')).toEqual(['alias:z']);
  });
});

describe('unknown columns', () => {
  it('reports a column the aliased table does not have', () => {
    expect(unknownColumns('SELECT u.nam FROM users u')).toEqual(['users.nam']);
  });

  it('reports a column the qualifying table does not have', () => {
    expect(unknownColumns('SELECT users.nam FROM users')).toEqual([
      'users.nam',
    ]);
  });

  it('points at the column, not at the qualifier', () => {
    const [marker] = analyzeQuery(
      'SELECT u.nam FROM users u',
      SCHEMA
    ).unknownColumns;

    // `nam` spans columns 10, 11 and 12
    expect(marker.range).toMatchObject({ startColumn: 10, endColumn: 13 });
  });

  it('says nothing about a column that exists', () => {
    expect(
      unknownColumns('SELECT u.name, o.user_id FROM users u JOIN orders o')
    ).toEqual([]);
  });

  it('ignores the case of column names, as MySQL does', () => {
    expect(unknownColumns('SELECT u.Name FROM users u')).toEqual([]);
  });

  it('says nothing about `*`', () => {
    expect(unknownColumns('SELECT u.* FROM users u')).toEqual([]);
  });

  it('says nothing when the qualifier resolves to nothing', () => {
    expect(unknownColumns('SELECT x.nope FROM users u')).toEqual([]);
    expect(unknownColumns('SELECT z.nope FROM userz z')).toEqual([]);
  });

  it('says nothing when the columns of the table are not loaded', () => {
    // `my table` is a known table with no column in the schema
    expect(unknownColumns('SELECT t.nope FROM `my table` t')).toEqual([]);
  });

  it('says nothing while the reference is still being typed', () => {
    expect(unknownColumns('SELECT u. FROM users u')).toEqual([]);
  });
});
