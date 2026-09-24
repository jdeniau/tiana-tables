import { describe, expect, it } from 'vitest';
import {
  ConflictReason,
  type UpdateCellRequest,
  UpdateCellStatus,
} from '../../updateCell';
import { postgresGuardedUpdate } from './guardedUpdate';

function makeRequest(
  overrides: Partial<UpdateCellRequest> = {}
): UpdateCellRequest {
  return {
    database: 'app',
    table: 'orders',
    column: 'label',
    primaryKey: [{ column: 'id', value: 42 }],
    newValue: 'new label',
    originalValue: 'old label',
    ...overrides,
  };
}

describe('the write', () => {
  it('guards the write on the value the row was loaded with, and returns the cell', () => {
    const { sql, values } = postgresGuardedUpdate(makeRequest()).write;

    expect(sql).toBe(
      'UPDATE "app"."orders" SET "label" = :newValue ' +
        'WHERE "id" = :primaryKey0 AND "label" IS NOT DISTINCT FROM :originalValue ' +
        'RETURNING "label" AS value'
    );
    expect(values).toEqual({
      newValue: 'new label',
      primaryKey0: 42,
      originalValue: 'old label',
    });
  });

  it('compares every part of a composite primary key', () => {
    const { sql } = postgresGuardedUpdate(
      makeRequest({
        primaryKey: [
          { column: 'order_id', value: 1 },
          { column: 'line_no', value: 2 },
        ],
      })
    ).write;

    expect(sql).toContain(
      'WHERE "order_id" = :primaryKey0 AND "line_no" = :primaryKey1 AND'
    );
  });

  it('drops the guard, and its value, on a forced write', () => {
    const { sql, values } = postgresGuardedUpdate(
      makeRequest({ force: true })
    ).write;

    expect(sql).toBe(
      'UPDATE "app"."orders" SET "label" = :newValue WHERE "id" = :primaryKey0 ' +
        'RETURNING "label" AS value'
    );
    expect(values).toEqual({ newValue: 'new label', primaryKey0: 42 });
  });

  // `json` has no `=` at all; `jsonb` compares values, whatever the key order
  it('compares a JSON column as jsonb on both sides, written with CAST', () => {
    const { sql } = postgresGuardedUpdate(
      makeRequest({ isJsonColumn: true })
    ).write;

    expect(sql).toContain(
      'CAST("label" AS jsonb) IS NOT DISTINCT FROM CAST(:originalValue AS jsonb)'
    );
    expect(sql).toContain('SET "label" = :newValue');
  });
});

describe('the read-back', () => {
  it('reads the cell by its primary key alone', () => {
    const { sql, values } = postgresGuardedUpdate(makeRequest()).readBack;

    expect(sql).toBe(
      'SELECT "label" AS value FROM "app"."orders" WHERE "id" = :primaryKey0'
    );
    expect(values).toEqual({ primaryKey0: 42 });
  });
});

/**
 * What each answer comes to, on hand-written answers.
 * PostgreSQL decides on the row `RETURNING` hands back, where MySQL has to
 * read the cell again to tell an unchanged value from a guard that failed.
 */
describe('the outcome', () => {
  const guarded = postgresGuardedUpdate(makeRequest());

  it('is settled by the write when it returned the row', () => {
    expect(guarded.outcomeOfWrite([{ value: 'stored' }])).toEqual({
      status: UpdateCellStatus.Updated,
      value: 'stored',
    });
  });

  it('is left to the read-back when the write matched nothing', () => {
    expect(guarded.outcomeOfWrite([])).toBeUndefined();
  });

  it('is a conflict naming what the cell holds when the row is still there', () => {
    const read = guarded.readBack.answer([{ value: 'theirs' }]);

    expect(guarded.outcomeOfReadBack([], read)).toEqual({
      status: UpdateCellStatus.Conflict,
      reason: ConflictReason.Changed,
      currentValue: 'theirs',
    });
  });

  it('is a deleted row when the read-back finds none', () => {
    const read = guarded.readBack.answer([]);

    expect(guarded.outcomeOfReadBack([], read)).toEqual({
      status: UpdateCellStatus.Conflict,
      reason: ConflictReason.Deleted,
    });
  });

  it('refuses a write that answered no rows at all', () => {
    expect(() =>
      guarded.outcomeOfWrite({ affectedRows: 1, insertId: null })
    ).toThrow();
  });
});
