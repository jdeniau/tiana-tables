import { describe, expect, it } from 'vitest';
import { mysqlDialect } from '../../../sql/dialect/mysql';
import { cellValueToSqlLiteral } from './cellValueToSqlLiteral';

describe('cellValueToSqlLiteral', () => {
  it('writes a number bare', () => {
    expect(cellValueToSqlLiteral(mysqlDialect, 12)).toBe('12');
    expect(cellValueToSqlLiteral(mysqlDialect, -1.5)).toBe('-1.5');
  });

  it('writes a bigint bare, keeping every digit', () => {
    expect(cellValueToSqlLiteral(mysqlDialect, 9007199254740993n)).toBe(
      '9007199254740993'
    );
  });

  it('quotes a string, and escapes it', () => {
    expect(cellValueToSqlLiteral(mysqlDialect, "O'Brien")).toBe("'O\\'Brien'");
  });

  it('quotes a DECIMAL, which the driver answers with as a string', () => {
    // MySQL coerces the literal back to a decimal when comparing, and quoting
    // is the only form that keeps the scale intact on the way there
    expect(cellValueToSqlLiteral(mysqlDialect, '10.50')).toBe("'10.50'");
  });

  // what the grid shows is cut to the second, and would never equal a `DATETIME(6)`
  it('writes a date as the server wrote it, microseconds included', () => {
    expect(
      cellValueToSqlLiteral(mysqlDialect, '2026-01-15 10:30:00.123456')
    ).toBe("'2026-01-15 10:30:00.123456'");
  });

  it('writes a boolean as MySQL holds it', () => {
    expect(cellValueToSqlLiteral(mysqlDialect, true)).toBe('1');
    expect(cellValueToSqlLiteral(mysqlDialect, false)).toBe('0');
  });

  it('writes a JSON value as the compact text the server parses', () => {
    // the double quotes come out backslash-escaped, as mysql2 escapes them too
    expect(cellValueToSqlLiteral(mysqlDialect, { a: 1 })).toBe(
      String.raw`'{\"a\":1}'`
    );
  });

  it('offers no literal for a null value', () => {
    expect(cellValueToSqlLiteral(mysqlDialect, null)).toBeUndefined();
    expect(cellValueToSqlLiteral(mysqlDialect, undefined)).toBeUndefined();
  });

  it('offers no literal for raw bytes', () => {
    expect(
      cellValueToSqlLiteral(mysqlDialect, new Uint8Array([0, 1, 2]))
    ).toBeUndefined();
  });
});
