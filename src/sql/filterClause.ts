import type { Dialect } from './dialect/types';
import { FieldKind } from './resultField';

/**
 * The comparisons the grid's context menu offers on a column.
 *
 * An enum rather than a string union: this is a closed vocabulary, and its
 * values are the SQL operators themselves — so they are what gets written into
 * the clause, and what the menu labels itself with. They are never translated.
 */
export enum FilterOperator {
  Equals = '=',
  NotEquals = '!=',
  LessThan = '<',
  LessThanOrEqual = '<=',
  GreaterThan = '>',
  GreaterThanOrEqual = '>=',
  Like = 'LIKE',
  NotLike = 'NOT LIKE',
  IsNull = 'IS NULL',
  IsNotNull = 'IS NOT NULL',
}

/** The operators, in the order the menu lists them. */
export const FILTER_OPERATORS: ReadonlyArray<FilterOperator> = [
  FilterOperator.Equals,
  FilterOperator.NotEquals,
  FilterOperator.LessThan,
  FilterOperator.LessThanOrEqual,
  FilterOperator.GreaterThan,
  FilterOperator.GreaterThanOrEqual,
  FilterOperator.Like,
  FilterOperator.NotLike,
  FilterOperator.IsNull,
  FilterOperator.IsNotNull,
];

const VALUELESS_OPERATORS: ReadonlySet<FilterOperator> = new Set([
  FilterOperator.IsNull,
  FilterOperator.IsNotNull,
]);

/**
 * Whether the operator compares the column to something, or is complete on its
 * own — which is what decides if the menu opens a submenu of value sources.
 */
export function operatorTakesValue(operator: FilterOperator): boolean {
  return !VALUELESS_OPERATORS.has(operator);
}

/**
 * The `WHERE` clause comparing a column, as it will be sent to the server.
 *
 * The literal arrives already built and already escaped (see
 * `cellValueToSqlLiteral`): what a value looks like in SQL depends on its type,
 * which only the renderer knows. This function assembles, and quotes the one
 * part it owns — the column name.
 */
export function buildFilterClause(
  dialect: Dialect,
  columnName: string,
  operator: FilterOperator,
  literal?: string
): string {
  const column = dialect.escapeIdentifier(columnName);

  if (!operatorTakesValue(operator)) {
    return `${column} ${operator}`;
  }

  if (literal === undefined) {
    throw new Error(`The operator ${operator} needs a value to compare to`);
  }

  return `${column} ${operator} ${literal}`;
}

/** One column of a primary key, and what it holds. */
export interface PrimaryKeyColumn {
  column: string;
  kind: FieldKind;
}

/** One column of a primary key, and the value typed for it. */
export interface PrimaryKeyText extends PrimaryKeyColumn {
  text: string;
}

/** a number as a key column holds it: no exponent, no hexadecimal, no `Infinity` */
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

/** Whether `text` can go into SQL bare, as a number. */
export function isPlainNumber(text: string): boolean {
  return PLAIN_NUMBER.test(text);
}

/** The `WHERE` clause of the row whose primary key holds these typed values. */
export function primaryKeyFilterClause(
  dialect: Dialect,
  primaryKey: ReadonlyArray<PrimaryKeyText>
): string {
  return primaryKey
    .map(({ column, kind, text }) =>
      buildFilterClause(
        dialect,
        column,
        FilterOperator.Equals,
        // anything else is quoted, so no typed text can reach the SQL bare
        kind === FieldKind.Number && isPlainNumber(text)
          ? text
          : dialect.escapeLiteral(text)
      )
    )
    .join(' AND ');
}
