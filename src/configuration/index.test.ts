import { existsSync, readFileSync, writeFile } from 'node:fs';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DEFAULT_LOCALE } from './locale';
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

vi.mock('electron', () => ({
  safeStorage: {
    encryptString: vi.fn((s: string) => Buffer.from(`encrypted-${s}`)),
    decryptString: vi.fn((b: Buffer) => b.toString().substring(10)),
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
      local: {
        name: 'local',
        host: 'localhost',
        user: 'root',
        port: 3306,
        password: Buffer.from('encrypted-password').toString('base64'),
        slug: 'local',
      },
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

  test('existing file with connexions', () => {
    mockExistingConfig();

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
          password: 'password',
          slug: 'local',
        },
        prod: {
          name: 'prod',
          host: 'prod',
          user: 'root',
          port: 3306,
          password: 'password',
          slug: 'prod',
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
            },
            prod: {
              name: 'prod',
              host: 'prod',
              user: 'root',
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
            },
            test: {
              name: 'test',
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
            },
            prod: {
              name: 'prod',
              host: 'prod',
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
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
        local: {
          name: 'local',
          host: 'localhost',
          user: 'root',
          port: 3306,
          password: Buffer.from('encrypted-password').toString('base64'),
          slug: 'local',
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
            activeTableByDatabase: {},
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
                activeTableByDatabase: {},
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
                activeTableByDatabase: {
                  db: 'table',
                  db2: 'table2',
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
});

describe('edit', () => {
  test('edit connexion', () => {
    mockExistingConfig();

    const configuration = editConnection('prod', {
      name: 'prod',
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
            },
            prod: {
              name: 'prod',
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

  test('rename connexion', () => {
    mockExistingConfig();

    const configuration = editConnection('local', {
      name: 'my new local connection',
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
            },
            'my-new-local-connection': {
              name: 'my new local connection',
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
});
