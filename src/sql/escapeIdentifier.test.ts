import { describe, expect, it } from 'vitest';
import { escapeIdentifier } from './escapeIdentifier';

describe('escapeIdentifier', () => {
  it('wraps an identifier in backticks', () => {
    expect(escapeIdentifier('orders')).toBe('`orders`');
  });

  it('doubles a backtick held by the identifier', () => {
    expect(escapeIdentifier('we`ird')).toBe('`we``ird`');
  });

  it('quotes a name that would not be valid bare', () => {
    // the whole point of the escaping: `SHOW TABLE STATUS FROM my-db` is a
    // syntax error, and `-` in a database or table name is common enough
    expect(escapeIdentifier('my-db')).toBe('`my-db`');
  });

  it('refuses an empty identifier', () => {
    // `mysql.escapeId('')` answers with two bare backticks — invalid SQL, and
    // silent about it. One of the two reasons this function is not delegated.
    expect(() => escapeIdentifier('')).toThrow();
  });

  it('keeps a dotted name as one identifier', () => {
    // the other reason: `mysql.escapeId` reads a `.` as a qualifier separator
    // unless told otherwise, and would answer `\`a\`.\`b\``. Callers here pass
    // a single name and assemble `db`.`table` themselves.
    //
    // Not a theoretical case, checked against MySQL 8.4 and MariaDB 11.4
    // (2026-08-27): `CREATE DATABASE \`my.db\``, `CREATE TABLE \`a.b\`` and a
    // `\`c.d\`` column are all accepted — a quoted identifier takes the whole
    // BMP, and only the *file name* on disk encodes the dot (`my@002edb`). Our
    // form, `SELECT * FROM \`my.db\`.\`a.b\``, reads the row on both servers;
    // the qualifier-splitting form is ERROR 1064 on both.
    expect(escapeIdentifier('a.b')).toBe('`a.b`');
  });
});
