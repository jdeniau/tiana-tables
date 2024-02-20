import { afterEach, describe, expect, test, vi } from 'vitest';
import { existsSync, readFileSync, writeFile } from 'node:fs';
import {
  addConnectionToConfig,
  getConfiguration,
  changeTheme,
  testables,
} from '.';

const { getBaseConfig } = testables;

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

vi.mock('electron', () => ({
  safeStorage: {
    encryptString: vi.fn((s: string) => Buffer.from(`encrypted-${s}`)),
    decryptString: vi.fn((b: Buffer) => b.toString().substring(10)),
  },
}));

describe('read configuration from file', () => {
  afterEach(() => {
    vi.resetModules();
  });

  test('empty file', () => {
    mockExistsSync.mockReturnValue(false);

    expect(getConfiguration()).toStrictEqual(getBaseConfig());
  });

  test('existing file but empty', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('');

    expect(getConfiguration()).toStrictEqual(getBaseConfig());
  });

  test('existing file without connexion key', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('{}');

    expect(getConfiguration()).toStrictEqual({
      connections: {},
    });
  });

  test('existing file without connexion', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('{ "version": 1, "connections": {}}');

    expect(getConfiguration()).toStrictEqual({
      version: 1,
      connections: {},
    });
  });

  test('existing file with connexions', () => {
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

    expect(getConfiguration()).toStrictEqual({
      version: 1,
      connections: {
        local: {
          name: 'local',
          host: 'localhost',
          port: 3306,
          password: 'password',
        },
        prod: {
          name: 'prod',
          host: 'prod',
          port: 3306,
          password: 'password',
        },
      },
    });
  });
});

describe('add connection to config', () => {
  afterEach(() => {
    vi.resetModules();
  });

  test('empty file', async () => {
    mockExistsSync.mockReturnValue(false);
    await addConnectionToConfig({
      name: 'local',
      host: 'localhost',
      port: 3306,
      user: 'root',
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
              port: 3306,
              password: Buffer.from('encrypted-password').toString('base64'),
            },
            prod: {
              name: 'prod',
              host: 'prod',
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
  });
});

describe('set theme', () => {
  afterEach(() => {
    vi.resetModules();
  });

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
});
