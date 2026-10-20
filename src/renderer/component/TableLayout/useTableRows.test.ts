import { describe, expect, test } from 'vitest';
import { FieldKind } from '../../../sql/resultField';
import type { TableRowsPage } from './tableRowsQuery';
import { testables } from './useTableRows';

const { patchRow } = testables;

const FIELDS = [{ name: 'id', kind: FieldKind.Number, table: null }];

describe('patchRow', () => {
  test('counts the row across the pages loaded, and leaves the other pages as they were', () => {
    const firstPage: TableRowsPage = [[{ id: 1 }, { id: 2 }], FIELDS];
    const secondPage: TableRowsPage = [[{ id: 3 }, { id: 4 }], FIELDS];
    const data = {
      pages: [firstPage, secondPage],
      pageParams: [0, 2],
    };

    const patched = patchRow(data, 3, 'id', 40);

    expect(patched.pages.map(([rows]) => rows)).toEqual([
      [{ id: 1 }, { id: 2 }],
      [{ id: 3 }, { id: 40 }],
    ]);
    expect(patched.pages[0]).toBe(firstPage);
    expect(patched.pageParams).toEqual([0, 2]);
  });
});
