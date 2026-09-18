import { describe, expect, it } from 'vitest';
import { mysqlDialect } from '.';

describe('mysqlDialect', () => {
  it('names a table by its database, each part quoted on its own', () => {
    expect(mysqlDialect.qualify('my-db', 'a.b')).toBe('`my-db`.`a.b`');
  });

  it('switches database with a statement of its own', () => {
    expect(mysqlDialect.useDatabase('my-db')).toBe('USE `my-db`;');
  });
});
