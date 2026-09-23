import { describe, expect, test } from 'vitest';
import type { ResultRow } from '../../types';
import { mysqlMetadata } from './metadata';

function toColumnDetails(rows: ResultRow[]) {
  return mysqlMetadata.listColumns('db').answer(rows);
}

/**
 * What a cast could not do:
 * say on the spot that a `SELECT` stopped answering what it used to.
 */
describe('a server answering something else', () => {
  test('a missing column is refused, and named', () => {
    // what `AS referencedTable` would answer on PostgreSQL
    expect(() =>
      mysqlMetadata.listForeignKeys('db').answer([{ TABLE_NAME: 'article' }])
    ).toThrow(/listForeignKeys .* row 0, COLUMN_NAME/);
  });

  test('a column of the wrong type is refused too', () => {
    expect(() =>
      mysqlMetadata.listDatabases().answer([{ SCHEMA_NAME: 42 }])
    ).toThrow(/listDatabases .* row 0, SCHEMA_NAME/);
  });

  // the row is named, so a bad one among thousands can be found
  test('the offending row is named, not just the column', () => {
    expect(() =>
      mysqlMetadata
        .listTables('db')
        .answer([
          { TABLE_NAME: 'a' },
          { TABLE_NAME: 'b' },
          { NOT_A_TABLE_NAME: 'c' },
        ])
    ).toThrow(/row 2, TABLE_NAME/);
  });

  // a server free to add a column must not break a read that never asked for it
  test('a column we did not select is left alone', () => {
    expect(
      mysqlMetadata
        .listTables('db')
        .answer([{ TABLE_NAME: 'article', TABLE_ROWS: 12 }])
    ).toEqual(['article']);
  });
});

/**
 * Rows copied from a run of `listColumns` against `tiana-dev-mysql`,
 * not written from the documentation.
 */
const ROWS: ResultRow[] = [
  {
    TABLE_NAME: 'auteur',
    COLUMN_NAME: 'genre',
    DATA_TYPE: 'enum',
    COLUMN_TYPE: "enum('male','female','other')",
    IS_NULLABLE: 'YES',
    EXTRA: '',
  },
  {
    TABLE_NAME: 'auteur',
    COLUMN_NAME: 'initiale',
    DATA_TYPE: 'varchar',
    COLUMN_TYPE: 'varchar(1)',
    IS_NULLABLE: 'YES',
    EXTRA: 'STORED GENERATED',
  },
  {
    TABLE_NAME: 'type_zoo',
    COLUMN_NAME: 'a_blob',
    DATA_TYPE: 'blob',
    COLUMN_TYPE: 'blob',
    IS_NULLABLE: 'YES',
    EXTRA: '',
  },
  {
    TABLE_NAME: 'type_zoo',
    COLUMN_NAME: 'a_json',
    DATA_TYPE: 'longtext',
    COLUMN_TYPE: 'longtext',
    IS_NULLABLE: 'YES',
    EXTRA: '',
  },
  {
    TABLE_NAME: 'type_zoo',
    COLUMN_NAME: 'a_time',
    DATA_TYPE: 'time',
    COLUMN_TYPE: 'time',
    IS_NULLABLE: 'NO',
    EXTRA: '',
  },
];

function detail(name: string) {
  const found = toColumnDetails(ROWS).find((column) => column.name === name);

  expect(found).toBeDefined();

  return found!;
}

/**
 * What MySQL's statements say;
 * what every dialect owes is in `dialect.contract.test.ts`.
 */
describe('the statements each question sends', () => {
  const DATABASE = 'some-database';
  const TABLE = 'some-table';

  // a `:tableName` bound here would be ignored in silence:
  // the whole database is asked for
  test('the foreign keys of a database bind the schema alone', () => {
    expect(mysqlMetadata.listForeignKeys(DATABASE).sql).not.toContain(
      ':tableName'
    );
  });

  test('the primary key is read in the order the key declares it', () => {
    expect(mysqlMetadata.listPrimaryKeyColumns(DATABASE, TABLE).sql).toContain(
      'ORDER BY SEQ_IN_INDEX'
    );
  });

  test.each([
    [
      'listDatabases',
      mysqlMetadata.listDatabases(),
      ['information_schema', 'tiana_dev'],
      [{ SCHEMA_NAME: 'information_schema' }, { SCHEMA_NAME: 'tiana_dev' }],
    ],
    [
      'listTables',
      mysqlMetadata.listTables(DATABASE),
      ['article', 'auteur'],
      [{ TABLE_NAME: 'article' }, { TABLE_NAME: 'auteur' }],
    ],
    [
      'listPrimaryKeyColumns',
      mysqlMetadata.listPrimaryKeyColumns(DATABASE, TABLE),
      ['y', 'x'],
      [{ COLUMN_NAME: 'y' }, { COLUMN_NAME: 'x' }],
    ],
  ])(
    '%s answers the names it was given, in order',
    (_label, query, expected, rows) => {
      expect(query.answer(rows)).toEqual(expected);
    }
  );

  // read in code, not by an `AS`, which PostgreSQL would fold to `referencedtable`
  test('listForeignKeys names the columns as the app knows them', () => {
    expect(
      mysqlMetadata.listForeignKeys(DATABASE).answer([
        {
          TABLE_NAME: 'article',
          COLUMN_NAME: 'auteur_id',
          REFERENCED_TABLE_NAME: 'auteur',
          REFERENCED_COLUMN_NAME: 'id',
        },
      ])
    ).toEqual([
      {
        table: 'article',
        column: 'auteur_id',
        referencedTable: 'auteur',
        referencedColumn: 'id',
      },
    ]);
  });

  test('describeTable reads as the table is declared', () => {
    expect(mysqlMetadata.describeTable(DATABASE, TABLE).sql).toMatch(
      /ORDER BY\s+ORDINAL_POSITION/
    );
  });

  // shaped as `tiana-dev-mysql` answers for `auteur`,
  // one comment borrowed so every column has a value
  test('describeTable names the columns as the page prints them', () => {
    const rows = [
      {
        COLUMN_NAME: 'id',
        COLUMN_TYPE: 'int(11)',
        IS_NULLABLE: 'NO',
        COLUMN_KEY: 'PRI',
        COLUMN_DEFAULT: null,
        EXTRA: 'auto_increment',
        COLLATION_NAME: null,
        COLUMN_COMMENT: '',
      },
      {
        COLUMN_NAME: 'role',
        COLUMN_TYPE: "enum('redacteur','pigiste')",
        IS_NULLABLE: 'NO',
        COLUMN_KEY: '',
        COLUMN_DEFAULT: "'redacteur'",
        EXTRA: '',
        COLLATION_NAME: 'utf8mb4_uca1400_ai_ci',
        COLUMN_COMMENT: 'Rubrique de rattachement',
      },
    ];

    expect(mysqlMetadata.describeTable(DATABASE, TABLE).answer(rows)).toEqual([
      {
        Column: 'id',
        Type: 'int(11)',
        Null: 'NO',
        Key: 'PRI',
        Default: null,
        Extra: 'auto_increment',
        Collation: null,
        Comment: '',
      },
      {
        Column: 'role',
        Type: "enum('redacteur','pigiste')",
        Null: 'NO',
        Key: '',
        Default: "'redacteur'",
        Extra: '',
        Collation: 'utf8mb4_uca1400_ai_ci',
        Comment: 'Rubrique de rattachement',
      },
    ]);
  });
});

describe('listColumns', () => {
  test('an ENUM carries the values it accepts, in order', () => {
    // what the select editor is built from, published nowhere but in the declaration
    expect(detail('genre')).toEqual({
      table: 'auteur',
      name: 'genre',
      nullable: true,
      generated: false,
      binary: false,
      json: false,
      allowedValues: ['male', 'female', 'other'],
      multiValued: false,
    });
  });

  test('a SET is a closed set held several at a time', () => {
    const [column] = toColumnDetails([
      {
        TABLE_NAME: 't',
        COLUMN_NAME: 'rights',
        DATA_TYPE: 'set',
        COLUMN_TYPE: "set('read','write')",
        IS_NULLABLE: 'NO',
        EXTRA: '',
      },
    ]);

    expect(column.allowedValues).toEqual(['read', 'write']);
    expect(column.multiValued).toBe(true);
  });

  test('a generated column is named as one, so nothing writes to it', () => {
    expect(detail('initiale').generated).toBe(true);
  });

  test('a column of bytes is named as one, so no text editor opens on it', () => {
    expect(detail('a_blob').binary).toBe(true);
  });

  // measured: the flag says what the server said;
  // the editor still detects JSON from the value
  test("MariaDB's JSON, a LONGTEXT underneath, is not a json column", () => {
    expect(detail('a_json').json).toBe(false);
  });

  test('a column declared NOT NULL is not nullable', () => {
    expect(detail('a_time').nullable).toBe(false);
    expect(detail('genre').nullable).toBe(true);
  });
});
