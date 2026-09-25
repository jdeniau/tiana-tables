/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  ConnectionColor,
  ConnectionColorKind,
} from '../../configuration/connectionColor';
import { DEFAULT_THEME } from '../../configuration/themes';
import { testables } from '../../contexts/ConfigurationContext';
import { ConnectionContext } from '../../contexts/ConnectionContext';
import { OpenTablesContextProvider } from '../../contexts/OpenTablesContext';
import { DatabaseEngine } from '../../sql/engine';
import TableList from './TableList';

const { ConfigurationContext } = testables;

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLElement;
let unmount: () => void;

beforeEach(() => {
  // @ts-expect-error there is no main process here to answer the writes
  window.config = { setOpenTables: vi.fn(), setActiveTable: vi.fn() };
});

afterEach(() => {
  act(() => unmount());
  container.remove();
});

/** The list on `bar`, in a connection marked with `color` if it is given. */
async function render(color?: ConnectionColor): Promise<void> {
  container = document.createElement('div');
  document.body.append(container);

  const root = createRoot(container);
  unmount = () => root.unmount();

  await act(async () => {
    root.render(
      <ThemeProvider theme={DEFAULT_THEME}>
        <ConfigurationContext.Provider
          value={{
            configuration: {
              version: 1,
              theme: DEFAULT_THEME.name,
              locale: 'en',
              connections: {
                test: {
                  name: 'test',
                  slug: 'test',
                  engine: DatabaseEngine.MySQL,
                  host: 'localhost',
                  port: 3306,
                  user: 'root',
                  password: '',
                  color,
                },
              },
            },
            addConnectionToConfig: vi.fn(),
            editConnection: vi.fn(),
            setActiveDatabase: vi.fn(),
            setActiveTable: vi.fn(),
            setPanelSize: vi.fn(),
            changeLanguage: vi.fn(),
          }}
        >
          <ConnectionContext.Provider
            value={{
              currentConnectionSlug: 'test',
              connectionSlugList: ['test'],
              addConnectionToList: vi.fn(),
              closeConnection: vi.fn(),
            }}
          >
            <MemoryRouter
              initialEntries={['/connections/test/shop/tables/bar']}
            >
              <Routes>
                <Route
                  path="/connections/:connectionSlug/:databaseName/tables/:tableName"
                  element={
                    <OpenTablesContextProvider
                      connectionSlug="test"
                      database="shop"
                      openTables={[]}
                    >
                      <TableList tableList={['foo', 'bar']} />
                    </OpenTablesContextProvider>
                  }
                />
              </Routes>
            </MemoryRouter>
          </ConnectionContext.Provider>
        </ConfigurationContext.Provider>
      </ThemeProvider>
    );
  });
}

function ruleOf(name: string): string {
  const link = [...container.querySelectorAll('a')].find(
    (anchor) => anchor.textContent === name
  );

  if (!link) {
    throw new Error(`no row for ${name}`);
  }

  return getComputedStyle(link).borderInlineStart;
}

describe('TableList', () => {
  test('the selected table carries the accent rule without a connection colour', async () => {
    await render();

    expect(ruleOf('bar')).toBe(`3px solid ${DEFAULT_THEME.palette.base0D}`);
    expect(ruleOf('foo')).toBe('3px solid transparent');
  });

  test('the selected table carries the colour of its connection', async () => {
    await render({ kind: ConnectionColorKind.Palette, slot: 'base08' });

    expect(ruleOf('bar')).toBe(`3px solid ${DEFAULT_THEME.palette.base08}`);
    expect(ruleOf('foo')).toBe('3px solid transparent');
  });

  test('a custom colour is taken as it is', async () => {
    await render({ kind: ConnectionColorKind.Custom, hex: '#123456' });

    expect(ruleOf('bar')).toBe('3px solid #123456');
  });
});
