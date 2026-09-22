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
import { FieldKind } from '../../sql/resultField';
import ForeignKeyLink from './ForeignKeyLink';

const FOREIGN_KEYS: ForeignKey[] = [
  {
    table: 'orders',
    column: 'customer_label',
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

/** the `?where=` the link would navigate to, decoded */
function renderLink(value: unknown, fieldKind: FieldKind): string | null {
  container = document.createElement('div');
  document.body.append(container);

  const root = createRoot(container);
  unmount = () => root.unmount();

  act(() => {
    root.render(
      <ThemeProvider theme={DEFAULT_THEME}>
        <MemoryRouter>
          <ConnectionContext.Provider
            value={{
              currentConnectionSlug: 'shop',
              connectionSlugList: ['shop'],
              addConnectionToList: () => {},
              closeConnection: () => {},
            }}
          >
            <DatabaseContext.Provider
              value={{ database: 'db', setDatabase: () => {} }}
            >
              <ForeignKeysContextProvider foreignKeys={FOREIGN_KEYS}>
                <ForeignKeyLink
                  dialect={mysqlDialect}
                  tableName="orders"
                  columnName="customer_label"
                  fieldKind={fieldKind}
                  value={value}
                />
              </ForeignKeysContextProvider>
            </DatabaseContext.Provider>
          </ConnectionContext.Provider>
        </MemoryRouter>
      </ThemeProvider>
    );
  });

  const link = container.querySelector('a');

  if (!link) {
    return null;
  }

  return new URL(link.href, 'http://localhost').searchParams.get('where');
}

describe('ForeignKeyLink', () => {
  test('compares the referenced column to a quoted literal', () => {
    expect(renderLink('abc', FieldKind.String)).toBe("`label` = 'abc'");
  });

  test('escapes a value that would otherwise end the literal', () => {
    // it used to build `label="O'Brien"`: a double-quoted value, unescaped, so
    // an apostrophe in it made the clause a syntax error
    expect(renderLink("O'Brien", FieldKind.String)).toBe(
      "`label` = 'O\\'Brien'"
    );
  });

  test('writes a number bare', () => {
    expect(renderLink(42, FieldKind.Number)).toBe('`label` = 42');
  });

  test('offers no link for a key holding NULL, which references nothing', () => {
    expect(renderLink(null, FieldKind.Number)).toBeNull();
  });
});
