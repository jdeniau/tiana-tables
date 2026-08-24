import { describe, expect, it } from 'vitest';
import {
  buildReadCellQuery,
  buildUpdateCellQuery,
  escapeIdentifier,
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

describe('escapeIdentifier', () => {
  it('wraps an identifier in backticks', () => {
    expect(escapeIdentifier('orders')).toBe('`orders`');
  });

  it('doubles a backtick held by the identifier', () => {
    expect(escapeIdentifier('we`ird')).toBe('`we``ird`');
  });

  it('refuses an empty identifier', () => {
    expect(() => escapeIdentifier('')).toThrow();
  });
});

describe('buildUpdateCellQuery', () => {
  it('guards the write on the value the row was loaded with', () => {
    const { sql, values } = buildUpdateCellQuery(makeRequest());

    expect(sql).toBe(
      'UPDATE `shop`.`orders` SET `label` = ? ' +
        'WHERE `id` = ? AND `label` <=> ? LIMIT 1'
    );
    expect(values).toEqual(['new label', 42, 'old label']);
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
      'UPDATE `shop`.`orders` SET `label` = ? ' +
        'WHERE `order_id` = ? AND `line_id` = ? AND `label` <=> ? LIMIT 1'
    );
    expect(values).toEqual(['new label', 1, 2, 'old label']);
  });

  it('binds NULL like any other value, so the guard holds on an empty cell', () => {
    const { sql, values } = buildUpdateCellQuery(
      makeRequest({ newValue: null, originalValue: null })
    );

    // the guard, and only the guard, needs the null-safe operator: `NULL = NULL`
    // is unknown and would match nothing. A primary key is never NULL, hence `=`
    expect(sql).toContain('`label` <=> ?');
    expect(sql).toContain('`id` = ?');
    expect(values).toEqual([null, 42, null]);
  });

  it('drops the guard when the user chose to overwrite', () => {
    const { sql, values } = buildUpdateCellQuery(makeRequest({ force: true }));

    expect(sql).toBe(
      'UPDATE `shop`.`orders` SET `label` = ? WHERE `id` = ? LIMIT 1'
    );
    expect(values).toEqual(['new label', 42]);
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
      'UPDATE `shop`.`orders` SET `payload` = CAST(? AS JSON) ' +
        'WHERE `id` = ? AND `payload` <=> CAST(? AS JSON) LIMIT 1'
    );
    expect(values).toEqual(['{"a": 1}', 42, '{"a":1}']);
  });

  it('escapes identifiers instead of interpolating them raw', () => {
    const { sql } = buildUpdateCellQuery(
      makeRequest({ table: 'or`ders', column: 'la`bel' })
    );

    expect(sql).toContain('`shop`.`or``ders`');
    expect(sql).toContain('SET `la``bel` = ?');
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
      'SELECT `label` AS `value`, (`label` <=> ?) AS `guardMatches` ' +
        'FROM `shop`.`orders` WHERE `id` = ? LIMIT 1'
    );
    expect(values).toEqual(['old label', 42]);
  });

  it('targets the row by its primary key only, never by the guard', () => {
    // the row must be read even once the guard fails: that is how a concurrent
    // write is told apart from a deleted row
    const { sql } = buildReadCellQuery(makeRequest());

    expect(sql).toContain('WHERE `id` = ? LIMIT 1');
  });

  it('compares as JSON on a JSON column', () => {
    const { sql } = buildReadCellQuery(
      makeRequest({ column: 'payload', isJsonColumn: true })
    );

    expect(sql).toContain('(`payload` <=> CAST(? AS JSON)) AS `guardMatches`');
  });
});
