import { describe, expect, it } from 'vitest';
import { mysqlDialect } from '.';

describe('mysqlDialect', () => {
  it('names a table by its database, each part quoted on its own', () => {
    expect(mysqlDialect.qualify('my-db', 'a.b')).toBe('`my-db`.`a.b`');
  });

  it('switches database with a statement of its own', () => {
    expect(mysqlDialect.useDatabase('my-db')).toBe('USE `my-db`;');
  });

  // the escaping itself is the driver's, and testing its table is not our job
  it('hands a literal to the driver, quotes included', () => {
    expect(mysqlDialect.escapeLiteral("O'Brien")).toBe("'O\\'Brien'");
  });

  it('writes a boolean as the number MySQL holds it as', () => {
    expect(mysqlDialect.booleanLiteral(true)).toBe('1');
    expect(mysqlDialect.booleanLiteral(false)).toBe('0');
  });
});
