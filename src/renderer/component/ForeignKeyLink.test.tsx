/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { Types } from 'mysql';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { afterEach, describe, expect, test } from 'vitest';
import { DEFAULT_THEME } from '../../configuration/themes';
import { ConnectionContext } from '../../contexts/ConnectionContext';
import { DatabaseContext } from '../../contexts/DatabaseContext';
import { ForeignKeysContextProvider } from '../../contexts/ForeignKeysContext';
import { mysqlDialect } from '../../sql/dialect/mysql';
import type { KeyColumnUsageRow } from '../../sql/types';
import ForeignKeyLink from './ForeignKeyLink';

const FOREIGN_KEYS = [
  {
    TABLE_NAME: 'orders',
    COLUMN_NAME: 'customer_label',
    CONSTRAINT_NAME: 'fk_customer',
    REFERENCED_TABLE_NAME: 'customers',
    REFERENCED_COLUMN_NAME: 'label',
  },
] as KeyColumnUsageRow[];

let container: HTMLElement;
let unmount: () => void;

afterEach(() => {
  act(() => unmount());
  container.remove();
});

/** the `?where=` the link would navigate to, decoded */
function renderLink(value: unknown, fieldType: number): string | null {
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
              <ForeignKeysContextProvider keyColumnUsageRows={FOREIGN_KEYS}>
                <ForeignKeyLink
                  dialect={mysqlDialect}
                  tableName="orders"
                  columnName="customer_label"
                  fieldType={fieldType}
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
    expect(renderLink('abc', Types.VAR_STRING)).toBe("`label` = 'abc'");
  });

  test('escapes a value that would otherwise end the literal', () => {
    // it used to build `label="O'Brien"`: a double-quoted value, unescaped, so
    // an apostrophe in it made the clause a syntax error
    expect(renderLink("O'Brien", Types.VAR_STRING)).toBe(
      "`label` = 'O\\'Brien'"
    );
  });

  test('writes a number bare', () => {
    expect(renderLink(42, Types.LONG)).toBe('`label` = 42');
  });

  test('offers no link for a key holding NULL, which references nothing', () => {
    expect(renderLink(null, Types.LONG)).toBeNull();
  });
});
