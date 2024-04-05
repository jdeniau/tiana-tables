import { describe, expect, test } from 'vitest';
import { ForeignKeysHelper } from './ForeignKeysHelper';
import { KeyColumnUsageRow } from './types';

const FOREIGN_KEYS: Array<KeyColumnUsageRow> = [
  // @ts-expect-error issue with contstructor name
  {
    TABLE_NAME: 'employee',
    COLUMN_NAME: 'title_id',
    REFERENCED_TABLE_NAME: 'title',
    REFERENCED_COLUMN_NAME: 'id',
    CONSTRAINT_NAME: 'employee_title_id_fkey',
  },
  // @ts-expect-error issue with contstructor name
  {
    TABLE_NAME: 'planning',
    COLUMN_NAME: 'employee_id',
    REFERENCED_TABLE_NAME: 'employee',
    REFERENCED_COLUMN_NAME: 'id',
    CONSTRAINT_NAME: 'planning_employee_id_fkey',
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
