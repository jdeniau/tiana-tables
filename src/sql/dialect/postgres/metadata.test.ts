import { describe, expect, test } from 'vitest';
import type { ResultRow } from '../../types';
import { postgresMetadata } from './metadata';

/**
 * The catalog queries run thirty lines: each is asserted on the markers
 * that name a bug it avoids, not on its whole text.
 */
describe('the statements each question sends', () => {
  test('a schema is what the UI calls a database', () => {
    expect(postgresMetadata.listDatabases().sql).toContain(
      'FROM pg_catalog.pg_namespace'
    );
    expect(postgresMetadata.listTables('app').values).toEqual({
      databaseName: 'app',
    });
  });

  // `_` alone is a LIKE wildcard, which would hide a schema named `pgxtoast`
  test('TOAST and temporary schemas are hidden, and only them', () => {
    const { sql } = postgresMetadata.listDatabases();

    expect(sql).toContain("NOT LIKE 'pg\\_toast%'");
    expect(sql).toContain("NOT LIKE 'pg\\_temp\\_%'");
  });

  test('views and materialised views are listed with the tables', () => {
    expect(postgresMetadata.listTables('app').sql).toContain(
      "c.relkind IN ('r', 'v', 'm', 'p', 'f')"
    );
  });

  // information_schema answers a composite key as the cross product of its columns
  test('a composite foreign key pairs its columns by position', () => {
    const { sql } = postgresMetadata.listForeignKeys('app');

    expect(sql).toContain('unnest(con.conkey, con.confkey)');
    expect(sql).toContain(
      'ORDER BY source.relname, con.conname, pair.position'
    );
  });

  test('a foreign key to another schema is left out', () => {
    expect(postgresMetadata.listForeignKeys('app').sql).toContain(
      'target.relnamespace = source.relnamespace'
    );
  });

  test('the primary key is read in the order the key declares it', () => {
    const { sql, values } = postgresMetadata.listPrimaryKeyColumns(
      'app',
      'order_lines'
    );

    expect(sql).toContain('ORDER BY k.position');
    expect(values).toEqual({ databaseName: 'app', tableName: 'order_lines' });
  });

  // `pg` hands an array of `name` over as its text, `{sad,ok,happy}`
  test("an enum's labels are read as text, in their declared order", () => {
    expect(postgresMetadata.listColumns('public').sql).toContain(
      'array_agg(CAST(e.enumlabel AS text) ORDER BY e.enumsortorder)'
    );
  });

  test('a dropped column is never listed', () => {
    expect(postgresMetadata.listColumns('public').sql).toContain(
      'NOT a.attisdropped'
    );
    expect(postgresMetadata.describeTable('public', 'users').sql).toContain(
      'NOT a.attisdropped'
    );
  });

  test('describeTable reads as the table is declared', () => {
    expect(postgresMetadata.describeTable('public', 'users').sql).toContain(
      'ORDER BY a.attnum'
    );
  });
});

/** Rows copied from a run of `listColumns` against `tiana-dev-postgres`. */
function column(overrides: Partial<Record<string, unknown>>): ResultRow {
  return {
    relname: 'users',
    attname: 'email',
    attnotnull: false,
    attgenerated: '',
    attidentity: '',
    typname: 'text',
    enum_labels: null,
    ...overrides,
  };
}

function readColumn(overrides: Partial<Record<string, unknown>>) {
  const [detail] = postgresMetadata
    .listColumns('public')
    .answer([column(overrides)]);

  return detail;
}

describe('listColumns', () => {
  test('a plain column is named as the app knows it', () => {
    expect(readColumn({ attnotnull: true })).toEqual({
      table: 'users',
      name: 'email',
      nullable: false,
      generated: false,
      binary: false,
      json: false,
      allowedValues: [],
      multiValued: false,
    });
  });

  test('an enum carries its labels, one at a time', () => {
    expect(
      readColumn({ typname: 'mood', enum_labels: ['sad', 'ok', 'happy'] })
    ).toMatchObject({
      allowedValues: ['sad', 'ok', 'happy'],
      multiValued: false,
    });
  });

  test('a stored generated column is generated', () => {
    expect(readColumn({ attgenerated: 's' }).generated).toBe(true);
  });

  // `UPDATE … SET id = 3` is refused on it: only `DEFAULT` is accepted
  test('an ALWAYS identity is generated', () => {
    expect(readColumn({ attidentity: 'a' }).generated).toBe(true);
  });

  test('a BY DEFAULT identity accepts a value, so it is not', () => {
    expect(readColumn({ attidentity: 'd' }).generated).toBe(false);
  });

  test('bytea is bytes', () => {
    expect(readColumn({ typname: 'bytea' }).binary).toBe(true);
  });

  test.each(['json', 'jsonb'])('%s is JSON', (typname) => {
    expect(readColumn({ typname }).json).toBe(true);
  });

  test('a column without NOT NULL is nullable', () => {
    expect(readColumn({ attnotnull: false }).nullable).toBe(true);
  });
});

describe('the other questions', () => {
  test('listForeignKeys names the columns as the app knows them', () => {
    expect(
      postgresMetadata.listForeignKeys('app').answer([
        {
          table_name: 'shipments',
          column_name: 'order_id',
          referenced_table: 'order_lines',
          referenced_column: 'order_id',
        },
      ])
    ).toEqual([
      {
        table: 'shipments',
        column: 'order_id',
        referencedTable: 'order_lines',
        referencedColumn: 'order_id',
      },
    ]);
  });

  test('the names of a list are read one per row', () => {
    expect(
      postgresMetadata
        .listDatabases()
        .answer([{ nspname: 'public' }, { nspname: 'app' }])
    ).toEqual(['public', 'app']);
    expect(
      postgresMetadata.listTables('app').answer([{ relname: 'orders' }])
    ).toEqual(['orders']);
    expect(
      postgresMetadata
        .listPrimaryKeyColumns('app', 'order_lines')
        .answer([{ attname: 'order_id' }, { attname: 'line_no' }])
    ).toEqual(['order_id', 'line_no']);
  });
});

/** A row copied from a run of `describeTable` against `tiana-dev-postgres`: `users.id`. */
function described(overrides: Partial<Record<string, unknown>>) {
  const [column] = postgresMetadata.describeTable('public', 'users').answer([
    {
      attname: 'id',
      column_type: 'integer',
      attnotnull: true,
      attidentity: '',
      attgenerated: '',
      expression: null,
      collname: null,
      comment: null,
      in_primary_key: null,
      unique_alone: null,
      first_of_index: null,
      ...overrides,
    },
  ]);

  return column;
}

describe('describeTable', () => {
  test('names the columns as the page prints them', () => {
    expect(
      described({ collname: 'default', comment: 'Login, unique' })
    ).toEqual({
      Column: 'id',
      Type: 'integer',
      Null: 'NO',
      Key: '',
      Default: null,
      Extra: null,
      Collation: 'default',
      Comment: 'Login, unique',
    });
  });

  test('prints no comment as an empty one, as MySQL does', () => {
    expect(described({ comment: null }).Comment).toBe('');
  });

  test('reads a nullable column as YES', () => {
    expect(described({ attnotnull: false }).Null).toBe('YES');
  });

  // a column of a composite primary key is in no position of its own
  test.each([
    [
      'PRI',
      { in_primary_key: true, unique_alone: false, first_of_index: false },
    ],
    [
      'UNI',
      { in_primary_key: false, unique_alone: true, first_of_index: true },
    ],
    [
      'MUL',
      { in_primary_key: false, unique_alone: false, first_of_index: true },
    ],
    ['', { in_primary_key: false, unique_alone: false, first_of_index: false }],
  ])('reads the key as %j', (key, flags) => {
    expect(described(flags).Key).toBe(key);
  });

  test('prints the default of a plain column', () => {
    expect(described({ expression: "'ok'::mood" }).Default).toBe("'ok'::mood");
  });

  test.each([
    ['a', 'GENERATED ALWAYS AS IDENTITY'],
    ['d', 'GENERATED BY DEFAULT AS IDENTITY'],
  ])('prints an identity %s in Extra', (attidentity, extra) => {
    expect(described({ attidentity }).Extra).toBe(extra);
  });

  test.each([
    ['s', 'GENERATED ALWAYS AS (a || b) STORED'],
    ['v', 'GENERATED ALWAYS AS (a || b) VIRTUAL'],
  ])(
    'prints a generated column %s in Extra, with no default',
    (attgenerated, extra) => {
      expect(described({ attgenerated, expression: 'a || b' })).toMatchObject({
        Default: null,
        Extra: extra,
      });
    }
  );
});
