import { describe, expect, test } from 'vitest';
import { ForeignKeysHelper } from './ForeignKeysHelper';
import type { ForeignKey } from './dialect/metadata';

const FOREIGN_KEYS: Array<ForeignKey> = [
  {
    table: 'employee',
    column: 'title_id',
    referencedTable: 'title',
    referencedColumn: 'id',
  },
  {
    table: 'planning',
    column: 'employee_id',
    referencedTable: 'employee',
    referencedColumn: 'id',
  },
];

describe('ForeignKeysHelper', () => {
  test('getForeignKey', () => {
    const helper = new ForeignKeysHelper(FOREIGN_KEYS);

    expect(helper.getForeignKey('employee', 'title_id')).toEqual({
      referencedTableName: 'title',
      referencedColumnName: 'id',
    });

    expect(helper.getForeignKey('employee', 'id')).toEqual(null);
  });

  test('getLinkBetweenTables', () => {
    const helper = new ForeignKeysHelper(FOREIGN_KEYS);

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
});
