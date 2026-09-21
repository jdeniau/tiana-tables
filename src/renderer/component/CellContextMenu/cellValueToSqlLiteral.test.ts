import { describe, expect, it } from 'vitest';
import { mysqlDialect } from '../../../sql/dialect/mysql';
import { FieldKind } from '../../../sql/resultField';
import { cellValueToSqlLiteral } from './cellValueToSqlLiteral';

describe('cellValueToSqlLiteral', () => {
  it('writes a number bare', () => {
    expect(cellValueToSqlLiteral(mysqlDialect, 12, FieldKind.Number)).toBe(
      '12'
    );
    expect(cellValueToSqlLiteral(mysqlDialect, -1.5, FieldKind.Number)).toBe(
      '-1.5'
    );
  });

  it('writes a bigint bare, keeping every digit', () => {
    expect(
      cellValueToSqlLiteral(mysqlDialect, 9007199254740993n, FieldKind.Number)
    ).toBe('9007199254740993');
  });

  it('quotes a string, and escapes it', () => {
    expect(
      cellValueToSqlLiteral(mysqlDialect, "O'Brien", FieldKind.String)
    ).toBe("'O\\'Brien'");
  });

  it('quotes a DECIMAL, which the driver answers with as a string', () => {
    // MySQL coerces the literal back to a decimal when comparing, and quoting
    // is the only form that keeps the scale intact on the way there
    expect(cellValueToSqlLiteral(mysqlDialect, '10.50', FieldKind.Number)).toBe(
      "'10.50'"
    );
  });

  it('writes a DATE as a day, a DATETIME as a wall clock', () => {
    const date = new Date(2026, 0, 15, 10, 30, 0);

    expect(cellValueToSqlLiteral(mysqlDialect, date, FieldKind.Date)).toBe(
      "'2026-01-15'"
    );
    expect(cellValueToSqlLiteral(mysqlDialect, date, FieldKind.DateTime)).toBe(
      "'2026-01-15 10:30:00'"
    );
  });

  it('writes a boolean as MySQL holds it', () => {
    expect(cellValueToSqlLiteral(mysqlDialect, true, FieldKind.Number)).toBe(
      '1'
    );
    expect(cellValueToSqlLiteral(mysqlDialect, false, FieldKind.Number)).toBe(
      '0'
    );
  });

  it('writes a JSON value as the compact text the server parses', () => {
    // the double quotes come out backslash-escaped, as mysql2 escapes them too
    expect(cellValueToSqlLiteral(mysqlDialect, { a: 1 }, FieldKind.Json)).toBe(
      String.raw`'{\"a\":1}'`
    );
  });

  it('offers no literal for a null value', () => {
    expect(
      cellValueToSqlLiteral(mysqlDialect, null, FieldKind.String)
    ).toBeUndefined();
    expect(
      cellValueToSqlLiteral(mysqlDialect, undefined, FieldKind.String)
    ).toBeUndefined();
  });

  it('offers no literal for raw bytes', () => {
    expect(
      cellValueToSqlLiteral(
        mysqlDialect,
        new Uint8Array([0, 1, 2]),
        FieldKind.Text
      )
    ).toBeUndefined();
  });
});
