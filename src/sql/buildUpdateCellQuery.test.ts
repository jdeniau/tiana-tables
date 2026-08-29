import { describe, expect, it } from 'vitest';
import {
  buildReadCellQuery,
  buildUpdateCellQuery,
} from './buildUpdateCellQuery';
import type { UpdateCellRequest } from './updateCell';

function makeRequest(
  overrides: Partial<UpdateCellRequest> = {}
): UpdateCellRequest {
  return {
    database: 'shop',
    table: 'orders',
    column: 'label',
    primaryKey: [{ column: 'id', value: 42 }],
    newValue: 'new label',
    originalValue: 'old label',
    ...overrides,
  };
}

/**
 * The parameters a statement names, in the syntax the driver rewrites:
 * `:name`, only ever written by these builders.
 */
function namedParameters(sql: string): Array<string> {
  return [...sql.matchAll(/:([a-zA-Z][a-zA-Z0-9_]*)/g)].map(([, name]) => name);
}

/**
 * Naming the parameters removes the counting, not the need to agree: a
 * parameter the statement names and the object does not hold is bound to
 * `undefined` — that is, written as `NULL` — and one the object holds and the
 * statement does not name is dropped. Neither is reported by the driver, so
 * both are checked here.
 */
describe.each([
  ['a guarded write', () => buildUpdateCellQuery(makeRequest())],
  ['a forced write', () => buildUpdateCellQuery(makeRequest({ force: true }))],
  [
    'a write on a composite key',
    () =>
      buildUpdateCellQuery(
        makeRequest({
          primaryKey: [
            { column: 'order_id', value: 1 },
            { column: 'line_id', value: 2 },
          ],
        })
      ),
  ],
  [
    'a write on a JSON column',
    () => buildUpdateCellQuery(makeRequest({ isJsonColumn: true })),
  ],
  ['a read-back', () => buildReadCellQuery(makeRequest())],
])('%s', (_name, build) => {
  it('binds exactly the parameters it names', () => {
    const { sql, values } = build();
    const named = namedParameters(sql);

    expect(named.length).toBeGreaterThan(0);
    expect([...named].sort()).toEqual(Object.keys(values).sort());
  });
});

describe('buildUpdateCellQuery', () => {
  it('guards the write on the value the row was loaded with', () => {
    const { sql, values } = buildUpdateCellQuery(makeRequest());

    expect(sql).toBe(
      'UPDATE `shop`.`orders` SET `label` = :newValue ' +
        'WHERE `id` = :primaryKey0 AND `label` <=> :originalValue LIMIT 1'
    );
    expect(values).toEqual({
      newValue: 'new label',
      primaryKey0: 42,
      originalValue: 'old label',
    });
  });

  it('compares every part of a composite primary key', () => {
    const { sql, values } = buildUpdateCellQuery(
      makeRequest({
        primaryKey: [
          { column: 'order_id', value: 1 },
          { column: 'line_id', value: 2 },
        ],
      })
    );

    expect(sql).toBe(
      'UPDATE `shop`.`orders` SET `label` = :newValue ' +
        'WHERE `order_id` = :primaryKey0 AND `line_id` = :primaryKey1 ' +
        'AND `label` <=> :originalValue LIMIT 1'
    );
    expect(values).toEqual({
      newValue: 'new label',
      primaryKey0: 1,
      primaryKey1: 2,
      originalValue: 'old label',
    });
  });

  it('binds NULL like any other value, so the guard holds on an empty cell', () => {
    const { sql, values } = buildUpdateCellQuery(
      makeRequest({ newValue: null, originalValue: null })
    );

    // the guard, and only the guard, needs the null-safe operator: `NULL = NULL`
    // is unknown and would match nothing. A primary key is never NULL, hence `=`
    expect(sql).toContain('`label` <=> :originalValue');
    expect(sql).toContain('`id` = :primaryKey0');
    expect(values).toEqual({
      newValue: null,
      primaryKey0: 42,
      originalValue: null,
    });
  });

  it('drops the guard when the user chose to overwrite', () => {
    const { sql, values } = buildUpdateCellQuery(makeRequest({ force: true }));

    expect(sql).toBe(
      'UPDATE `shop`.`orders` SET `label` = :newValue ' +
        'WHERE `id` = :primaryKey0 LIMIT 1'
    );
    // no guard, so nothing to bind to `originalValue`
    expect(values).toEqual({ newValue: 'new label', primaryKey0: 42 });
  });

  it('casts both sides of a JSON column, so spacing does not read as a conflict', () => {
    const { sql, values } = buildUpdateCellQuery(
      makeRequest({
        column: 'payload',
        isJsonColumn: true,
        newValue: '{"a": 1}',
        originalValue: '{"a":1}',
      })
    );

    expect(sql).toBe(
      'UPDATE `shop`.`orders` SET `payload` = CAST(:newValue AS JSON) ' +
        'WHERE `id` = :primaryKey0 ' +
        'AND `payload` <=> CAST(:originalValue AS JSON) LIMIT 1'
    );
    expect(values).toEqual({
      newValue: '{"a": 1}',
      primaryKey0: 42,
      originalValue: '{"a":1}',
    });
  });

  it('escapes identifiers instead of interpolating them raw', () => {
    const { sql } = buildUpdateCellQuery(
      makeRequest({ table: 'or`ders', column: 'la`bel' })
    );

    expect(sql).toContain('`shop`.`or``ders`');
    expect(sql).toContain('SET `la``bel` = :newValue');
  });

  it('refuses a row that no primary key identifies', () => {
    expect(() => buildUpdateCellQuery(makeRequest({ primaryKey: [] }))).toThrow(
      /primary key/
    );
  });
});

describe('buildReadCellQuery', () => {
  it('reads the value back and asks whether the guard still matches', () => {
    const { sql, values } = buildReadCellQuery(makeRequest());

    expect(sql).toBe(
      'SELECT `label` AS `value`, ' +
        '(`label` <=> :originalValue) AS `guardMatches` ' +
        'FROM `shop`.`orders` WHERE `id` = :primaryKey0 LIMIT 1'
    );
    expect(values).toEqual({ originalValue: 'old label', primaryKey0: 42 });
  });

  it('targets the row by its primary key only, never by the guard', () => {
    // the row must be read even once the guard fails: that is how a concurrent
    // write is told apart from a deleted row
    const { sql } = buildReadCellQuery(makeRequest());

    expect(sql).toContain('WHERE `id` = :primaryKey0 LIMIT 1');
  });

  it('compares as JSON on a JSON column', () => {
    const { sql } = buildReadCellQuery(
      makeRequest({ column: 'payload', isJsonColumn: true })
    );

    expect(sql).toContain(
      '(`payload` <=> CAST(:originalValue AS JSON)) AS `guardMatches`'
    );
  });
});
