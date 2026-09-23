import { dialog, safeStorage } from 'electron';
import { existsSync, readFileSync, writeFile } from 'node:fs';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DatabaseEngine } from '../sql/engine';
import { DEFAULT_LOCALE } from './locale';
import { PANEL } from './panels';
import { DEFAULT_THEME } from './themes';
import { Configuration } from './type';
import {
  addConnectionToConfig,
  changeLanguage,
  changeTheme,
  editConnection,
  getConfiguration,
  setActiveDatabase,
  setActiveTable,
  setColumnDisplayAfter,
  setColumnWidth,
  setOpenTables,
  setPanelSize,
  setTableFilter,
  testables,
} from '.';

const { getBaseConfig, resetConfiguration } = testables;

vi.mock('node:path', () => ({
  dirname: (path: string) => path.substring(0, path.lastIndexOf('/')),
  resolve: (a: string, b: string) => `${a}/${b}`,
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  mkdirSync: vi.fn().mockReturnValue(true),
  writeFile: vi.fn(),
}));

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFile = vi.mocked(writeFile);

function resetAllMocks(): void {
  vi.resetModules();
  mockExistsSync.mockReset();
  mockReadFileSync.mockReset();
  mockWriteFile.mockReset();

  resetConfiguration();
}

vi.mock('../i18n', () => ({
  t: (key: string) => key,
}));

vi.mock('electron', () => ({
  safeStorage: {
    encryptStringAsync: vi.fn((s: string) =>
      Promise.resolve(Buffer.from(`encrypted-${s}`))
    ),
    decryptStringAsync: vi.fn((b: Buffer) =>
      Promise.resolve({
        result: b.toString().substring(10),
        shouldReEncrypt: false,
      })
    ),
    isAsyncEncryptionAvailable: vi.fn(() => Promise.resolve(true)),
    getSelectedStorageBackend: vi.fn(() => 'gnome_libsecret'),
  },
  dialog: {
    showErrorBox: vi.fn(),
    showMessageBox: vi.fn(() => Promise.resolve({ response: 0 })),
  },
  app: {
    getPath: vi.fn((s: string) => s),
  },
}));

function mockExistingConfig(
  config: Configuration = {
    version: 1,
    theme: DEFAULT_THEME.name,
    locale: DEFAULT_LOCALE,

    connections: {
      // @ts-expect-error -- a configuration file names no engine, `loadConfiguration` decides it
      local: {
        name: 'local',
        host: 'localhost',
        user: 'root',
        port: 3306,
        password: Buffer.from('encrypted-password').toString('base64'),
        slug: 'local',
      },
      // @ts-expect-error -- a configuration file names no engine, `loadConfiguration` decides it
      prod: {
        name: 'prod',
        host: 'prod',
        user: 'root',
        port: 3306,
        password: Buffer.from('encrypted-password').toString('base64'),
        slug: 'prod',
      },
    },
  }
): void {
  mockExistsSync.mockReturnValue(true);
  mockReadFileSync.mockReturnValue(JSON.stringify(config));
}

afterEach(() => {
  resetAllMocks();
});

describe('read configuration from file', () => {
  test('empty file', () => {
    mockExistsSync.mockReturnValue(false);

    expect(getConfiguration()).toStrictEqual(getBaseConfig());
    expect(mockReadFileSync).not.toHaveBeenCalled();
  });

  test('existing file but empty', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('');

    expect(getConfiguration()).toStrictEqual(getBaseConfig());

    expect(mockReadFileSync).toHaveBeenCalledOnce();
  });

  test('existing file without connexion key', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('{}');

    expect(getConfiguration()).toStrictEqual({
      connections: {},
    });

    expect(mockReadFileSync).toHaveBeenCalledOnce();
  });

  test('existing file without connexion', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('{ "version": 1, "connections": {}}');

    expect(getConfiguration()).toStrictEqual({
      version: 1,
      connections: {},
    });

    expect(mockReadFileSync).toHaveBeenCalledOnce();
  });

  test('a port stored as text is read as the number it is', () => {
    mockExistingConfig({
      version: 1,
      theme: DEFAULT_THEME.name,
      locale: DEFAULT_LOCALE,
      connections: {
        local: {
          name: 'local',
          engine: DatabaseEngine.MySQL,
          host: 'localhost',
          user: 'root',
          // @ts-expect-error -- what the form wrote before it had a number field
          port: '3307',
          password: Buffer.from('encrypted-password').toString('base64'),
          slug: 'local',
        },
      },
    });

    expect(getConfiguration().connections.local.port).toBe(3307);
  });

  test('existing file with connexions', () => {
    mockExistingConfig();

    // the passwords come back as the file holds them: decrypting is the job of whoever opens a connection
    // the engine is the one thing added on the way in: no file names one yet
    expect(getConfiguration()).toStrictEqual({
      version: 1,
      theme: DEFAULT_THEME.name,
      locale: DEFAULT_LOCALE,
      connections: {
        local: {
          name: 'local',
          host: 'localhost',
          user: 'root',
          port: 3306,
          password: Buffer.from('encrypted-password').toString('base64'),
          slug: 'local',
          engine: DatabaseEngine.MySQL,
        },
        prod: {
          name: 'prod',
          host: 'prod',
          user: 'root',
          port: 3306,
          password: Buffer.from('encrypted-password').toString('base64'),
          slug: 'prod',
          engine: DatabaseEngine.MySQL,
        },
      },
    });
  });
});

describe('add connection to config', () => {
  test('empty file', async () => {
    mockExistsSync.mockReturnValue(false);
    await addConnectionToConfig({
      name: 'local',
      engine: DatabaseEngine.MySQL,
      host: 'localhost',
      user: 'root',
      port: 3306,
      password: 'password',
    });

    expect(mockWriteFile).toHaveBeenCalledWith(
      'userData/config/config.json',
      JSON.stringify(
        {
          version: 1,
          theme: DEFAULT_THEME.name,
          locale: DEFAULT_LOCALE,
          connections: {
            local: {
              name: 'local',
              engine: DatabaseEngine.MySQL,
              host: 'localhost',
              user: 'root',
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
              slug: 'local',
            },
          },
        },
        null,
        2
      ),
      'utf-8',
      expect.any(Function)
    );
  });

  test('existing file', async () => {
    const config = {
      version: 1,
      connections: {
        local: {
          name: 'local',
          host: 'localhost',
          user: 'root',
          port: 3306,
          password: Buffer.from('encrypted-password').toString('base64'),
        },
        prod: {
          name: 'prod',
          host: 'prod',
          user: 'root',
          port: 3306,
          password: Buffer.from('encrypted-password').toString('base64'),
        },
      },
    };

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(config));

    await addConnectionToConfig({
      name: 'test',
      engine: DatabaseEngine.MySQL,
      host: 'test',
      port: 3306,
      user: 'root',
      password: 'password',
    });

    expect(mockWriteFile).toHaveBeenCalledWith(
      'userData/config/config.json',
      JSON.stringify(
        {
          version: 1,
          connections: {
            local: {
              name: 'local',
              host: 'localhost',
              user: 'root',
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
              engine: DatabaseEngine.MySQL,
            },
            prod: {
              name: 'prod',
              host: 'prod',
              user: 'root',
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
              engine: DatabaseEngine.MySQL,
            },
            test: {
              name: 'test',
              engine: DatabaseEngine.MySQL,
              host: 'test',
              port: 3306,
              user: 'root',
              password: Buffer.from('encrypted-password').toString('base64'),
              slug: 'test',
            },
          },
        },
        null,
        2
      ),
      'utf-8',
      expect.any(Function)
    );

    expect(mockReadFileSync).toHaveBeenCalledOnce();
  });

  test('a name that slugifies like an existing one is suffixed', async () => {
    mockExistingConfig();

    const configuration = await addConnectionToConfig({
      name: 'LOCAL',
      engine: DatabaseEngine.MySQL,
      host: 'elsewhere',
      user: 'root',
      port: 3306,
      password: 'password',
    });

    // the connection already there is untouched
    expect(configuration.connections.local.host).toBe('localhost');
    expect(configuration.connections['local-2']).toMatchObject({
      name: 'LOCAL',
      host: 'elsewhere',
      slug: 'local-2',
    });
  });
});

describe('set theme', () => {
  test('set theme', async () => {
    mockExistsSync.mockReturnValue(false);

    await changeTheme('test');

    expect(mockWriteFile).toHaveBeenCalledWith(
      'userData/config/config.json',
      JSON.stringify(
        {
          version: 1,
          theme: 'test',
          locale: DEFAULT_LOCALE,
          connections: {},
        },
        null,
        2
      ),
      'utf-8',
      expect.any(Function)
    );
  });

  test('existing file', async () => {
    const config = {
      version: 1,
      connections: {
        local: {
          name: 'local',
          host: 'localhost',
          port: 3306,
          password: Buffer.from('encrypted-password').toString('base64'),
        },
        prod: {
          name: 'prod',
          host: 'prod',
          port: 3306,
          password: Buffer.from('encrypted-password').toString('base64'),
        },
      },
    };

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(config));

    await changeTheme('test');

    expect(mockWriteFile).toHaveBeenCalledWith(
      'userData/config/config.json',
      JSON.stringify(
        {
          version: 1,
          connections: {
            local: {
              name: 'local',
              host: 'localhost',
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
              engine: DatabaseEngine.MySQL,
            },
            prod: {
              name: 'prod',
              host: 'prod',
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
              engine: DatabaseEngine.MySQL,
            },
          },
          theme: 'test',
        },
        null,
        2
      ),
      'utf-8',
      expect.any(Function)
    );

    expect(mockReadFileSync).toHaveBeenCalledOnce();
  });
});

describe('language', () => {
  test('change language', async () => {
    mockExistsSync.mockReturnValue(false);

    const newConfiguration = await changeLanguage('fr');

    expect(newConfiguration.locale).toBe('fr');

    expect(mockWriteFile).toHaveBeenCalledWith(
      'userData/config/config.json',
      JSON.stringify(
        {
          version: 1,
          theme: DEFAULT_THEME.name,
          locale: 'fr',
          connections: {},
        },
        null,
        2
      ),
      'utf-8',
      expect.any(Function)
    );
  });
});

describe('set connection appState', async () => {
  test('empty file', async () => {
    mockExistsSync.mockReturnValue(false);

    await setActiveDatabase('test', 'db');

    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  test('existing file, non-existing connection', async () => {
    mockExistingConfig();

    await setActiveDatabase('inexistant', 'db');

    expect(mockWriteFile).not.toHaveBeenCalled();

    expect(mockReadFileSync).toHaveBeenCalledOnce();
  });

  test('existing file, set activeDatabase', async () => {
    mockExistingConfig({
      version: 1,
      theme: DEFAULT_THEME.name,
      locale: DEFAULT_LOCALE,

      connections: {
        // @ts-expect-error -- a configuration file names no engine, `loadConfiguration` decides it
        local: {
          name: 'local',
          host: 'localhost',
          user: 'root',
          port: 3306,
          password: Buffer.from('encrypted-password').toString('base64'),
          slug: 'local',
        },
        // @ts-expect-error -- a configuration file names no engine, `loadConfiguration` decides it
        prod: {
          name: 'prod',
          host: 'prod',
          user: 'root',
          port: 3306,
          password: Buffer.from('encrypted-password').toString('base64'),
          slug: 'prod',
          appState: {
            activeDatabase: 'db',
            configByDatabase: {},
          },
        },
      },
    });

    await setActiveDatabase('prod', 'db');

    expect(mockWriteFile).toHaveBeenCalledWith(
      'userData/config/config.json',
      JSON.stringify(
        {
          version: 1,
          theme: DEFAULT_THEME.name,
          locale: DEFAULT_LOCALE,
          connections: {
            local: {
              name: 'local',
              host: 'localhost',
              user: 'root',
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
              slug: 'local',
              engine: DatabaseEngine.MySQL,
            },
            prod: {
              name: 'prod',
              host: 'prod',
              user: 'root',
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
              slug: 'prod',
              appState: {
                activeDatabase: 'db',
                configByDatabase: {},
              },
              engine: DatabaseEngine.MySQL,
            },
          },
        },
        null,
        2
      ),
      'utf-8',
      expect.any(Function)
    );

    expect(mockReadFileSync).toHaveBeenCalledOnce();
  });

  test('existing file, set activeTable', async () => {
    mockExistingConfig();

    await setActiveDatabase('prod', 'db');
    await setActiveTable('prod', 'db', 'table');
    await setActiveTable('prod', 'db2', 'table2');

    expect(mockWriteFile).toHaveBeenCalledWith(
      'userData/config/config.json',
      JSON.stringify(
        {
          version: 1,
          theme: DEFAULT_THEME.name,
          locale: DEFAULT_LOCALE,
          connections: {
            local: {
              name: 'local',
              host: 'localhost',
              user: 'root',
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
              slug: 'local',
              engine: DatabaseEngine.MySQL,
            },
            prod: {
              name: 'prod',
              host: 'prod',
              user: 'root',
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
              slug: 'prod',
              engine: DatabaseEngine.MySQL,
              appState: {
                activeDatabase: 'db',
                configByDatabase: {
                  db: {
                    activeTable: 'table',
                    tables: {},
                  },
                  db2: {
                    activeTable: 'table2',
                    tables: {},
                  },
                },
              },
            },
          },
        },
        null,
        2
      ),
      'utf-8',
      expect.any(Function)
    );
  });

  test('existing file, memorise tabs then close the last one', async () => {
    mockExistingConfig();

    await setActiveDatabase('prod', 'db');
    await setOpenTables('prod', 'db', ['users', 'orders']);
    await setActiveTable('prod', 'db', 'orders');

    expect(
      getConfiguration().connections.prod?.appState?.configByDatabase.db
    ).toEqual({
      activeTable: 'orders',
      openTables: ['users', 'orders'],
      tables: {},
    });

    // the last tab was closed: the database page has nothing to reopen
    await setOpenTables('prod', 'db', []);
    await setActiveTable('prod', 'db', null);

    expect(
      getConfiguration().connections.prod?.appState?.configByDatabase.db
    ).toEqual({
      activeTable: '',
      openTables: [],
      tables: {},
    });
  });

  test('setActiveTable with appState but no configByDatabase', async () => {
    mockExistingConfig({
      version: 1,
      theme: DEFAULT_THEME.name,
      locale: DEFAULT_LOCALE,

      connections: {
        prod: {
          name: 'prod',
          host: 'prod',
          user: 'root',
          port: 3306,
          password: Buffer.from('encrypted-password').toString('base64'),
          slug: 'prod',
          // @ts-expect-error -- testing edge case with existing configuration
          appState: {
            activeDatabase: 'ticketing',
          },
        },
      },
    });

    await setActiveDatabase('prod', 'db');
    await setActiveTable('prod', 'db', 'table');

    expect(mockWriteFile).toHaveBeenCalledWith(
      'userData/config/config.json',
      JSON.stringify(
        {
          version: 1,
          theme: DEFAULT_THEME.name,
          locale: DEFAULT_LOCALE,
          connections: {
            prod: {
              name: 'prod',
              host: 'prod',
              user: 'root',
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
              slug: 'prod',
              appState: {
                activeDatabase: 'db',
                configByDatabase: {
                  db: {
                    activeTable: 'table',
                    tables: {},
                  },
                },
              },
              engine: DatabaseEngine.MySQL,
            },
          },
        },
        null,
        2
      ),
      'utf-8',
      expect.any(Function)
    );
  });
});

describe('setTableFilter', () => {
  test('leaves the column order of the table alone', () => {
    mockExistingConfig();

    setColumnDisplayAfter('prod', 'db', 'sometable', 'lastname', 'firstname');
    setTableFilter('prod', 'db', 'sometable', 'id = 1');

    expect(writtenTableConfig('sometable')).toEqual({
      currentFilter: 'id = 1',
      filterHistory: ['id = 1'],
      displayAfterByColumn: { lastname: 'firstname' },
    });
  });

  test('with basic configuration', async () => {
    mockExistingConfig();

    await setTableFilter('prod', 'db', 'sometable', 'id = 1');

    expect(mockWriteFile).toHaveBeenCalledWith(
      'userData/config/config.json',
      JSON.stringify(
        {
          version: 1,
          theme: DEFAULT_THEME.name,
          locale: DEFAULT_LOCALE,

          connections: {
            local: {
              name: 'local',
              host: 'localhost',
              user: 'root',
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
              slug: 'local',
              engine: DatabaseEngine.MySQL,
            },
            prod: {
              name: 'prod',
              host: 'prod',
              user: 'root',
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
              slug: 'prod',
              engine: DatabaseEngine.MySQL,
              appState: {
                activeDatabase: '',
                configByDatabase: {
                  db: {
                    activeTable: '',
                    tables: {
                      sometable: {
                        currentFilter: 'id = 1',
                        filterHistory: ['id = 1'],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        null,
        2
      ),
      'utf-8',
      expect.any(Function)
    );
  });

  test('accumulates the filters used, most recent first', () => {
    mockExistingConfig();

    setTableFilter('prod', 'db', 'sometable', 'id = 1');
    setTableFilter('prod', 'db', 'sometable', 'id = 2');
    setTableFilter('prod', 'db', 'sometable', 'id = 1');

    // clearing the filter is a state of the table, not a filter to remember
    const history = setTableFilter('prod', 'db', 'sometable', '');

    expect(history).toEqual(['id = 1', 'id = 2']);

    const written = JSON.parse(String(mockWriteFile.mock.lastCall?.[1]));

    expect(
      written.connections.prod.appState.configByDatabase.db.tables.sometable
    ).toEqual({
      currentFilter: '',
      filterHistory: ['id = 1', 'id = 2'],
    });
  });
});

/** the config of one table of `db`, as the last write left it on disk */
function writtenTableConfig(tableName: string) {
  const written = JSON.parse(
    mockWriteFile.mock.calls.at(-1)?.[1] as string
  ) as Configuration;

  return written.connections.prod.appState?.configByDatabase.db.tables[
    tableName
  ];
}

describe('setColumnDisplayAfter', () => {
  test('records the column a column is displayed after', () => {
    mockExistingConfig();

    setColumnDisplayAfter('prod', 'db', 'sometable', 'lastname', 'firstname');

    expect(writtenTableConfig('sometable')).toEqual({
      displayAfterByColumn: { lastname: 'firstname' },
    });
  });

  test('adds to what was already recorded', () => {
    mockExistingConfig();

    setColumnDisplayAfter('prod', 'db', 'sometable', 'lastname', 'firstname');
    setColumnDisplayAfter('prod', 'db', 'sometable', 'email', 'id');

    expect(writtenTableConfig('sometable')).toEqual({
      displayAfterByColumn: { lastname: 'firstname', email: 'id' },
    });
  });

  test('forgets a column put back in its place', () => {
    mockExistingConfig();

    setColumnDisplayAfter('prod', 'db', 'sometable', 'lastname', 'firstname');
    setColumnDisplayAfter('prod', 'db', 'sometable', 'lastname', null);

    expect(writtenTableConfig('sometable')).toEqual({
      displayAfterByColumn: {},
    });
  });

  test('leaves the filter of the table alone', () => {
    mockExistingConfig();

    setTableFilter('prod', 'db', 'sometable', 'id = 1');
    setColumnDisplayAfter('prod', 'db', 'sometable', 'lastname', 'firstname');

    expect(writtenTableConfig('sometable')).toEqual({
      currentFilter: 'id = 1',
      filterHistory: ['id = 1'],
      displayAfterByColumn: { lastname: 'firstname' },
    });
  });

  test('leaves the other tables alone', () => {
    mockExistingConfig();

    setColumnDisplayAfter('prod', 'db', 'sometable', 'lastname', 'firstname');
    setColumnDisplayAfter('prod', 'db', 'othertable', 'email', 'id');

    expect(writtenTableConfig('sometable')).toEqual({
      displayAfterByColumn: { lastname: 'firstname' },
    });
  });
});

describe('setColumnWidth', () => {
  test('records the width a column was dragged to', () => {
    mockExistingConfig();

    setColumnWidth('prod', 'db', 'sometable', 'lastname', 320);

    expect(writtenTableConfig('sometable')).toEqual({
      columnWidthByColumn: { lastname: 320 },
    });
  });

  test('adds to what was already recorded, and replaces its own', () => {
    mockExistingConfig();

    setColumnWidth('prod', 'db', 'sometable', 'lastname', 320);
    setColumnWidth('prod', 'db', 'sometable', 'email', 240);
    setColumnWidth('prod', 'db', 'sometable', 'lastname', 180);

    expect(writtenTableConfig('sometable')).toEqual({
      columnWidthByColumn: { lastname: 180, email: 240 },
    });
  });

  test('leaves the filter and the column order of the table alone', () => {
    mockExistingConfig();

    setTableFilter('prod', 'db', 'sometable', 'id = 1');
    setColumnDisplayAfter('prod', 'db', 'sometable', 'lastname', 'firstname');
    setColumnWidth('prod', 'db', 'sometable', 'lastname', 320);

    expect(writtenTableConfig('sometable')).toEqual({
      currentFilter: 'id = 1',
      filterHistory: ['id = 1'],
      displayAfterByColumn: { lastname: 'firstname' },
      columnWidthByColumn: { lastname: 320 },
    });
  });

  test('leaves the other tables alone', () => {
    mockExistingConfig();

    setColumnWidth('prod', 'db', 'sometable', 'lastname', 320);
    setColumnWidth('prod', 'db', 'othertable', 'email', 240);

    expect(writtenTableConfig('sometable')).toEqual({
      columnWidthByColumn: { lastname: 320 },
    });
  });
});

/** two names that slugify the same, as they end up stored */
const twoNamesOneSlug = {
  version: 1,
  theme: DEFAULT_THEME.name,
  locale: DEFAULT_LOCALE,
  connections: {
    // @ts-expect-error -- a configuration file names no engine, `loadConfiguration` decides it
    'docker-dev': {
      name: 'docker (dev)',
      host: 'localhost',
      user: 'root',
      port: 13306,
      password: Buffer.from('encrypted-password').toString('base64'),
      slug: 'docker-dev',
    },
    // @ts-expect-error -- a configuration file names no engine, `loadConfiguration` decides it
    'docker-dev-2': {
      name: 'Docker-Dev',
      host: 'localhost',
      user: 'root',
      port: 13307,
      password: Buffer.from('encrypted-password').toString('base64'),
      slug: 'docker-dev-2',
    },
  },
} satisfies Configuration;

describe('edit', () => {
  test('edit connexion', async () => {
    mockExistingConfig();

    const configuration = await editConnection('prod', {
      name: 'prod',
      engine: DatabaseEngine.MySQL,
      host: 'prod2',
      user: 'root2',
      port: 3306,
      password: 'password',
    });

    expect(configuration.connections.prod.host).toBe('prod2');

    expect(mockWriteFile).toHaveBeenCalledWith(
      'userData/config/config.json',
      JSON.stringify(
        {
          version: 1,
          theme: DEFAULT_THEME.name,
          locale: DEFAULT_LOCALE,
          connections: {
            local: {
              name: 'local',
              host: 'localhost',
              user: 'root',
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
              slug: 'local',
              engine: DatabaseEngine.MySQL,
            },
            prod: {
              name: 'prod',
              engine: DatabaseEngine.MySQL,
              host: 'prod2',
              user: 'root2',
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
              slug: 'prod',
            },
          },
        },
        null,
        2
      ),
      'utf-8',
      expect.any(Function)
    );

    expect(mockReadFileSync).toHaveBeenCalledOnce();
  });

  test('rename connexion', async () => {
    mockExistingConfig();

    const configuration = await editConnection('local', {
      name: 'my new local connection',
      engine: DatabaseEngine.MySQL,
      host: 'local2',
      user: 'root2',
      port: 3306,
      password: 'password',
    });

    expect(Object.keys(configuration.connections)).toEqual([
      'prod',
      'my-new-local-connection',
    ]);
    expect(configuration.connections.local).toBeUndefined();
    expect(configuration.connections['my-new-local-connection'].host).toBe(
      'local2'
    );

    expect(mockWriteFile).toHaveBeenCalledWith(
      'userData/config/config.json',
      JSON.stringify(
        {
          version: 1,
          theme: DEFAULT_THEME.name,
          locale: DEFAULT_LOCALE,
          connections: {
            prod: {
              name: 'prod',
              host: 'prod',
              user: 'root',
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
              slug: 'prod',
              engine: DatabaseEngine.MySQL,
            },
            'my-new-local-connection': {
              name: 'my new local connection',
              engine: DatabaseEngine.MySQL,
              host: 'local2',
              user: 'root2',
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
              slug: 'my-new-local-connection',
            },
          },
        },
        null,
        2
      ),
      'utf-8',
      expect.any(Function)
    );

    expect(mockReadFileSync).toHaveBeenCalledOnce();
  });

  test('renaming onto the name of another connection suffixes the slug', async () => {
    mockExistingConfig();

    const configuration = await editConnection('prod', {
      name: 'Local',
      engine: DatabaseEngine.MySQL,
      host: 'prod',
      user: 'root',
      port: 3306,
      password: 'password',
    });

    // the connection that already held `local` is still there
    expect(configuration.connections.local.name).toBe('local');
    expect(configuration.connections.prod).toBeUndefined();
    expect(configuration.connections['local-2']).toMatchObject({
      name: 'Local',
      slug: 'local-2',
    });
  });

  test('a suffixed connection edited without a rename keeps its slug', async () => {
    // @ts-expect-error -- a configuration file names no engine, `loadConfiguration` decides it
    mockExistingConfig(twoNamesOneSlug);

    const configuration = await editConnection('docker-dev-2', {
      name: 'Docker-Dev',
      engine: DatabaseEngine.MySQL,
      host: 'localhost',
      user: 'root',
      port: 13308,
      password: 'password',
    });

    expect(Object.keys(configuration.connections)).toEqual([
      'docker-dev',
      'docker-dev-2',
    ]);
    expect(configuration.connections['docker-dev-2'].port).toBe(13308);
  });
});

describe('set panel size', () => {
  test('stores the size of a panel', async () => {
    mockExistsSync.mockReturnValue(false);

    await setPanelSize(PANEL.TABLE_LIST, '32.5%');

    expect(mockWriteFile).toHaveBeenCalledWith(
      'userData/config/config.json',
      JSON.stringify(
        {
          version: 1,
          theme: DEFAULT_THEME.name,
          locale: DEFAULT_LOCALE,
          connections: {},
          panelSizes: {
            [PANEL.TABLE_LIST]: '32.5%',
          },
        },
        null,
        2
      ),
      'utf-8',
      expect.any(Function)
    );
  });

  test('keeps the size of the other panels, and answers with the new config', async () => {
    mockExistsSync.mockReturnValue(false);

    await setPanelSize(PANEL.TABLE_LIST, '32.5%');
    const config = await setPanelSize(PANEL.SQL_EDITOR, '40%');

    const expected = {
      [PANEL.TABLE_LIST]: '32.5%',
      [PANEL.SQL_EDITOR]: '40%',
    };

    expect(config.panelSizes).toEqual(expected);
    expect(getConfiguration().panelSizes).toEqual(expected);
  });
});

describe('stored passwords', () => {
  afterEach(() => {
    vi.mocked(safeStorage.encryptStringAsync).mockImplementation(
      (plain: string) => Promise.resolve(Buffer.from(`encrypted-${plain}`))
    );
  });

  const STORED_CIPHERTEXT =
    Buffer.from('encrypted-password').toString('base64');

  /** a locked keyring: it hands out no key, so nothing can be encrypted */
  function mockLockedKeyring(): void {
    vi.mocked(safeStorage.encryptStringAsync).mockRejectedValue(
      new Error('OSCrypt is temporarily unavailable')
    );
  }

  /** the configuration as the first write left it on disk */
  function writtenConfig(): Configuration {
    const [, content] = vi.mocked(mockWriteFile).mock.calls[0];

    return JSON.parse(String(content)) as Configuration;
  }

  test('the configuration holds the ciphertext, and never decrypts it', () => {
    mockExistingConfig();

    expect(getConfiguration().connections.local.password).toBe(
      STORED_CIPHERTEXT
    );
    expect(safeStorage.decryptStringAsync).not.toHaveBeenCalled();
  });

  test('a locked keyring leaves the file exactly as it is', async () => {
    mockExistingConfig();
    mockLockedKeyring();

    // a window move, a theme change: writes that have nothing to do with a password
    await changeTheme('dracula');

    expect(dialog.showErrorBox).not.toHaveBeenCalled();
    expect(writtenConfig().theme).toBe('dracula');
    expect(writtenConfig().connections.local.password).toBe(STORED_CIPHERTEXT);
  });

  test('adding a connection is the write that needs to encrypt, and says so', async () => {
    mockExistsSync.mockReturnValue(false);
    mockLockedKeyring();

    await addConnectionToConfig({
      name: 'local',
      engine: DatabaseEngine.MySQL,
      host: 'localhost',
      user: 'root',
      port: 3306,
      password: 'password',
    });

    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(dialog.showErrorBox).toHaveBeenCalledWith(
      'config.encryption.unavailable.title',
      'config.encryption.unavailable.message'
    );
  });

  test('a refused write leaves nothing behind in memory', async () => {
    mockExistingConfig();
    mockLockedKeyring();

    await editConnection('local', {
      name: 'local',
      engine: DatabaseEngine.MySQL,
      host: 'somewhere-else',
      user: 'root',
      port: 3306,
      password: 'password',
    });

    expect(mockWriteFile).not.toHaveBeenCalled();

    // the edit was refused, so it must not ride along the next unrelated write
    expect(getConfiguration().connections.local.host).toBe('localhost');

    await changeTheme('dracula');

    expect(writtenConfig().connections.local.host).toBe('localhost');
  });

  test('an empty password field keeps the stored ciphertext', async () => {
    mockExistingConfig();
    // the electron mock is shared by the whole file and never reset
    vi.mocked(safeStorage.encryptStringAsync).mockClear();

    await editConnection('local', {
      name: 'local',
      engine: DatabaseEngine.MySQL,
      host: 'somewhere-else',
      user: 'root',
      port: 3306,
      password: '',
    });

    const written = writtenConfig().connections.local;

    expect(written.host).toBe('somewhere-else');
    expect(written.password).toBe(STORED_CIPHERTEXT);
    expect(safeStorage.encryptStringAsync).not.toHaveBeenCalled();
  });

  test('editing a connection keeps the app state it had', async () => {
    mockExistingConfig();
    await setActiveDatabase('local', 'some-database');
    vi.mocked(mockWriteFile).mockClear();

    await editConnection('local', {
      name: 'local',
      engine: DatabaseEngine.MySQL,
      host: 'somewhere-else',
      user: 'root',
      port: 3306,
      password: '',
    });

    // the form knows nothing of the app state, and must not drop it
    expect(writtenConfig().connections.local.appState?.activeDatabase).toBe(
      'some-database'
    );
  });

  test('a password typed again is the one that gets encrypted', async () => {
    mockExistingConfig();

    await editConnection('local', {
      name: 'local',
      engine: DatabaseEngine.MySQL,
      host: 'localhost',
      user: 'root',
      port: 3306,
      password: 'new-password',
    });

    expect(writtenConfig().connections.local.password).toBe(
      Buffer.from('encrypted-new-password').toString('base64')
    );
  });
});
