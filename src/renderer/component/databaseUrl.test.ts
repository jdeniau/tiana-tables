import { describe, expect, test } from 'vitest';
import { Configuration, DatabaseConfig } from '../../configuration/type';
import { databaseUrl } from './databaseUrl';

function configurationWith(databaseConfig: DatabaseConfig): Configuration {
  return {
    connections: {
      local: { appState: { configByDatabase: { app: databaseConfig } } },
    },
  } as unknown as Configuration;
}

describe('databaseUrl', () => {
  test('reopens the SQL page the database was left on', () => {
    expect(
      databaseUrl(
        configurationWith({
          activeTable: 'users',
          activePathKey: 'Sql',
          tables: {},
        }),
        'local',
        'app'
      )
    ).toBe('/connections/local/app/sql');
  });

  test('fills the page of a table with the last table', () => {
    expect(
      databaseUrl(
        configurationWith({
          activeTable: 'users',
          activePathKey: 'TableStructure',
          tables: {},
        }),
        'local',
        'app'
      )
    ).toBe('/connections/local/app/tables/users/structure');
  });

  test('opens the database itself when the page needs a table it has not', () => {
    expect(
      databaseUrl(
        configurationWith({
          activeTable: '',
          activePathKey: 'TableStructure',
          tables: {},
        }),
        'local',
        'app'
      )
    ).toBe('/connections/local/app');
  });

  test.each([
    ['no key', undefined],
    ['a key no page has', 'Erd'],
  ])('reopens the last table with %s', (_, activePathKey) => {
    expect(
      databaseUrl(
        configurationWith({ activeTable: 'users', activePathKey, tables: {} }),
        'local',
        'app'
      )
    ).toBe('/connections/local/app/tables/users');
  });

  test('opens a database never visited on itself', () => {
    expect(
      databaseUrl(configurationWith({} as DatabaseConfig), 'local', 'other')
    ).toBe('/connections/local/other');
  });
});
