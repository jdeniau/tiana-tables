import { describe, expect, test } from 'vitest';
import { buildTableTabs, pruneOpenTables, tableAfterClose } from './tableTabs';

describe('buildTableTabs', () => {
  test('lists the memorised tables in their order', () => {
    expect(buildTableTabs(['users', 'orders'], undefined)).toEqual([
      { name: 'users', preview: false },
      { name: 'orders', preview: false },
    ]);
  });

  test('puts the temporary table last', () => {
    expect(buildTableTabs(['users'], 'orders')).toEqual([
      { name: 'users', preview: false },
      { name: 'orders', preview: true },
    ]);
  });

  test('does not double a table that is both memorised and the preview', () => {
    expect(buildTableTabs(['users', 'orders'], 'users')).toEqual([
      { name: 'users', preview: false },
      { name: 'orders', preview: false },
    ]);
  });
});

describe('tableAfterClose', () => {
  const tabs = buildTableTabs(['users', 'orders'], 'items');

  test('opens the tab before the closed one', () => {
    expect(tableAfterClose(tabs, 'orders')).toBe('users');
    expect(tableAfterClose(tabs, 'items')).toBe('orders');
  });

  test('opens the one after it when the first tab is closed', () => {
    expect(tableAfterClose(tabs, 'users')).toBe('orders');
  });

  test('opens nothing when the last remaining tab is closed', () => {
    expect(tableAfterClose(buildTableTabs(['users'], undefined), 'users')).toBe(
      undefined
    );
  });

  test('opens nothing for a tab that is not in the strip', () => {
    expect(tableAfterClose(tabs, 'unknown')).toBe(undefined);
  });
});

describe('pruneOpenTables', () => {
  test('drops the tables the database no longer has', () => {
    expect(
      pruneOpenTables(['users', 'dropped', 'orders'], ['users', 'orders'])
    ).toEqual(['users', 'orders']);
  });
});
