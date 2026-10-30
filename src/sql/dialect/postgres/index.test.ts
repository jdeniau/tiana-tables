import { describe, expect, it } from 'vitest';
import { postgresDialect } from '.';

describe('postgresDialect', () => {
  it('names a table by its schema, each part quoted on its own', () => {
    expect(postgresDialect.qualify('app', 'orders')).toBe('"app"."orders"');
  });

  it('switches schema through the search path, that schema alone', () => {
    expect(postgresDialect.useDatabase('app')).toBe(
      'SET search_path TO "app";'
    );
  });

  it('writes a boolean as a boolean', () => {
    expect(postgresDialect.booleanLiteral(true)).toBe('TRUE');
    expect(postgresDialect.booleanLiteral(false)).toBe('FALSE');
  });

  it('tells the schemas the server keeps for itself', () => {
    expect(postgresDialect.isSystemDatabase('pg_catalog')).toBe(true);
    expect(postgresDialect.isSystemDatabase('information_schema')).toBe(true);
    expect(postgresDialect.isSystemDatabase('public')).toBe(false);
    // only the lowercase prefix is reserved
    expect(postgresDialect.isSystemDatabase('PG_app')).toBe(false);
  });

  it('deletes each row by its key, with no bound PostgreSQL could read', () => {
    const { sql, values } = postgresDialect.deleteRows({
      database: 'app',
      table: 'orders',
      rows: [[{ column: 'id', value: 4 }], [{ column: 'id', value: '7' }]],
    });

    expect(sql).toBe(
      'DELETE FROM "app"."orders" WHERE ("id" = :row0Key0) OR ("id" = :row1Key0)'
    );
    expect(values).toEqual({ row0Key0: 4, row1Key0: '7' });
  });
});
