import { describe, expect, test } from 'vitest';
import { ForeignKeysHelper } from './ForeignKeysHelper';
import type { ForeignKey } from './dialect/metadata';

const FOREIGN_KEYS: Array<ForeignKey> = [
  {
    constraintName: 'fk_employee_title',
    table: 'employee',
    column: 'title_id',
    referencedDatabase: 'db',
    referencedTable: 'title',
    referencedColumn: 'id',
  },
  {
    constraintName: 'fk_planning_employee',
    table: 'planning',
    column: 'employee_id',
    referencedDatabase: 'db',
    referencedTable: 'employee',
    referencedColumn: 'id',
  },
];

describe('ForeignKeysHelper', () => {
  test('getForeignKey', () => {
    const helper = new ForeignKeysHelper(FOREIGN_KEYS, 'db');

    expect(helper.getForeignKey('employee', 'title_id')).toEqual({
      referencedDatabaseName: 'db',
      referencedTableName: 'title',
      referencedColumnName: 'id',
    });

    expect(helper.getForeignKey('employee', 'id')).toEqual(null);
  });

  // keys of `envoi_newsletter` as the dev servers list them: by constraint name, then position
  describe('getWholeForeignKey', () => {
    const envoi = (
      constraintName: string,
      column: string,
      referencedTable: string,
      referencedColumn: string
    ): ForeignKey => ({
      constraintName,
      table: 'envoi_newsletter',
      column,
      referencedDatabase: 'db',
      referencedTable,
      referencedColumn,
    });
    const helper = new ForeignKeysHelper(
      [
        envoi('fk_envoi_article', 'article_une_id', 'article', 'id'),
        envoi(
          'fk_envoi_media_une',
          'article_une_id',
          'article_media',
          'article_id'
        ),
        envoi(
          'fk_envoi_media_une',
          'media_une_id',
          'article_media',
          'media_id'
        ),
        // PostgreSQL lets another table name a key alike
        {
          ...envoi('fk_envoi_media_une', 'media_id', 'media', 'id'),
          table: 'article_media',
        },
      ],
      'db'
    );

    test('a key of one column is one pair', () => {
      expect(
        new ForeignKeysHelper(FOREIGN_KEYS, 'db').getWholeForeignKey(
          'employee',
          'title_id'
        )
      ).toEqual({
        referencedDatabase: 'db',
        referencedTable: 'title',
        columns: [{ column: 'title_id', referencedColumn: 'id' }],
      });
    });

    test('a composite key holds every column, in its order', () => {
      expect(
        helper.getWholeForeignKey('envoi_newsletter', 'media_une_id')
      ).toEqual({
        referencedDatabase: 'db',
        referencedTable: 'article_media',
        columns: [
          { column: 'article_une_id', referencedColumn: 'article_id' },
          { column: 'media_une_id', referencedColumn: 'media_id' },
        ],
      });
    });

    test('a column of two keys gets the first one listed', () => {
      expect(
        helper.getWholeForeignKey('envoi_newsletter', 'article_une_id')
      ).toEqual({
        referencedDatabase: 'db',
        referencedTable: 'article',
        columns: [{ column: 'article_une_id', referencedColumn: 'id' }],
      });
    });

    test('a column of no key has none', () => {
      expect(helper.getWholeForeignKey('envoi_newsletter', 'id')).toBeNull();
    });
  });

  test('getLinkBetweenTables', () => {
    const helper = new ForeignKeysHelper(FOREIGN_KEYS, 'db');

    expect(
      helper.getLinkBetweenTables('employee', [
        { tableName: 'title', alias: 't' },
      ])
    ).toEqual({
      columnName: 'id',
      referencedColumnName: 'title_id',
      referencedTableName: 'title',
      alias: 't',
    });

    expect(
      helper.getLinkBetweenTables('employee', [
        { tableName: 'title', alias: 't' },
        { tableName: 'planning', alias: 'p' },
      ])
    ).toEqual({
      columnName: 'id',
      referencedColumnName: 'title_id',
      referencedTableName: 'title',
      alias: 't',
    });

    expect(
      helper.getLinkBetweenTables('employee', [
        { tableName: 'planning', alias: 'p' },
      ])
    ).toEqual({
      columnName: 'employee_id',
      referencedColumnName: 'id',
      referencedTableName: 'planning',
      alias: 'p',
    });
  });

  // a query names the current database's tables bare, where a namesake would be joined on the wrong key
  describe('a key to another database', () => {
    const helper = new ForeignKeysHelper(
      [
        {
          constraintName: 'fk_orders_users',
          table: 'orders',
          column: 'user_id',
          referencedDatabase: 'accounts',
          referencedTable: 'users',
          referencedColumn: 'id',
        },
      ],
      'db'
    );

    test('is still followed from its column', () => {
      expect(helper.getForeignKey('orders', 'user_id')).toEqual({
        referencedDatabaseName: 'accounts',
        referencedTableName: 'users',
        referencedColumnName: 'id',
      });
    });

    test('joins nothing to the table holding it', () => {
      expect(
        helper.getLinkBetweenTables('orders', [
          { tableName: 'users', alias: 'u' },
        ])
      ).toBeNull();
    });

    test('joins nothing to a table named like its target', () => {
      expect(
        helper.getLinkBetweenTables('users', [
          { tableName: 'orders', alias: 'o' },
        ])
      ).toBeNull();
    });
  });
});
