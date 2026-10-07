/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { afterEach, describe, expect, test } from 'vitest';
import { DEFAULT_THEME } from '../../configuration/themes';
import { ConnectionContext } from '../../contexts/ConnectionContext';
import { DatabaseContext } from '../../contexts/DatabaseContext';
import { ForeignKeysContextProvider } from '../../contexts/ForeignKeysContext';
import type { ForeignKey } from '../../sql/dialect/metadata';
import { mysqlDialect } from '../../sql/dialect/mysql';
import ForeignKeyLink from './ForeignKeyLink';

const FOREIGN_KEYS: ForeignKey[] = [
  {
    table: 'orders',
    column: 'customer_label',
    referencedDatabase: 'db',
    referencedTable: 'customers',
    referencedColumn: 'label',
  },
];

let container: HTMLElement;
let unmount: () => void;

afterEach(() => {
  act(() => unmount());
  container.remove();
});

/** where the link would navigate to */
function renderLink(
  value: unknown,
  foreignKeys: ForeignKey[] = FOREIGN_KEYS
): URL | null {
  container = document.createElement('div');
  document.body.append(container);

  const root = createRoot(container);
  unmount = () => root.unmount();

  act(() => {
    root.render(
      <ThemeProvider theme={DEFAULT_THEME}>
        <MemoryRouter>
          <ConnectionContext
            value={{
              currentConnectionSlug: 'shop',
              connectionSlugList: ['shop'],
              addConnectionToList: () => {},
              closeConnection: () => {},
            }}
          >
            <DatabaseContext value={{ database: 'db', setDatabase: () => {} }}>
              <ForeignKeysContextProvider
                foreignKeys={foreignKeys}
                database="db"
              >
                <ForeignKeyLink
                  dialect={mysqlDialect}
                  tableName="orders"
                  columnName="customer_label"
                  value={value}
                />
              </ForeignKeysContextProvider>
            </DatabaseContext>
          </ConnectionContext>
        </MemoryRouter>
      </ThemeProvider>
    );
  });

  const link = container.querySelector('a');

  if (!link) {
    return null;
  }

  return new URL(link.href, 'http://localhost');
}

/** the `?where=` the link would navigate to, decoded */
function renderWhere(value: unknown): string | null {
  return renderLink(value)?.searchParams.get('where') ?? null;
}

describe('ForeignKeyLink', () => {
  test('compares the referenced column to a quoted literal', () => {
    expect(renderWhere('abc')).toBe("`label` = 'abc'");
  });

  test('escapes a value that would otherwise end the literal', () => {
    // it used to build `label="O'Brien"`: a double-quoted value, unescaped, so
    // an apostrophe in it made the clause a syntax error
    expect(renderWhere("O'Brien")).toBe("`label` = 'O\\'Brien'");
  });

  test('writes a number bare', () => {
    expect(renderWhere(42)).toBe('`label` = 42');
  });

  test('offers no link for a key holding NULL, which references nothing', () => {
    expect(renderWhere(null)).toBeNull();
  });

  test('opens the table in the database it belongs to', () => {
    expect(renderLink('abc')?.pathname).toBe(
      '/connections/shop/db/tables/customers'
    );
    expect(
      renderLink('abc', [
        { ...FOREIGN_KEYS[0], referencedDatabase: 'accounts' },
      ])?.pathname
    ).toBe('/connections/shop/accounts/tables/customers');
  });
});
