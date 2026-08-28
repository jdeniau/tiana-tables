import { Types } from 'mysql';
import { describe, expect, it } from 'vitest';
import { cellValueToSqlLiteral } from './cellValueToSqlLiteral';

describe('cellValueToSqlLiteral', () => {
  it('writes a number bare', () => {
    expect(cellValueToSqlLiteral(12, Types.LONG)).toBe('12');
    expect(cellValueToSqlLiteral(-1.5, Types.DOUBLE)).toBe('-1.5');
  });

  it('writes a bigint bare, keeping every digit', () => {
    expect(cellValueToSqlLiteral(9007199254740993n, Types.LONGLONG)).toBe(
      '9007199254740993'
    );
  });

  it('quotes a string, and escapes it', () => {
    expect(cellValueToSqlLiteral("O'Brien", Types.VAR_STRING)).toBe(
      "'O\\'Brien'"
    );
  });

  it('quotes a DECIMAL, which the driver answers with as a string', () => {
    // MySQL coerces the literal back to a decimal when comparing, and quoting
    // is the only form that keeps the scale intact on the way there
    expect(cellValueToSqlLiteral('10.50', Types.NEWDECIMAL)).toBe("'10.50'");
  });

  it('writes a DATE as a day, a DATETIME as a wall clock', () => {
    const date = new Date(2026, 0, 15, 10, 30, 0);

    expect(cellValueToSqlLiteral(date, Types.DATE)).toBe("'2026-01-15'");
    expect(cellValueToSqlLiteral(date, Types.DATETIME)).toBe(
      "'2026-01-15 10:30:00'"
    );
  });

  it('writes a boolean as MySQL holds it', () => {
    expect(cellValueToSqlLiteral(true, Types.TINY)).toBe('1');
    expect(cellValueToSqlLiteral(false, Types.TINY)).toBe('0');
  });

  it('writes a JSON value as the compact text the server parses', () => {
    // the double quotes come out backslash-escaped, as mysql2 escapes them too
    expect(cellValueToSqlLiteral({ a: 1 }, Types.JSON)).toBe(
      String.raw`'{\"a\":1}'`
    );
  });

  it('offers no literal for a null value', () => {
    expect(cellValueToSqlLiteral(null, Types.VAR_STRING)).toBeUndefined();
    expect(cellValueToSqlLiteral(undefined, Types.VAR_STRING)).toBeUndefined();
  });

  it('offers no literal for raw bytes', () => {
    expect(
      cellValueToSqlLiteral(new Uint8Array([0, 1, 2]), Types.BLOB)
    ).toBeUndefined();
  });
});
