import { describe, expect, it } from 'vitest';
import type { ColumnDetail } from '../../../sql/dialect/metadata';
import { mysqlDialect } from '../../../sql/dialect/mysql';
import { postgresDialect } from '../../../sql/dialect/postgres';
import { FieldKind } from '../../../sql/resultField';
import type { ColumnMeta } from '../TableGrid';
import { type RowCell, rowToCsv, rowToInsert, rowToJson } from './rowFormats';

function detail(name: string, overrides: Partial<ColumnDetail> = {}) {
  return {
    table: 'items',
    name,
    nullable: true,
    generated: false,
    binary: false,
    json: false,
    allowedValues: [],
    multiValued: false,
    ...overrides,
  };
}

function cell(
  name: string,
  kind: FieldKind,
  value: unknown,
  overrides: Partial<ColumnMeta> = {}
): RowCell {
  return {
    column: {
      id: name,
      fieldIndex: 0,
      name,
      tableName: 'items',
      kind,
      width: '',
      pinnedLeft: null,
      isLastPinned: false,
      numeric: kind === FieldKind.Number,
      hasForeignKey: false,
      dialect: mysqlDialect,
      detail: detail(name),
      ...overrides,
    },
    value,
  };
}

// a local wall clock, as the driver builds a `DATETIME`
const CREATED_AT = new Date(2026, 8, 25, 14, 3, 7);

const ROW: RowCell[] = [
  cell('id', FieldKind.Number, 42),
  cell('name', FieldKind.String, 'Le "bon", coin'),
  cell('note', FieldKind.String, null),
  cell('createdAt', FieldKind.DateTime, CREATED_AT),
  cell('payload', FieldKind.Json, { tags: ['a', 'b'] }),
  cell('hash', FieldKind.Binary, new Uint8Array([0xca, 0xfe])),
];

describe('rowToJson', () => {
  it('keeps the JSON types, and writes what JSON has none for as the grid does', () => {
    expect(JSON.parse(rowToJson(ROW))).toEqual({
      id: 42,
      name: 'Le "bon", coin',
      note: null,
      createdAt: '2026-09-25 14:03:07',
      payload: { tags: ['a', 'b'] },
      hash: '0xCAFE',
    });
  });

  it('writes a bigint as text rather than throwing', () => {
    expect(
      JSON.parse(rowToJson([cell('id', FieldKind.Number, 2n ** 64n)]))
    ).toEqual({ id: '18446744073709551616' });
  });
});

describe('rowToCsv', () => {
  it('writes the column names, then the values, quoting only what must be', () => {
    expect(rowToCsv(ROW)).toBe(
      'id,name,note,createdAt,payload,hash\n' +
        '42,"Le ""bon"", coin",,2026-09-25 14:03:07,"{""tags"":[""a"",""b""]}",0xCAFE'
    );
  });

  it('tells an empty string from NULL', () => {
    expect(
      rowToCsv([
        cell('a', FieldKind.String, ''),
        cell('b', FieldKind.String, null),
      ])
    ).toBe('a,b\n,');
  });

  it('quotes a value holding a line break', () => {
    expect(rowToCsv([cell('a', FieldKind.String, 'x\ny')])).toBe('a\n"x\ny"');
  });
});

describe('rowToInsert', () => {
  it('writes the row back into its table, on MySQL', () => {
    expect(rowToInsert(mysqlDialect, 'shop', ROW)).toBe(
      'INSERT INTO `shop`.`items` (`id`, `name`, `note`, `createdAt`, `payload`, `hash`) ' +
        `VALUES (42, 'Le \\"bon\\", coin', NULL, '2026-09-25 14:03:07', '{\\"tags\\":[\\"a\\",\\"b\\"]}', X'CAFE');`
    );
  });

  it('writes the row back into its table, on PostgreSQL', () => {
    expect(rowToInsert(postgresDialect, 'public', ROW)).toBe(
      'INSERT INTO "public"."items" ("id", "name", "note", "createdAt", "payload", "hash") ' +
        `VALUES (42, 'Le "bon", coin', NULL, '2026-09-25 14:03:07', '{"tags":["a","b"]}', decode('CAFE', 'hex'));`
    );
  });

  it('leaves out a column the server computes', () => {
    expect(
      rowToInsert(mysqlDialect, 'shop', [
        cell('id', FieldKind.Number, 1),
        cell('total', FieldKind.Number, 3, {
          detail: detail('total', { generated: true }),
        }),
      ])
    ).toBe('INSERT INTO `shop`.`items` (`id`) VALUES (1);');
  });

  it('offers nothing for a column no table of the schema holds', () => {
    expect(
      rowToInsert(mysqlDialect, 'shop', [
        cell('id', FieldKind.Number, 1),
        cell('count', FieldKind.Number, 3, { detail: undefined }),
      ])
    ).toBeUndefined();
  });

  it('offers nothing for a join of two tables', () => {
    expect(
      rowToInsert(mysqlDialect, 'shop', [
        cell('id', FieldKind.Number, 1),
        cell('label', FieldKind.String, 'x', { tableName: 'categories' }),
      ])
    ).toBeUndefined();
  });

  it('offers nothing for a column named twice', () => {
    expect(
      rowToInsert(mysqlDialect, 'shop', [
        cell('id', FieldKind.Number, 1),
        cell('id', FieldKind.Number, 1),
      ])
    ).toBeUndefined();
  });

  it('offers nothing without a database to qualify the table with', () => {
    expect(rowToInsert(mysqlDialect, null, ROW)).toBeUndefined();
  });
});
