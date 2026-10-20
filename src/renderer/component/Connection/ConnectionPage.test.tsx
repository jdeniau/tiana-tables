/** @vitest-environment happy-dom */
import { type ReactElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { afterEach, describe, expect, test } from 'vitest';
import { DEFAULT_THEME } from '../../../configuration/themes';
import { testables } from '../../../contexts/ConfigurationContext';
import { ConnectionContext } from '../../../contexts/ConnectionContext';
import { DatabaseEngine } from '../../../sql/engine';
import ConnectionPage from './ConnectionPage';
import Nav from './Nav';

const { ConfigurationContext } = testables;

// tells React this environment wraps its updates in `act`
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let unmount: () => void = () => {};

afterEach(() => {
  act(() => unmount());
  document.body.innerHTML = '';
});

const connections = {
  'docker-dev': {
    name: 'docker (dev)',
    slug: 'docker-dev',
    engine: DatabaseEngine.MySQL,
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'encrypted',
  },
  'pg-dev': {
    name: 'pg (dev)',
    slug: 'pg-dev',
    engine: DatabaseEngine.PostgreSQL,
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'encrypted',
    database: 'shop',
  },
};

async function render(
  element: ReactElement,
  saved: Record<string, object> = connections
): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  unmount = () => root.unmount();
  const router = createMemoryRouter([{ path: '/', element }]);

  await act(async () => {
    root.render(
      <ThemeProvider theme={DEFAULT_THEME}>
        <ConfigurationContext
          value={{ configuration: { connections: saved } } as never}
        >
          <ConnectionContext
            value={
              {
                connectionSlugList: ['docker-dev', 'pg-dev'],
                currentConnectionSlug: 'pg-dev',
              } as never
            }
          >
            <RouterProvider router={router} />
          </ConnectionContext>
        </ConfigurationContext>
      </ThemeProvider>
    );
  });

  return container;
}

describe('the engine of a connection', () => {
  test('is a named logo in the list, next to the database PostgreSQL opens', async () => {
    const container = await render(<ConnectionPage />);
    const logos = [...container.querySelectorAll('[role="img"][title]')];

    expect(logos.map((logo) => logo.getAttribute('aria-label'))).toEqual([
      'MySQL / MariaDB',
      'PostgreSQL',
    ]);
    // on the box, not in the SVG: an SVG is hovered on its strokes only
    expect(logos.map((logo) => logo.getAttribute('title'))).toEqual([
      'MySQL / MariaDB',
      'PostgreSQL',
    ]);
    expect(container.textContent).toContain('root@localhost:3306');
    expect(container.textContent).toContain('postgres@localhost:5432/shop');
  });

  test('is edited from an icon that names what it does', async () => {
    const container = await render(<ConnectionPage />);
    const edit = container.querySelector('a[href$="/connect/edit/pg-dev"]');

    expect(edit?.getAttribute('aria-label')).toBe('Edit');
  });

  // the text of a tab is its name, and its colour is the prod/dev mark
  test('is told by the tooltip of its tab, not by its text', async () => {
    const container = await render(<Nav />);
    const tab = [...container.querySelectorAll('a')].find(
      (link) => link.textContent === 'pg (dev)'
    );

    expect(tab?.getAttribute('title')).toBe('pg (dev) · PostgreSQL');
  });
});

describe('the groups of the connections', () => {
  test('list the ungrouped connections first, then each group by name', async () => {
    const container = await render(<ConnectionPage />, {
      'b-prod': {
        ...connections['docker-dev'],
        name: 'b prod',
        slug: 'b-prod',
        group: 'Client B',
      },
      'docker-dev': connections['docker-dev'],
      'a-prod': {
        ...connections['pg-dev'],
        name: 'a prod',
        slug: 'a-prod',
        group: 'Client A',
      },
      'pg-dev': connections['pg-dev'],
    });
    // the title of each group, and the name of each row, from top to bottom
    const lines = [
      ...container.querySelectorAll(
        'div[role="presentation"][title], a[href^="/connections/"] > span:first-child'
      ),
    ].map((element) => element.textContent);

    expect(lines).toEqual([
      'docker (dev)',
      'pg (dev)',
      'Client A',
      'a prod',
      'Client B',
      'b prod',
    ]);
  });
});
