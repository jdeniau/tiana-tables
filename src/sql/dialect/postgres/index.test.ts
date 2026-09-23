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
});
