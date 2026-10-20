import { describe, expect, test } from 'vitest';
import { FieldKind, type ResultField } from '../../../sql/resultField';
import type { ResultRow } from '../../../sql/types';
import {
  filterRowPanelFields,
  rowKeyText,
  rowPanelFields,
} from './rowPanelFields';

const field = (name: string, kind: FieldKind): ResultField => ({
  name,
  kind,
  table: 'article',
});

const FIELDS: Array<ResultField> = [
  field('title', FieldKind.String),
  field('id', FieldKind.Number),
  field('deleted_at', FieldKind.DateTime),
  field('meta', FieldKind.Json),
];

const ROW = {
  title: 'Tramway',
  id: 12,
  deleted_at: null,
  meta: '{"a":1}',
};

describe('rowPanelFields', () => {
  test('leads with the key, and keeps each field at its position in the result', () => {
    expect(
      rowPanelFields(ROW, FIELDS, ['id'], false).map(
        ({ field, fieldIndex }) => [field.name, fieldIndex]
      )
    ).toEqual([
      ['id', 1],
      ['title', 0],
      ['deleted_at', 2],
      ['meta', 3],
    ]);
  });

  test('reads a row of an array by position, homonyms included', () => {
    const fields = [
      field('id', FieldKind.Number),
      field('id', FieldKind.Number),
    ];
    const row = [1, 2] as unknown as ResultRow;

    expect(
      rowPanelFields(row, fields, undefined, true).map(({ value }) => value)
    ).toEqual([1, 2]);
  });

  test('gives the text the detail modal shows', () => {
    expect(
      rowPanelFields(ROW, FIELDS, undefined, false).map(({ text }) => text)
    ).toEqual(['Tramway', '12', '', '{\n  "a": 1\n}']);
  });
});

describe('filterRowPanelFields', () => {
  const all = rowPanelFields(ROW, FIELDS, undefined, false);
  const names = (query: string, hideNull = false) =>
    filterRowPanelFields(all, query, hideNull).map(({ field }) => field.name);

  test('keeps the fields whose name holds the query, whatever the case', () => {
    expect(names(' DEL ')).toEqual(['deleted_at']);
  });

  test('keeps the fields whose value holds the query', () => {
    expect(names('tram')).toEqual(['title']);
  });

  test('leaves the NULL fields out on demand', () => {
    expect(names('', true)).toEqual(['title', 'id', 'meta']);
    expect(names('')).toEqual(['title', 'id', 'deleted_at', 'meta']);
  });
});

describe('rowKeyText', () => {
  test('names a row by its key', () => {
    expect(rowKeyText({ a: 1, b: 'x' }, ['a', 'b'])).toBe('a = 1, b = x');
  });

  test('names nothing without a key', () => {
    expect(rowKeyText(ROW, [])).toBeNull();
    expect(rowKeyText(ROW, undefined)).toBeNull();
  });
});
