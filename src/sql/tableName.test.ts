import { describe, expect, test } from 'vitest';
import {
  extractTableAliases,
  extractTableNames,
  generateTableAlias,
} from './tableName';

describe('tableName', () => {
  test.each([
    ['tablename', 't'],
    ['Tablename', 't'],
    ['TableName', 'tn'],
    ['table_name', 'tn'],
    ['Table_Name', 'tn'],
    ['TABLENAME', 't'],
    ['TABLE_NAME', 'tn'],
    ['TaBlE_nAmE', 'tbenae'],
    ['contingent', 'c'],
  ])('should generate alias', (tableName, expectedAlias) => {
    expect(generateTableAlias(tableName, [])).toBe(expectedAlias);
  });

  test.each([
    ['tablename', ['t'], 'ta'],
    ['tablename', ['t', 'ta'], 'tab'],
    ['tab', ['t', 'ta'], 'tab'],
    ['tab', ['t', 'ta', 'tab'], 't_2'],
  ])(
    'should generate another alias adding letters if already used and table name is simple',
    (tableName, usedAliases, expectedAlias) => {
      expect(generateTableAlias(tableName, usedAliases)).toBe(expectedAlias);
    }
  );

  test.each([
    ['table_name', ['tn'], 'tn_2'],
    ['table_name', ['tn', 'tn_2'], 'tn_3'],
    ['table_name', ['tn', 'tn_2', 'tn_3'], 'tn_4'],
  ])(
    'should generate another alias adding numbers if already used and table name is not a simple word',
    (tableName, usedAliases, expectedAlias) => {
      expect(generateTableAlias(tableName, usedAliases)).toBe(expectedAlias);
    }
  );
});

describe('extractTableAliases', () => {
  test.each([
    ['SELECT * FROM ', []],
    ['SELECT * FROM tablename', []],
    ['SELECT * FROM   tablename t', ['t']],
    ['SELECT * FROM tablename  AS t', ['t']],
    ['SELECT * FROM t1 JOIN t2', []],
    ['SELECT * FROM db1.t1 JOIN db2.t2 AS t_2', ['t_2']],
    ['SELECT * FROM db1.t1 t_ JOIN db2.t2 AS t_2', ['t_', 't_2']],
    [
      `SELECT *
    FROM db1.t1 JOIN db2.t2 t2
    INNER JOIN t3  AS t3
    RIGHT OUTER JOIN t4`,
      ['t2', 't3'],
    ],
  ])('table aliases', (sql, expected) => {
    expect(extractTableAliases(sql)).toEqual(expected);
  });
});

describe('extractTableNames', () => {
  test.each([
    ['SELECT * FROM ', []],
    ['SELECT * FROM tablename', [{ tableName: 'tablename', alias: undefined }]],
    ['SELECT * FROM   tablename t', [{ tableName: 'tablename', alias: 't' }]],
    ['SELECT * FROM tablename  AS t', [{ tableName: 'tablename', alias: 't' }]],
    [
      'SELECT * FROM t1 JOIN t2',
      [
        { tableName: 't1', alias: undefined },
        { tableName: 't2', alias: undefined },
      ],
    ],
    [
      'SELECT * FROM db1.t1 JOIN db2.t2',
      [
        { tableName: 't1', alias: undefined },
        { tableName: 't2', alias: undefined },
      ],
    ],
    [
      `SELECT *
    FROM db1.t1 JOIN db2.t2 t2
    INNER JOIN t3  AS t3
    RIGHT OUTER JOIN t4`,
      [
        { tableName: 't1', alias: undefined },
        { tableName: 't2', alias: 't2' },
        { tableName: 't3', alias: 't3' },
        { tableName: 't4', alias: undefined },
      ],
    ],
  ])('table name', (sql, expected) => {
    expect(extractTableNames(sql)).toEqual(expected);
  });
});
