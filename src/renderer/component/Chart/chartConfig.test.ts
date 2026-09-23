import { describe, expect, test } from 'vitest';
import { FieldKind, type ResultField } from '../../../sql/resultField';
import {
  ChartUnavailableReason,
  chartUnavailableReason,
  defaultChartConfig,
  numericFieldIndexes,
} from './chartConfig';

function field(name: string, kind: FieldKind): ResultField {
  return { name, kind, table: null };
}

const DAY = field('day', FieldKind.Date);
const COUNT = field('total', FieldKind.Number);
const PRICE = field('price', FieldKind.Number);
const NAME = field('name', FieldKind.String);
// `Cell.tsx` throws on these; here they are simply never offered
const DURATION = field('duration', FieldKind.Time);

describe('numericFieldIndexes', () => {
  test('keeps the numeric columns, in field order', () => {
    expect(numericFieldIndexes([DAY, COUNT, NAME, PRICE])).toEqual([1, 3]);
  });

  test('ignores the types the app does not render', () => {
    expect(numericFieldIndexes([DURATION, COUNT])).toEqual([1]);
  });

  test('a column of any other kind is not numeric', () => {
    expect(numericFieldIndexes([field('x', FieldKind.Unknown)])).toEqual([]);
  });
});

describe('defaultChartConfig', () => {
  test('plots the numeric columns against the first other one', () => {
    expect(defaultChartConfig([DAY, COUNT, PRICE])).toEqual({
      kind: 'line',
      x: 0,
      y: [1, 2],
    });
  });

  test('when every column is numeric, the first one carries the X axis', () => {
    expect(defaultChartConfig([COUNT, PRICE])).toEqual({
      kind: 'line',
      x: 0,
      y: [1],
    });
  });

  test('a single numeric column has nothing to plot against', () => {
    expect(defaultChartConfig([NAME, COUNT])).toEqual({
      kind: 'line',
      x: 0,
      y: [1],
    });
    expect(defaultChartConfig([COUNT])).toBeNull();
  });

  test('no numeric column at all', () => {
    expect(defaultChartConfig([NAME, DAY])).toBeNull();
  });
});

describe('chartUnavailableReason', () => {
  const usable = {
    isTabular: true,
    hasLimit: false,
    rowCount: 12,
    fields: [DAY, COUNT],
  };

  test('a chartable result has no reason', () => {
    expect(chartUnavailableReason(usable)).toBeNull();
  });

  test.each([
    [{ isTabular: false }, ChartUnavailableReason.NotTabular],
    [{ hasLimit: true }, ChartUnavailableReason.HasLimit],
    [{ rowCount: 0 }, ChartUnavailableReason.NoRow],
    [{ fields: [NAME, DAY] }, ChartUnavailableReason.NoNumericColumn],
  ])('%o -> %s', (override, expected) => {
    expect(chartUnavailableReason({ ...usable, ...override })).toBe(expected);
  });

  test('an INSERT result reports its shape before anything else', () => {
    expect(
      chartUnavailableReason({
        isTabular: false,
        hasLimit: true,
        rowCount: 0,
        fields: [],
      })
    ).toBe(ChartUnavailableReason.NotTabular);
  });
});
