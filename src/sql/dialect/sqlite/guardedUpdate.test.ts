import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import {
  ConflictReason,
  type UpdateCellRequest,
  UpdateCellStatus,
} from '../../updateCell';
import { sqliteGuardedUpdate } from './guardedUpdate';

function makeRequest(
  overrides: Partial<UpdateCellRequest> = {}
): UpdateCellRequest {
  return {
    database: 'main',
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
    const { sql, values } = sqliteGuardedUpdate(makeRequest()).write;

    expect(sql).toBe(
      'UPDATE "main"."orders" SET "label" = :newValue ' +
        'WHERE "id" = :primaryKey0 AND "label" IS :originalValue ' +
        'RETURNING "label" AS value'
    );
    expect(values).toEqual({
      newValue: 'new label',
      primaryKey0: 42,
      originalValue: 'old label',
    });
  });

  it('drops the guard, and its value, on a forced write', () => {
    const { sql, values } = sqliteGuardedUpdate(
      makeRequest({ force: true })
    ).write;

    expect(sql).toBe(
      'UPDATE "main"."orders" SET "label" = :newValue WHERE "id" = :primaryKey0 ' +
        'RETURNING "label" AS value'
    );
    expect(values).toEqual({ newValue: 'new label', primaryKey0: 42 });
  });
});

describe('the read-back', () => {
  it('reads the cell by its primary key alone', () => {
    const { sql, values } = sqliteGuardedUpdate(makeRequest()).readBack;

    expect(sql).toBe(
      'SELECT "label" AS value FROM "main"."orders" WHERE "id" = :primaryKey0'
    );
    expect(values).toEqual({ primaryKey0: 42 });
  });
});

/** What each answer comes to, on hand-written answers. */
describe('the outcome', () => {
  const guarded = sqliteGuardedUpdate(makeRequest());

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

/** The write as SQLite runs it, where the guard meets the column's affinity. */
describe('on a real database', () => {
  function write(database: DatabaseSync, request: UpdateCellRequest) {
    const { sql, values } = sqliteGuardedUpdate(request).write;

    return database.prepare(sql).all(values);
  }

  function withRow(): DatabaseSync {
    const database = new DatabaseSync(':memory:');

    database.exec(
      'CREATE TABLE orders (id INTEGER PRIMARY KEY, label TEXT, price NUMERIC); INSERT INTO orders VALUES (42, NULL, 1.5)'
    );

    return database;
  }

  it('writes over a NULL the grid showed', () => {
    expect(write(withRow(), makeRequest({ originalValue: null }))).toEqual([
      { value: 'new label' },
    ]);
  });

  it('writes nothing over a value the grid did not show', () => {
    expect(
      write(withRow(), makeRequest({ originalValue: 'old label' }))
    ).toEqual([]);
  });

  // the new value travels as text, and the column stores it as a number
  it('stores a number typed in a numeric column as a number', () => {
    expect(
      write(
        withRow(),
        makeRequest({ column: 'price', newValue: '2.25', originalValue: 1.5 })
      )
    ).toEqual([{ value: 2.25 }]);
  });
});
