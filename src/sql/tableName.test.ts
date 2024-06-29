import { describe, expect, test } from 'vitest';
import { extractTableAliases, generateTableAlias } from './tableName';

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
    ['available_story', 'as_2'],
    ['illegal_nurse', 'in_2'],
  ])('should generate alias that is not a SQL reserved word', (tableName, expectedAlias) => {
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
    ['SELECT * FROM ', {}],
    ['SELECT * FROM tablename', { tablename: 'tablename' }],
    ['SELECT * FROM   tablename t', { t: 'tablename' }],
    ['SELECT * FROM tablename  AS t', { t: 'tablename' }],
    ['SELECT * FROM t1 JOIN t2', { t1: 't1', t2: 't2' }],
    ['SELECT * FROM db1.t1 JOIN db2.t2 AS t_2', { t1: 't1', t_2: 't2' }],
    ['SELECT * FROM db1.t1 t_ JOIN db2.t2 AS t_2', { t_: 't1', t_2: 't2' }],
    [
      `SELECT *
    FROM db1.t1 JOIN db2.t2 t2
    INNER JOIN t3  AS t3
    RIGHT OUTER JOIN t4`,
      { t1: 't1', t2: 't2', t3: 't3', t4: 't4' },
    ],
    ['SELECT * FROM table_name ', { table_name: 'table_name' }],
    ['SELECT * FROM table_name t ', { t: 'table_name' }],
    ['SELECT * FROM table_name t JOIN ', { t: 'table_name' }],
    [
      'SELECT * FROM table_name t JOIN table2 ',
      { t: 'table_name', table2: 'table2' },
    ],
    [
      'SELECT * FROM table_name t JOIN table2 t2 ',
      { t: 'table_name', t2: 'table2' },
    ],
    [
      'SELECT * FROM table_name t JOIN table2 t2 JOIN ',
      { t: 'table_name', t2: 'table2' },
    ],
    ['SELECT ticketing. FROM ticketing LIMIT 10;', { ticketing: 'ticketing' }],
  ])('table aliases', (sql, expected) => {
    expect(extractTableAliases(sql)).toEqual(expected);
  });
});
