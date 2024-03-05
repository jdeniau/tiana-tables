import { existsSync, readFileSync, writeFile } from 'node:fs';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DEFAULT_THEME } from './themes';
import { Configuration } from './type';
import {
  addConnectionToConfig,
  changeTheme,
  editConnection,
  getConfiguration,
  testables,
  updateConnectionState,
} from '.';

const { getBaseConfig, resetConfiguration } = testables;

vi.mock('env-paths', () => ({
  default: () => ({ config: 'config' }),
}));

vi.mock('node:path', () => ({
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
}));

function mockExistingConfig(
  config: Configuration = {
    version: 1,
    theme: DEFAULT_THEME.name,
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
      connections: {
        local: {
          name: 'local',
          host: 'localhost',
          user: 'root',
          port: 3306,
          password: 'password',
        },
        prod: {
          name: 'prod',
          host: 'prod',
          user: 'root',
          port: 3306,
          password: 'password',
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
      'config/config.json',
      JSON.stringify(
        {
          version: 1,
          theme: 'Dracula',
          connections: {
            local: {
              name: 'local',
              host: 'localhost',
              user: 'root',
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
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
      'config/config.json',
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
      'config/config.json',
      JSON.stringify(
        {
          version: 1,
          theme: 'test',
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
      'config/config.json',
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

describe('set connection appState', async () => {
  test('empty file', async () => {
    mockExistsSync.mockReturnValue(false);

    await updateConnectionState('test', 'isActive', true);

    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  test('existing file, non-existing connection', async () => {
    mockExistingConfig();

    await updateConnectionState('inexistant', 'isActive', true);

    expect(mockWriteFile).not.toHaveBeenCalled();

    expect(mockReadFileSync).toHaveBeenCalledOnce();
  });

  test('existing file, set active', async () => {
    mockExistingConfig();

    await updateConnectionState('prod', 'isActive', true);

    expect(mockWriteFile).toHaveBeenCalledWith(
      'config/config.json',
      JSON.stringify(
        {
          version: 1,
          theme: DEFAULT_THEME.name,
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
              appState: {
                isActive: true,
                activeDatabase: '',
                openedTable: '',
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

  test('existing file, set activeDatabase', async () => {
    mockExistingConfig({
      version: 1,
      theme: DEFAULT_THEME.name,
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
          appState: {
            isActive: true,
            activeDatabase: '',
            openedTable: '',
          },
        },
      },
    });

    await updateConnectionState('prod', 'activeDatabase', 'test');

    expect(mockWriteFile).toHaveBeenCalledWith(
      'config/config.json',
      JSON.stringify(
        {
          version: 1,
          theme: DEFAULT_THEME.name,
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
              appState: {
                isActive: true,
                activeDatabase: 'test',
                openedTable: '',
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
      'config/config.json',
      JSON.stringify(
        {
          version: 1,
          theme: DEFAULT_THEME.name,
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
              host: 'prod2',
              user: 'root2',
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
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
      name: 'local2',
      host: 'local2',
      user: 'root2',
      port: 3306,
      password: 'password',
    });

    expect(configuration.connections.local).toBeUndefined();
    expect(configuration.connections.local2.host).toBe('local2');

    expect(mockWriteFile).toHaveBeenCalledWith(
      'config/config.json',
      JSON.stringify(
        {
          version: 1,
          theme: DEFAULT_THEME.name,
          connections: {
            prod: {
              name: 'prod',
              host: 'prod',
              user: 'root',
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
            },
            local2: {
              name: 'local2',
              host: 'local2',
              user: 'root2',
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
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
