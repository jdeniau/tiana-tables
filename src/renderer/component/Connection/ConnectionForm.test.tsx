/** @vitest-environment happy-dom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DEFAULT_THEME } from '../../../configuration/themes';
import type { EncryptedConnectionObject } from '../../../configuration/type';
import { testables } from '../../../contexts/ConfigurationContext';
import { DatabaseEngine } from '../../../sql/engine';
import ConnectionForm from './ConnectionForm';

const { ConfigurationContext } = testables;

// tells React this environment wraps its updates in `act`
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let unmount: () => void = () => {};

afterEach(async () => {
  act(() => unmount());
  document.body.innerHTML = '';
  // antd updates a field's error list 10 ms after a submit: past the environment's teardown, it throws on `window`
  await new Promise((resolve) => setTimeout(resolve, 20));
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

/** the form mounted as the new-connection page does, or the edit page with a `connection`, the save spied on */
async function renderForm({
  connection,
  connections = {},
}: {
  connection?: EncryptedConnectionObject;
  connections?: Record<string, object>;
} = {}) {
  const addConnectionToConfig = vi.fn();
  const editConnection = vi.fn();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  unmount = () => root.unmount();

  await act(async () => {
    root.render(
      <MemoryRouter>
        <ThemeProvider theme={DEFAULT_THEME}>
          <ConfigurationContext
            value={
              {
                configuration: { connections },
                addConnectionToConfig,
                editConnection,
              } as never
            }
          >
            <ConnectionForm connection={connection} />
          </ConfigurationContext>
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

    const save = connection ? editConnection : addConnectionToConfig;

    await vi.waitFor(() => expect(save).toHaveBeenCalled());

    return save.mock.lastCall?.at(-1);
  };

  return { container, field, choose, submit, addConnectionToConfig };
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

  test('submits the group typed, without the spaces around it', async () => {
    const { field, submit } = await renderForm();

    await act(async () => {
      type(field('name')!, 'docker (dev)');
      type(field('group')!, '  Client A ');
    });

    expect(await submit()).toMatchObject({ group: 'Client A' });
  });

  test('a blank group is no group', async () => {
    const { field, submit } = await renderForm();

    await act(async () => {
      type(field('name')!, 'docker (dev)');
      type(field('group')!, '  ');
    });

    expect((await submit()).group).toBeUndefined();
  });

  test('suggests the groups already in use', async () => {
    const { field } = await renderForm({
      connections: {
        prod: { name: 'prod', slug: 'prod', group: 'Client A' },
        other: { name: 'other', slug: 'other', group: 'Client B' },
      },
    });

    await act(async () => {
      type(field('group')!, 'client a');
    });

    const options = [...document.querySelectorAll('[role="option"]')];

    expect(options.map((option) => option.textContent)).toEqual(['Client A']);
  });

  test('connects directly unless told otherwise', async () => {
    const { field, submit } = await renderForm();

    expect(field('ssh_host')).toBeNull();

    await act(async () => {
      type(field('name')!, 'docker (dev)');
    });

    expect(await submit()).not.toHaveProperty('ssh');
  });

  test('a tunnel submits its SSH server alone, leaving the port and user to ~/.ssh/config', async () => {
    const { container, field, choose, submit } = await renderForm();

    await choose('SSH tunnel');

    expect(container.textContent).toContain(
      'reached by the ssh command of this machine'
    );

    await act(async () => {
      type(field('name')!, 'through the bastion (dev)');
      type(field('ssh_host')!, 'bastion');
    });

    expect((await submit()).ssh).toEqual({ host: 'bastion' });
  });

  test('a tunnel needs its SSH host', async () => {
    const { container, field, choose, addConnectionToConfig } =
      await renderForm();

    await choose('SSH tunnel');

    expect(field('ssh_host')?.value).toBe('');

    await act(async () => {
      type(field('name')!, 'through the bastion (dev)');
      container.querySelector('form')!.requestSubmit();
    });

    await vi.waitFor(() =>
      expect(field('ssh_host')?.getAttribute('aria-invalid')).toBe('true')
    );
    expect(addConnectionToConfig).not.toHaveBeenCalled();
  });

  test('a port and user typed then emptied are not submitted', async () => {
    const { field, choose, submit } = await renderForm();

    await choose('SSH tunnel');
    await act(async () => {
      type(field('name')!, 'through the bastion (dev)');
      type(field('ssh_host')!, 'bastion.example.org');
      type(field('ssh_port')!, '2222');
      type(field('ssh_user')!, 'me');
    });

    expect((await submit()).ssh).toEqual({
      host: 'bastion.example.org',
      port: 2222,
      user: 'me',
    });

    await act(async () => {
      type(field('ssh_port')!, '');
      type(field('ssh_user')!, '  ');
    });

    expect((await submit()).ssh).toEqual({ host: 'bastion.example.org' });
  });

  test('a connection saved with a tunnel opens on it', async () => {
    const { field, submit } = await renderForm({
      connection: {
        name: 'through the bastion (dev)',
        slug: 'through-the-bastion-dev',
        engine: DatabaseEngine.MySQL,
        host: 'mysql',
        port: 3306,
        user: 'root',
        password: 'ciphertext',
        ssh: { host: '127.0.0.1', port: 12222, user: 'dev' },
      },
    });

    expect(field('ssh_host')?.value).toBe('127.0.0.1');

    expect(await submit()).toMatchObject({
      ssh: { host: '127.0.0.1', port: 12222, user: 'dev' },
    });
  });
});
