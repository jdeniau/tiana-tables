import { describe, expect, it } from 'vitest';
import { DatabaseEngine } from '../engine';
import type { UpdateCellRequest } from '../updateCell';
import type { BuiltQuery } from './readQuery';
import type { Dialect } from './types';
import { getDialect } from '.';

/**
 * What every dialect owes the app, whatever its SQL looks like.
 * The text itself is asserted by hand next to each dialect;
 * this file holds the rules a new engine gets checked against for free.
 */
const DIALECTS = Object.values(DatabaseEngine).map(
  (engine) => [engine, getDialect(engine)] as const
);

/** names chosen to be found if interpolated: nothing else in a query holds them */
const DATABASE = 'contract_database';
const TABLE = 'contract_table';

/** `:name`, the placeholder syntax every dialect writes and its driver rewrites */
function namedParameters(sql: string): string[] {
  return [...sql.matchAll(/:([a-zA-Z][a-zA-Z0-9_]*)/g)].map(([, name]) => name);
}

function request(
  overrides: Partial<UpdateCellRequest> = {}
): UpdateCellRequest {
  return {
    database: DATABASE,
    table: TABLE,
    column: 'label',
    primaryKey: [{ column: 'id', value: 42 }],
    newValue: 'new label',
    originalValue: 'old label',
    ...overrides,
  };
}

/** every statement a dialect writes with bound values, labelled */
function statements(dialect: Dialect): Array<[string, BuiltQuery]> {
  const { metadata, guardedUpdate } = dialect;

  return [
    ['listDatabases', metadata.listDatabases()],
    ['listTables', metadata.listTables(DATABASE)],
    ['listForeignKeys', metadata.listForeignKeys(DATABASE)],
    ['listPrimaryKeyColumns', metadata.listPrimaryKeyColumns(DATABASE, TABLE)],
    ['listColumns', metadata.listColumns(DATABASE)],
    ['describeTable', metadata.describeTable(DATABASE, TABLE)],
    ['a guarded write', guardedUpdate(request()).write],
    ['a forced write', guardedUpdate(request({ force: true })).write],
    [
      'a write on a composite key',
      guardedUpdate(
        request({
          primaryKey: [
            { column: 'order_id', value: 1 },
            { column: 'line_id', value: 2 },
          ],
        })
      ).write,
    ],
    [
      'a write on a JSON column',
      guardedUpdate(request({ isJsonColumn: true })).write,
    ],
    ['a read-back', guardedUpdate(request()).readBack],
  ];
}

describe.each(DIALECTS)('the %s dialect', (_engine, dialect) => {
  describe.each(statements(dialect))('%s', (_label, { sql, values }) => {
    // a name the statement uses and the object lacks is bound as NULL, one the
    // object holds and the statement does not name is dropped: neither is reported
    it('binds exactly the parameters it names', () => {
      const named = namedParameters(sql);

      expect([...new Set(named)].sort()).toEqual(Object.keys(values).sort());
    });

    // `multipleStatements` stays off: an inner `;` would fail the whole query
    it('is one statement', () => {
      expect(sql.trim().replace(/;$/, '')).not.toContain(';');
    });

    it('never interpolates a value it binds', () => {
      for (const value of Object.values(values)) {
        if (typeof value === 'string') {
          expect(sql).not.toContain(value);
        }
      }
    });
  });

  describe('escapeIdentifier', () => {
    const quote = dialect.escapeIdentifier('x')[0];

    // a bare pair of quotes is invalid SQL that no server names
    it('refuses an empty identifier', () => {
      expect(() => dialect.escapeIdentifier('')).toThrow();
    });

    it('doubles its own quote character', () => {
      expect(dialect.escapeIdentifier(`a${quote}b`)).toBe(
        `${quote}a${quote}${quote}b${quote}`
      );
    });

    // callers pass one name and qualify it themselves; `my.db` is a legal
    // database name, accepted by MySQL 8.4 and MariaDB 11.4 (measured 2026-08-27)
    it('keeps a dotted name as one identifier', () => {
      expect(dialect.escapeIdentifier('a.b')).toBe(`${quote}a.b${quote}`);
    });
  });

  it('qualifies a table with each part quoted on its own', () => {
    expect(dialect.qualify('my.db', 'a.b')).toBe(
      `${dialect.escapeIdentifier('my.db')}.${dialect.escapeIdentifier('a.b')}`
    );
  });

  it('switches database in one statement naming it quoted', () => {
    const statement = dialect.useDatabase('my.db');

    expect(statement).toContain(dialect.escapeIdentifier('my.db'));
    expect(statement.trim().replace(/;$/, '')).not.toContain(';');
  });

  it('tells true from false', () => {
    expect(dialect.booleanLiteral(true)).not.toBe(
      dialect.booleanLiteral(false)
    );
  });

  describe('bytesLiteral', () => {
    // a copied row must paste back the bytes it holds, not their decoding
    it('writes every byte, in hexadecimal', () => {
      const literal = dialect.bytesLiteral(new Uint8Array([0xca, 0xfe, 0x00]));

      expect(literal.toUpperCase()).toContain('CAFE00');
    });

    it('writes an empty value as a literal still', () => {
      expect(dialect.bytesLiteral(new Uint8Array())).not.toBe('');
    });
  });
});
