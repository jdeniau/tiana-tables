import { describe, expect, test } from 'vitest';
import { generateTableAlias } from './tableName';

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
