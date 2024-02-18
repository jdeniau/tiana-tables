import { afterEach, describe, expect, test, vi } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFile } from 'node:fs';
import envPaths from 'env-paths';
import { addConnectionToConfig, readConfigurationFile } from './configuration';

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

    expect(readConfigurationFile()).toBe(null);
  });

  test('existing file but empty', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('');

    expect(readConfigurationFile()).toBe(null);
  });

  test('existing file without connexion key', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('{}');

    expect(readConfigurationFile()).toStrictEqual({
      connections: {},
    });
  });

  test('existing file without connexion', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('{ "version": 1, "connections": {}}');

    expect(readConfigurationFile()).toStrictEqual({
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

    expect(readConfigurationFile()).toStrictEqual({
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
    await addConnectionToConfig({} as any, 'local', {
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

    await addConnectionToConfig({} as any, 'test', {
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
