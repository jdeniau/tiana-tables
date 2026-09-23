import { describe, expect, it } from 'vitest';
import type { UpdateCellRequest } from '../../updateCell';
import { mysqlGuardedUpdate } from './guardedUpdate';

function write(request: UpdateCellRequest) {
  return mysqlGuardedUpdate(request).write;
}

function readBack(request: UpdateCellRequest) {
  return mysqlGuardedUpdate(request).readBack;
}

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

describe('the write', () => {
  it('guards the write on the value the row was loaded with', () => {
    const { sql, values } = write(makeRequest());

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
    const { sql, values } = write(
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
    const { sql, values } = write(
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
    const { sql, values } = write(makeRequest({ force: true }));

    expect(sql).toBe(
      'UPDATE `shop`.`orders` SET `label` = :newValue ' +
        'WHERE `id` = :primaryKey0 LIMIT 1'
    );
    // no guard, so nothing to bind to `originalValue`
    expect(values).toEqual({ newValue: 'new label', primaryKey0: 42 });
  });

  it('casts both sides of a JSON column, so spacing does not read as a conflict', () => {
    const { sql, values } = write(
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
    const { sql } = write(makeRequest({ table: 'or`ders', column: 'la`bel' }));

    expect(sql).toContain('`shop`.`or``ders`');
    expect(sql).toContain('SET `la``bel` = :newValue');
  });

  it('refuses a row that no primary key identifies', () => {
    expect(() => write(makeRequest({ primaryKey: [] }))).toThrow(/primary key/);
  });
});

describe('the read-back', () => {
  it('reads the value back and asks whether the guard still matches', () => {
    const { sql, values } = readBack(makeRequest());

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
    const { sql } = readBack(makeRequest());

    expect(sql).toContain('WHERE `id` = :primaryKey0 LIMIT 1');
  });

  it('compares as JSON on a JSON column', () => {
    const { sql } = readBack(
      makeRequest({ column: 'payload', isJsonColumn: true })
    );

    expect(sql).toContain(
      '(`payload` <=> CAST(:originalValue AS JSON)) AS `guardMatches`'
    );
  });
});

/**
 * What MySQL's answers mean, on answers written by hand:
 * `affectedRows` counts changed rows, so it cannot tell alone.
 */
describe('the outcome', () => {
  const WROTE_ONE = { affectedRows: 1, insertId: null };
  const WROTE_NONE = { affectedRows: 0, insertId: null };

  function outcome(
    written: typeof WROTE_ONE,
    rows: Array<{ value: unknown; guardMatches: number }>,
    overrides: Partial<UpdateCellRequest> = {}
  ) {
    const guarded = mysqlGuardedUpdate(makeRequest(overrides));

    return guarded.outcomeOfReadBack(written, guarded.readBack.answer(rows));
  }

  it('always needs the read-back, for the value the server kept', () => {
    expect(
      mysqlGuardedUpdate(makeRequest()).outcomeOfWrite(WROTE_ONE)
    ).toBeUndefined();
  });

  it('reports the value read back once a row was changed', () => {
    expect(outcome(WROTE_ONE, [{ value: 'new', guardMatches: 0 }])).toEqual({
      status: 'updated',
      value: 'new',
    });
  });

  it('takes a guard that still holds for a value written twice', () => {
    expect(outcome(WROTE_NONE, [{ value: 'same', guardMatches: 1 }])).toEqual({
      status: 'updated',
      value: 'same',
    });
  });

  it('reports a conflict when someone else changed the cell', () => {
    expect(outcome(WROTE_NONE, [{ value: 'theirs', guardMatches: 0 }])).toEqual(
      { status: 'conflict', reason: 'changed', currentValue: 'theirs' }
    );
  });

  it('reports a deleted row when nothing reads back', () => {
    expect(outcome(WROTE_NONE, [])).toEqual({
      status: 'conflict',
      reason: 'deleted',
    });
  });

  it('trusts a forced write, which has no guard to fail', () => {
    expect(
      outcome(WROTE_NONE, [{ value: 'mine', guardMatches: 0 }], { force: true })
    ).toEqual({ status: 'updated', value: 'mine' });
  });

  it('refuses a read-back of another shape', () => {
    expect(() =>
      mysqlGuardedUpdate(makeRequest()).readBack.answer([{ value: 'x' }])
    ).toThrow(/readBack .* row 0, guardMatches/);
  });
});
