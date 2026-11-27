import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { sqliteDialect } from '.';

/** What SQLite reads a literal as, asked of the one Node bundles. */
function read(literal: string): unknown {
  const database = new DatabaseSync(':memory:');

  return database.prepare(`SELECT ${literal} AS value`).get()?.value;
}

describe('sqliteDialect', () => {
  it('names a table by its database, each part quoted on its own', () => {
    expect(sqliteDialect.qualify('main', 'orders')).toBe('"main"."orders"');
  });

  it('has no statement to switch database', () => {
    expect(sqliteDialect.useDatabase).toBeUndefined();
  });

  it('writes a boolean as the integer a BOOLEAN column holds', () => {
    expect(sqliteDialect.booleanLiteral(true)).toBe('1');
    expect(sqliteDialect.booleanLiteral(false)).toBe('0');
  });

  it('reads a text back as it was, quote and backslash included', () => {
    expect(read(sqliteDialect.escapeLiteral("l'a\\b"))).toBe("l'a\\b");
  });

  it('reads bytes back as they were, an empty value included', () => {
    expect(
      read(sqliteDialect.bytesLiteral(new Uint8Array([0xca, 0x00])))
    ).toEqual(new Uint8Array([0xca, 0x00]));
    expect(read(sqliteDialect.bytesLiteral(new Uint8Array()))).toEqual(
      new Uint8Array()
    );
  });

  it('deletes each row by its key, with no bound SQLite could read', () => {
    const { sql, values } = sqliteDialect.deleteRows({
      database: 'main',
      table: 'orders',
      rows: [[{ column: 'id', value: 4 }], [{ column: 'id', value: '7' }]],
    });

    expect(sql).toBe(
      'DELETE FROM "main"."orders" WHERE ("id" = :row0Key0) OR ("id" = :row1Key0)'
    );
    expect(values).toEqual({ row0Key0: 4, row1Key0: '7' });
  });

  it('reads one row by every column of its key', () => {
    const { sql, values } = sqliteDialect.selectRow({
      database: 'main',
      table: 'shipments',
      key: [
        { column: 'order_id', value: '1' },
        { column: 'line_no', value: 2 },
      ],
    });

    expect(sql).toBe(
      'SELECT * FROM "main"."shipments" WHERE "order_id" = :key0 AND "line_no" = :key1 LIMIT 1'
    );
    expect(values).toEqual({ key0: '1', key1: 2 });
  });

  it('reads the key and the start of the label as text, whatever its type', () => {
    const { sql, values } = sqliteDialect.selectLabels({
      database: 'main',
      table: 'shipments',
      keyColumn: 'id',
      labelColumn: 'shipped_at',
      keys: [3, 7],
    });

    expect(sql).toBe(
      'SELECT "id", substr(CAST("shipped_at" AS TEXT), 1, 100) FROM "main"."shipments" ' +
        'WHERE "id" IN (:key0, :key1)'
    );
    expect(values).toEqual({ key0: 3, key1: 7 });
  });

  it('asks the label column alone, for no row', () => {
    expect(
      sqliteDialect.selectLabelColumn({
        database: 'main',
        table: 'shipments',
        labelColumn: 'shipped_at',
      })
    ).toEqual({
      sql: 'SELECT "shipped_at" FROM "main"."shipments" LIMIT 0',
      values: {},
    });
  });
});
