import { describe, expect, test } from 'vitest';
import { ForeignKeysHelper } from './ForeignKeysHelper';
import type { ForeignKey } from './dialect/metadata';

const FOREIGN_KEYS: Array<ForeignKey> = [
  {
    table: 'employee',
    column: 'title_id',
    referencedDatabase: 'db',
    referencedTable: 'title',
    referencedColumn: 'id',
  },
  {
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
