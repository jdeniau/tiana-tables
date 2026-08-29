import { describe, expect, it } from 'vitest';
import {
  FILTER_OPERATORS,
  FilterOperator,
  buildFilterClause,
  operatorTakesValue,
} from './filterClause';

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
      buildFilterClause('name', FilterOperator.Equals, "'lorem'")
    ).toBe("`name` = 'lorem'");
  });

  it('writes a numeric literal unquoted, as it was given', () => {
    expect(buildFilterClause('id', FilterOperator.GreaterThan, '12')).toBe(
      '`id` > 12'
    );
  });

  it('needs no value for a null test', () => {
    expect(buildFilterClause('deletedAt', FilterOperator.IsNull)).toBe(
      '`deletedAt` IS NULL'
    );
    expect(buildFilterClause('deletedAt', FilterOperator.IsNotNull)).toBe(
      '`deletedAt` IS NOT NULL'
    );
  });

  it('ignores a literal given to an operator that takes none', () => {
    expect(buildFilterClause('deletedAt', FilterOperator.IsNull, "'x'")).toBe(
      '`deletedAt` IS NULL'
    );
  });

  it('escapes the column name', () => {
    expect(buildFilterClause('we`ird', FilterOperator.Equals, '1')).toBe(
      '`we``ird` = 1'
    );
  });

  it('refuses to compare to a missing value', () => {
    expect(() => buildFilterClause('name', FilterOperator.Equals)).toThrow();
  });

  it('lists every operator of the enum, so the menu shows them all', () => {
    expect([...FILTER_OPERATORS].sort()).toEqual(
      Object.values(FilterOperator).sort()
    );
  });
});
