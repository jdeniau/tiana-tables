/** @vitest-environment happy-dom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DEFAULT_THEME } from '../../../configuration/themes';
import { testables } from '../../../contexts/ConfigurationContext';
import ConnectionForm from './ConnectionForm';

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

/** a field typed into the way a user does, through React's own value setter */
function type(input: HTMLInputElement, text: string): void {
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )?.set;

  setValue?.call(input, text);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** the form mounted as the new-connection page does, with the add spied on */
async function renderForm() {
  const addConnectionToConfig = vi.fn();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  unmount = () => root.unmount();

  await act(async () => {
    root.render(
      <MemoryRouter>
        <ThemeProvider theme={DEFAULT_THEME}>
          <ConfigurationContext.Provider
            value={
              {
                configuration: { connections: {} },
                addConnectionToConfig,
              } as never
            }
          >
            <ConnectionForm />
          </ConfigurationContext.Provider>
        </ThemeProvider>
      </MemoryRouter>
    );
  });

  const field = (id: string) =>
    container.querySelector<HTMLInputElement>(`#${id}`);

  const choose = async (label: string) => {
    const option = [...container.querySelectorAll('label')].find(
      (element) => element.textContent === label
    );

    await act(async () => {
      option?.click();
    });
  };

  const submit = async () => {
    await act(async () => {
      container.querySelector('form')!.requestSubmit();
    });

    await vi.waitFor(() => expect(addConnectionToConfig).toHaveBeenCalled());

    return addConnectionToConfig.mock.lastCall?.[0];
  };

  return { container, field, choose, submit };
}

describe('ConnectionForm', () => {
  // an `<Input>` answered the port as text, whatever its type claimed
  test('submits the port typed as a number', async () => {
    const { field, submit } = await renderForm();

    await act(async () => {
      type(field('name')!, 'docker (dev)');
      type(field('port')!, '3307');
    });

    expect(await submit()).toMatchObject({ port: 3307 });
  });

  test('opens on MySQL, with no database to name', async () => {
    const { field, submit } = await renderForm();

    expect(field('database')).toBeNull();

    await act(async () => {
      type(field('name')!, 'docker (dev)');
    });

    const submitted = await submit();

    expect(submitted).toMatchObject({
      engine: 'mysql',
      port: 3306,
      user: 'root',
    });
    expect(submitted).not.toHaveProperty('database');
  });

  test('PostgreSQL brings its own port, superuser and database', async () => {
    const { field, choose, submit } = await renderForm();

    await choose('PostgreSQL');

    expect(field('port')?.value).toBe('5432');
    expect(field('user')?.value).toBe('postgres');
    expect(field('database')?.value).toBe('postgres');

    await act(async () => {
      type(field('name')!, 'pg (dev)');
    });

    expect(await submit()).toMatchObject({
      engine: 'postgresql',
      port: 5432,
      user: 'postgres',
      database: 'postgres',
    });
  });

  // only a value that is still the other engine's default follows the engine
  test('keeps a port and a user the user typed', async () => {
    const { field, choose } = await renderForm();

    await act(async () => {
      type(field('port')!, '15432');
      type(field('user')!, 'admin');
    });

    await choose('PostgreSQL');

    expect(field('port')?.value).toBe('15432');
    expect(field('user')?.value).toBe('admin');
  });

  // the database is dropped with its field, not carried into a MySQL connection
  test('forgets the database when going back to MySQL', async () => {
    const { field, choose, submit } = await renderForm();

    await choose('PostgreSQL');
    await choose('MySQL / MariaDB');

    expect(field('database')).toBeNull();
    expect(field('port')?.value).toBe('3306');

    await act(async () => {
      type(field('name')!, 'docker (dev)');
    });

    expect(await submit()).not.toHaveProperty('database');
  });

  test('connects in the clear unless told otherwise', async () => {
    const { field, submit } = await renderForm();

    await act(async () => {
      type(field('name')!, 'docker (dev)');
    });

    expect(await submit()).toMatchObject({ ssl: 'disable' });
  });

  // what libpq calls `sslmode=require`, as a connection string hands it over
  test('submits the SSL mode chosen, and says what it does', async () => {
    const { container, field, choose, submit } = await renderForm();

    await choose('Required');

    expect(container.textContent).toContain(
      'Encrypted, the server certificate taken as it comes.'
    );

    await act(async () => {
      type(field('name')!, 'prisma');
    });

    expect(await submit()).toMatchObject({ ssl: 'require' });
  });
});
