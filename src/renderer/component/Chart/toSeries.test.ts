import { Types } from 'mysql';
import type { FieldPacket, RowDataPacket } from 'mysql2/promise';
import { describe, expect, test } from 'vitest';
import type { ChartConfig } from './chartConfig';
import {
  MAX_POINTS,
  toAxisLabel,
  toBarData,
  toLineSeries,
  toNumber,
} from './toSeries';

function field(name: string, type: number): FieldPacket {
  return { name, type } as FieldPacket;
}

const FIELDS = [
  field('day', Types.DATE),
  field('total', Types.LONGLONG),
  field('revenue', Types.NEWDECIMAL),
];

const CONFIG: ChartConfig = { kind: 'line', x: 0, y: [1, 2] };

// what the raw SQL page gets: `rowsAsArray`, so rows are arrays
const ROWS = [
  [new Date(2026, 0, 1), 3, '10.50'],
  [new Date(2026, 0, 2), 5, '20.25'],
] as unknown as RowDataPacket[];

describe('toNumber', () => {
  test.each([
    [12, 12],
    [0, 0],
    [-3.5, -3.5],
    // DECIMAL and NEWDECIMAL come back as strings with mysql2's defaults
    ['10.50', 10.5],
    ['0', 0],
    [10n, 10],
  ])('%o -> %o', (value, expected) => {
    expect(toNumber(value)).toBe(expected);
  });

  test.each([[null], [undefined], [''], ['   '], ['abc'], [NaN], [Infinity]])(
    '%o has no numeric value',
    (value) => {
      expect(toNumber(value)).toBeNull();
    }
  );
});

describe('toAxisLabel', () => {
  test('a DATE column drops the time part', () => {
    expect(toAxisLabel(new Date(2026, 0, 2, 15, 4, 5), true)).toBe('2026-01-02');
  });

  test('any other temporal column keeps it', () => {
    expect(toAxisLabel(new Date(2026, 0, 2, 15, 4, 5), false)).toBe(
      '2026-01-02 15:04:05'
    );
  });

  test('a NULL label is empty, never the string "null"', () => {
    expect(toAxisLabel(null, false)).toBe('');
  });
});

describe('toLineSeries', () => {
  test('one series per plotted column, DECIMAL coerced', () => {
    const { series, isTruncated } = toLineSeries({
      rows: ROWS,
      fields: FIELDS,
      config: CONFIG,
      rowsAsArray: true,
    });

    expect(isTruncated).toBe(false);
    expect(series).toEqual([
      {
        id: 'total',
        data: [
          { x: '2026-01-01', y: 3 },
          { x: '2026-01-02', y: 5 },
        ],
      },
      {
        id: 'revenue',
        data: [
          { x: '2026-01-01', y: 10.5 },
          { x: '2026-01-02', y: 20.25 },
        ],
      },
    ]);
  });

  test('reads rows by column name when they are objects', () => {
    const rows = [
      { day: new Date(2026, 0, 1), total: 3, revenue: '10.50' },
    ] as unknown as RowDataPacket[];

    const { series } = toLineSeries({
      rows,
      fields: FIELDS,
      config: CONFIG,
      rowsAsArray: false,
    });

    expect(series[0].data).toEqual([{ x: '2026-01-01', y: 3 }]);
  });

  test('a NULL is a hole in the series, not a zero', () => {
    const rows = [
      [new Date(2026, 0, 1), 3, null],
      [new Date(2026, 0, 2), null, '1'],
    ] as unknown as RowDataPacket[];

    const { series } = toLineSeries({
      rows,
      fields: FIELDS,
      config: CONFIG,
      rowsAsArray: true,
    });

    expect(series[0].data).toEqual([{ x: '2026-01-01', y: 3 }]);
    expect(series[1].data).toEqual([{ x: '2026-01-02', y: 1 }]);
  });

  test('reports a truncation rather than hiding it', () => {
    const rows = Array.from({ length: MAX_POINTS + 10 }, (_, index) => [
      new Date(2026, 0, 1),
      index,
      '1',
    ]) as unknown as RowDataPacket[];

    const { series, isTruncated } = toLineSeries({
      rows,
      fields: FIELDS,
      config: CONFIG,
      rowsAsArray: true,
    });

    expect(isTruncated).toBe(true);
    expect(series[0].data).toHaveLength(MAX_POINTS);
  });
});

describe('toBarData', () => {
  test('flat rows keyed by column name', () => {
    expect(
      toBarData({
        rows: ROWS,
        fields: FIELDS,
        config: { ...CONFIG, kind: 'bar' },
        rowsAsArray: true,
      })
    ).toEqual({
      indexBy: 'day',
      keys: ['total', 'revenue'],
      isTruncated: false,
      data: [
        { day: '2026-01-01', total: 3, revenue: 10.5 },
        { day: '2026-01-02', total: 5, revenue: 20.25 },
      ],
    });
  });

  test('a NULL leaves the key out rather than writing a zero', () => {
    const rows = [
      [new Date(2026, 0, 1), null, '1'],
    ] as unknown as RowDataPacket[];

    const { data } = toBarData({
      rows,
      fields: FIELDS,
      config: { ...CONFIG, kind: 'bar' },
      rowsAsArray: true,
    });

    expect(data).toEqual([{ day: '2026-01-01', revenue: 1 }]);
  });
});
