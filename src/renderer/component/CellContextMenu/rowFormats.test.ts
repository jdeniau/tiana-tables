import { describe, expect, it } from 'vitest';
import type { ColumnDetail } from '../../../sql/dialect/metadata';
import { mysqlDialect } from '../../../sql/dialect/mysql';
import { postgresDialect } from '../../../sql/dialect/postgres';
import { FieldKind } from '../../../sql/resultField';
import type { ColumnMeta } from '../TableGrid';
import {
  type RowCell,
  rowsToCsv,
  rowsToHtmlTable,
  rowsToInsert,
  rowsToJson,
  rowsToMarkdown,
  rowsToTsv,
} from './rowFormats';

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

// a `DATETIME`, a wall clock: the INSERT writes it back as is
const CREATED_AT = '2026-09-25 12:03:07';

// JSON and CSV take the wall clock in the server's zone, here UTC+12:00
const SERVER_ZONE = 'Pacific/Auckland';

const ROW: RowCell[] = [
  cell('id', FieldKind.Number, 42),
  cell('name', FieldKind.String, 'Le "bon", coin'),
  cell('note', FieldKind.String, null),
  cell('createdAt', FieldKind.DateTime, CREATED_AT),
  cell('payload', FieldKind.Json, { tags: ['a', 'b'] }),
  cell('hash', FieldKind.Binary, new Uint8Array([0xca, 0xfe])),
];

describe('rowsToJson, on one row: the object alone', () => {
  it('keeps the JSON types, and writes what JSON has none for as text', () => {
    expect(JSON.parse(rowsToJson([ROW], SERVER_ZONE))).toEqual({
      id: 42,
      name: 'Le "bon", coin',
      note: null,
      createdAt: '2026-09-25T00:03:07Z',
      payload: { tags: ['a', 'b'] },
      hash: '0xCAFE',
    });
  });

  // midnight local time is the evening before in UTC: a day has no time to shift
  it('writes a DATE as its calendar day', () => {
    expect(
      JSON.parse(
        rowsToJson(
          [[cell('birthday', FieldKind.Date, '2026-09-25')]],
          SERVER_ZONE
        )
      )
    ).toEqual({ birthday: '2026-09-25' });
  });

  // a zone the server gives no rules for leaves no instant to write
  it("writes a wall clock as is when the server's zone is unknown", () => {
    expect(
      JSON.parse(
        rowsToJson([[cell('createdAt', FieldKind.DateTime, CREATED_AT)]], null)
      )
    ).toEqual({ createdAt: '2026-09-25T12:03:07' });
  });

  it('writes a bigint as text rather than throwing', () => {
    expect(
      JSON.parse(
        rowsToJson([[cell('id', FieldKind.Number, 2n ** 64n)]], SERVER_ZONE)
      )
    ).toEqual({ id: '18446744073709551616' });
  });
});

describe('rowsToCsv', () => {
  it('writes the column names, then the values, quoting only what must be', () => {
    expect(rowsToCsv([ROW], SERVER_ZONE, true)).toBe(
      'id,name,note,createdAt,payload,hash\n' +
        '42,"Le ""bon"", coin",,2026-09-25T00:03:07Z,"{""tags"":[""a"",""b""]}",0xCAFE'
    );
  });

  it('tells an empty string from NULL', () => {
    expect(
      rowsToCsv(
        [[cell('a', FieldKind.String, ''), cell('b', FieldKind.String, null)]],
        SERVER_ZONE,
        true
      )
    ).toBe('a,b\n,');
  });

  it('quotes a value holding a line break', () => {
    expect(
      rowsToCsv([[cell('a', FieldKind.String, 'x\ny')]], SERVER_ZONE, true)
    ).toBe('a\n"x\ny"');
  });
});

describe('rowsToInsert', () => {
  it('writes the row back into its table, on MySQL', () => {
    expect(rowsToInsert(mysqlDialect, 'shop', [ROW])).toBe(
      'INSERT INTO `shop`.`items` (`id`, `name`, `note`, `createdAt`, `payload`, `hash`) ' +
        `VALUES (42, 'Le \\"bon\\", coin', NULL, '2026-09-25 12:03:07', '{\\"tags\\":[\\"a\\",\\"b\\"]}', X'CAFE');`
    );
  });

  it('writes the row back into its table, on PostgreSQL', () => {
    expect(rowsToInsert(postgresDialect, 'public', [ROW])).toBe(
      'INSERT INTO "public"."items" ("id", "name", "note", "createdAt", "payload", "hash") ' +
        `VALUES (42, 'Le "bon", coin', NULL, '2026-09-25 12:03:07', '{"tags":["a","b"]}', decode('CAFE', 'hex'));`
    );
  });

  it('leaves out a column the server computes', () => {
    expect(
      rowsToInsert(mysqlDialect, 'shop', [
        [
          cell('id', FieldKind.Number, 1),
          cell('total', FieldKind.Number, 3, {
            detail: detail('total', { generated: true }),
          }),
        ],
      ])
    ).toBe('INSERT INTO `shop`.`items` (`id`) VALUES (1);');
  });

  it('offers nothing for a column no table of the schema holds', () => {
    expect(
      rowsToInsert(mysqlDialect, 'shop', [
        [
          cell('id', FieldKind.Number, 1),
          cell('count', FieldKind.Number, 3, { detail: undefined }),
        ],
      ])
    ).toBeUndefined();
  });

  it('offers nothing for a join of two tables', () => {
    expect(
      rowsToInsert(mysqlDialect, 'shop', [
        [
          cell('id', FieldKind.Number, 1),
          cell('label', FieldKind.String, 'x', { tableName: 'categories' }),
        ],
      ])
    ).toBeUndefined();
  });

  it('offers nothing for a column named twice', () => {
    expect(
      rowsToInsert(mysqlDialect, 'shop', [
        [cell('id', FieldKind.Number, 1), cell('id', FieldKind.Number, 1)],
      ])
    ).toBeUndefined();
  });

  it('offers nothing without a database to qualify the table with', () => {
    expect(rowsToInsert(mysqlDialect, null, [ROW])).toBeUndefined();
  });
});

describe('the selected rows', () => {
  // the grid shows the server's wall clock in UTC
  const SHOWN = {
    shift: { from: SERVER_ZONE, to: 'UTC' },
    serverZone: SERVER_ZONE,
  };

  const ROWS: RowCell[][] = [
    [
      cell('id', FieldKind.Number, 1),
      cell('label', FieldKind.String, 'a\tb | c\nd <e> & f'),
      cell('createdAt', FieldKind.DateTime, CREATED_AT),
      cell('note', FieldKind.String, null),
    ],
    [
      cell('id', FieldKind.Number, 2),
      cell('label', FieldKind.String, ''),
      cell('createdAt', FieldKind.DateTime, null),
      cell('note', FieldKind.Binary, new Uint8Array([0xca, 0xfe])),
    ],
  ];

  it('as TSV: a line per row, the date as shown, a tab or a line break a space, NULL empty', () => {
    expect(rowsToTsv(ROWS, SHOWN, true)).toBe(
      'id\tlabel\tcreatedAt\tnote\n' +
        '1\ta b | c d <e> & f\t2026-09-25 00:03:07+00:00\t\n' +
        '2\t\t\t0xCAFE'
    );
  });

  it('as TSV or CSV without the column names', () => {
    expect(rowsToTsv(ROWS, SHOWN, false)).toBe(
      '1\ta b | c d <e> & f\t2026-09-25 00:03:07+00:00\t\n2\t\t\t0xCAFE'
    );
    expect(rowsToCsv(ROWS, SERVER_ZONE, false)).toBe(
      '1,"a\tb | c\nd <e> & f",2026-09-25T00:03:07Z,\n2,,,0xCAFE'
    );
  });

  it('as an HTML table: the TSV values, escaped', () => {
    expect(rowsToHtmlTable(ROWS, SHOWN, true)).toBe(
      '<table><thead><tr><th>id</th><th>label</th><th>createdAt</th><th>note</th></tr></thead><tbody>' +
        '<tr><td>1</td><td>a\tb | c\nd &lt;e&gt; &amp; f</td><td>2026-09-25 00:03:07+00:00</td><td></td></tr>' +
        '<tr><td>2</td><td></td><td></td><td>0xCAFE</td></tr>' +
        '</tbody></table>'
    );
    expect(rowsToHtmlTable(ROWS, SHOWN, false)).not.toContain('<thead>');
  });

  it('as Markdown: always headed, numbers flush right, NULL written, a pipe escaped', () => {
    expect(rowsToMarkdown(ROWS, SHOWN)).toBe(
      '| id | label | createdAt | note |\n' +
        '| ---: | --- | --- | --- |\n' +
        '| 1 | a\tb \\| c d <e> & f | 2026-09-25 00:03:07+00:00 | NULL |\n' +
        '| 2 |  | NULL | 0xCAFE |'
    );
  });

  it('as JSON: an array of the objects of a row', () => {
    expect(JSON.parse(rowsToJson(ROWS, SERVER_ZONE))).toEqual([
      {
        id: 1,
        label: 'a\tb | c\nd <e> & f',
        createdAt: '2026-09-25T00:03:07Z',
        note: null,
      },
      { id: 2, label: '', createdAt: null, note: '0xCAFE' },
    ]);
  });

  it('as one INSERT with a line of values per row', () => {
    expect(
      rowsToInsert(mysqlDialect, 'shop', [
        [cell('id', FieldKind.Number, 1), cell('name', FieldKind.String, 'a')],
        [cell('id', FieldKind.Number, 2), cell('name', FieldKind.String, null)],
      ])
    ).toBe(
      'INSERT INTO `shop`.`items` (`id`, `name`) VALUES\n' +
        "  (1, 'a'),\n" +
        '  (2, NULL);'
    );
  });
});
