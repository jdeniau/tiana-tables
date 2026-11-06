import { describe, expect, it } from 'vitest';
import { mysqlDialect } from './dialect/mysql';
import { postgresDialect } from './dialect/postgres';
import {
  FILTER_OPERATORS,
  FilterOperator,
  buildFilterClause,
  operatorTakesValue,
  primaryKeyFilterClause,
} from './filterClause';
import { FieldKind } from './resultField';

describe('operatorTakesValue', () => {
  it.each([
    [FilterOperator.Equals, true],
    [FilterOperator.NotEquals, true],
    [FilterOperator.LessThan, true],
    [FilterOperator.LessThanOrEqual, true],
    [FilterOperator.GreaterThan, true],
    [FilterOperator.GreaterThanOrEqual, true],
    [FilterOperator.Like, true],
    [FilterOperator.NotLike, true],
    [FilterOperator.IsNull, false],
    [FilterOperator.IsNotNull, false],
  ])('%s takes a value: %s', (operator, expected) => {
    expect(operatorTakesValue(operator)).toBe(expected);
  });
});

describe('buildFilterClause', () => {
  it('compares a column to a literal', () => {
    expect(
      buildFilterClause(mysqlDialect, 'name', FilterOperator.Equals, "'lorem'")
    ).toBe("`name` = 'lorem'");
  });

  it('writes a numeric literal unquoted, as it was given', () => {
    expect(
      buildFilterClause(mysqlDialect, 'id', FilterOperator.GreaterThan, '12')
    ).toBe('`id` > 12');
  });

  it('needs no value for a null test', () => {
    expect(
      buildFilterClause(mysqlDialect, 'deletedAt', FilterOperator.IsNull)
    ).toBe('`deletedAt` IS NULL');
    expect(
      buildFilterClause(mysqlDialect, 'deletedAt', FilterOperator.IsNotNull)
    ).toBe('`deletedAt` IS NOT NULL');
  });

  it('ignores a literal given to an operator that takes none', () => {
    expect(
      buildFilterClause(mysqlDialect, 'deletedAt', FilterOperator.IsNull, "'x'")
    ).toBe('`deletedAt` IS NULL');
  });

  it('escapes the column name', () => {
    expect(
      buildFilterClause(mysqlDialect, 'we`ird', FilterOperator.Equals, '1')
    ).toBe('`we``ird` = 1');
  });

  it('refuses to compare to a missing value', () => {
    expect(() =>
      buildFilterClause(mysqlDialect, 'name', FilterOperator.Equals)
    ).toThrow();
  });

  it('lists every operator of the enum, so the menu shows them all', () => {
    expect([...FILTER_OPERATORS].sort()).toEqual(
      Object.values(FilterOperator).sort()
    );
  });
});

describe('primaryKeyFilterClause', () => {
  it('compares a number key to the bare number', () => {
    expect(
      primaryKeyFilterClause(mysqlDialect, [
        { column: 'id', kind: FieldKind.Number, text: '42' },
      ])
    ).toBe('`id` = 42');
  });

  it.each([
    ['a text key holding digits', FieldKind.String, '42', "`id` = '42'"],
    [
      'a number key holding anything but a number',
      FieldKind.Number,
      '1 OR 1=1',
      "`id` = '1 OR 1=1'",
    ],
  ])('quotes %s', (_, kind, text, expected) => {
    expect(
      primaryKeyFilterClause(mysqlDialect, [{ column: 'id', kind, text }])
    ).toBe(expected);
  });

  it('compares every column of a composite key', () => {
    expect(
      primaryKeyFilterClause(postgresDialect, [
        { column: 'article_id', kind: FieldKind.Number, text: '1' },
        { column: 'code', kind: FieldKind.String, text: '2' },
      ])
    ).toBe(`"article_id" = 1 AND "code" = '2'`);
  });

  it.each([
    [mysqlDialect, "`code` = 'l\\'été'"],
    [postgresDialect, `"code" = 'l''été'`],
  ])('escapes what is typed', (dialect, expected) => {
    expect(
      primaryKeyFilterClause(dialect, [
        { column: 'code', kind: FieldKind.String, text: "l'été" },
      ])
    ).toBe(expected);
  });
});
