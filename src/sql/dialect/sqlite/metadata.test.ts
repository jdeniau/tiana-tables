import { DatabaseSync } from 'node:sqlite';
import { beforeAll, describe, expect, test } from 'vitest';
import type { ReadQuery } from '../readQuery';
import { sqliteMetadata } from './metadata';

/**
 * Each question is run on a real SQLite, the one Node bundles:
 * the `pragma_*` functions answer what a catalog query cannot be read for.
 */
const SCHEMA = `
  CREATE TABLE parent (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    label TEXT DEFAULT 'none'
  );
  -- the key in another order than the columns
  CREATE TABLE "order" (
    order_id INTEGER NOT NULL,
    line_id INTEGER NOT NULL,
    qty NUMERIC,
    PRIMARY KEY (line_id, order_id)
  ) WITHOUT ROWID;
  CREATE TABLE child (
    id INTEGER PRIMARY KEY,
    parent_id INTEGER REFERENCES parent,
    parent_code TEXT REFERENCES parent (code),
    order_id INTEGER,
    line_id INTEGER,
    qty INTEGER,
    doubled INTEGER GENERATED ALWAYS AS (qty * 2) VIRTUAL,
    tripled INTEGER GENERATED ALWAYS AS (qty * 3) STORED,
    FOREIGN KEY (order_id, line_id) REFERENCES "order" (order_id, line_id),
    FOREIGN KEY (line_id, order_id) REFERENCES "order"
  );
  CREATE INDEX child_order ON child (order_id, line_id);
  CREATE UNIQUE INDEX child_parent ON child (parent_id, parent_code);
  CREATE TABLE "we""ird.name" ("a""b" TEXT PRIMARY KEY, payload BLOB, untyped);
  CREATE VIEW child_view AS SELECT c.id, p.code FROM child c JOIN parent p ON p.id = c.parent_id;
  CREATE VIRTUAL TABLE notes USING fts5(body);
`;

let database: DatabaseSync;

beforeAll(() => {
  database = new DatabaseSync(':memory:');
  database.exec(SCHEMA);
});

function ask<Answer>(query: ReadQuery<Answer>): Answer {
  return query.answer(database.prepare(query.sql).all(query.values));
}

test('the one database listed is the file the connection opens', () => {
  database.exec("ATTACH DATABASE ':memory:' AS other");

  try {
    expect(ask(sqliteMetadata.listDatabases())).toEqual(['main']);
  } finally {
    database.exec('DETACH DATABASE other');
  }
});

// the shadow tables of `notes` and `sqlite_sequence` are SQLite's, not the user's
test('tables, views and virtual tables are listed, and nothing SQLite keeps for itself', () => {
  expect(ask(sqliteMetadata.listTables('main')).sort()).toEqual([
    'child',
    'child_view',
    'notes',
    'order',
    'parent',
    'we"ird.name',
  ]);
});

test('the primary key is read in the order the key declares it', () => {
  expect(ask(sqliteMetadata.listPrimaryKeyColumns('main', 'order'))).toEqual([
    'line_id',
    'order_id',
  ]);
});

// SQLite numbers the keys of a table from the last declared
test('each column of a key is paired with its target, a target left out being the primary key', () => {
  expect(
    ask(sqliteMetadata.listForeignKeys('main')).map((key) => [
      key.constraintName,
      key.table,
      key.column,
      key.referencedDatabase,
      key.referencedTable,
      key.referencedColumn,
    ])
  ).toEqual([
    ['0', 'child', 'line_id', 'main', 'order', 'line_id'],
    ['0', 'child', 'order_id', 'main', 'order', 'order_id'],
    ['1', 'child', 'order_id', 'main', 'order', 'order_id'],
    ['1', 'child', 'line_id', 'main', 'order', 'line_id'],
    ['2', 'child', 'parent_code', 'main', 'parent', 'code'],
    ['3', 'child', 'parent_id', 'main', 'parent', 'id'],
  ]);
});

describe('listColumns', () => {
  const columnsOf = (table: string) =>
    ask(sqliteMetadata.listColumns('main')).filter(
      (column) => column.table === table
    );

  test('a plain column is named as the app knows it', () => {
    expect(columnsOf('parent')[1]).toEqual({
      table: 'parent',
      name: 'code',
      nullable: false,
      generated: false,
      binary: false,
      hasJsonType: false,
      allowedValues: [],
      multiValued: false,
    });
  });

  test('a generated column is one, stored or not', () => {
    expect(
      columnsOf('child')
        .filter((column) => column.generated)
        .map((column) => column.name)
    ).toEqual(['doubled', 'tripled']);
  });

  // a column declared with no type takes text as text: it stays editable
  test('only a BLOB column holds bytes', () => {
    expect(
      columnsOf('we"ird.name').map(({ name, binary }) => [name, binary])
    ).toEqual([
      ['a"b', false],
      ['payload', true],
      ['untyped', false],
    ]);
  });

  test('the hidden columns of a virtual table are left out, like its shadow tables', () => {
    const tables = new Set(
      ask(sqliteMetadata.listColumns('main')).map((column) => column.table)
    );

    expect(columnsOf('notes').map((column) => column.name)).toEqual(['body']);
    expect(tables).not.toContain('notes_content');
  });

  test('a view has its columns too', () => {
    expect(columnsOf('child_view').map((column) => column.name)).toEqual([
      'id',
      'code',
    ]);
  });
});

describe('describeTable', () => {
  test('a column reads as the structure page prints it', () => {
    expect(ask(sqliteMetadata.describeTable('main', 'parent'))).toEqual([
      {
        Column: 'id',
        Type: 'INTEGER',
        Null: 'YES',
        Key: 'PRI',
        Default: null,
        Extra: null,
        Collation: null,
        Comment: '',
      },
      {
        Column: 'code',
        Type: 'TEXT',
        Null: 'NO',
        Key: 'UNI',
        Default: null,
        Extra: null,
        Collation: null,
        Comment: '',
      },
      {
        Column: 'label',
        Type: 'TEXT',
        Null: 'YES',
        Key: '',
        Default: "'none'",
        Extra: null,
        Collation: null,
        Comment: '',
      },
    ]);
  });

  test('an index marks its first column only, a unique one too, and a generated column says how it is kept', () => {
    expect(
      ask(sqliteMetadata.describeTable('main', 'child')).map(
        ({ Column, Key, Extra }) => [Column, Key, Extra]
      )
    ).toEqual([
      ['id', 'PRI', null],
      ['parent_id', 'MUL', null],
      ['parent_code', '', null],
      ['order_id', 'MUL', null],
      ['line_id', '', null],
      ['qty', '', null],
      ['doubled', '', 'VIRTUAL GENERATED'],
      ['tripled', '', 'STORED GENERATED'],
    ]);
  });

  test('a name holding a quote and a dot is one table', () => {
    expect(
      ask(sqliteMetadata.describeTable('main', 'we"ird.name')).map(
        ({ Column, Type }) => [Column, Type]
      )
    ).toEqual([
      ['a"b', 'TEXT'],
      ['payload', 'BLOB'],
      ['untyped', ''],
    ]);
  });
});

// `CURRENT_TIMESTAMP` and `datetime('now')` write UTC
test('the zone dates are written in is UTC', () => {
  expect(ask(sqliteMetadata.serverTimeZone())).toEqual({
    name: 'UTC',
    isAbbreviation: false,
  });
});
