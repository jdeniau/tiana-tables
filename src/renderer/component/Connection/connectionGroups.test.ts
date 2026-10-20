import { describe, expect, test } from 'vitest';
import { EncryptedConnectionObject } from '../../../configuration/type';
import { DatabaseEngine } from '../../../sql/engine';
import { groupConnections, groupNames } from './connectionGroups';

function connection(slug: string, group?: string): EncryptedConnectionObject {
  return {
    name: slug,
    slug,
    engine: DatabaseEngine.MySQL,
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    group,
  };
}

const slugs = (connections: EncryptedConnectionObject[]): string[] =>
  connections.map(({ slug }) => slug);

describe('groupConnections', () => {
  test('lists the ungrouped connections apart, and the groups by name', () => {
    const { ungrouped, groups } = groupConnections([
      connection('b-prod', 'Client B'),
      connection('local'),
      connection('a-staging', 'Client A'),
      connection('a-prod', 'Client A'),
      connection('docker'),
    ]);

    expect(slugs(ungrouped)).toEqual(['local', 'docker']);
    expect(
      groups.map(({ name, connections }) => [name, slugs(connections)])
    ).toEqual([
      ['Client A', ['a-staging', 'a-prod']],
      ['Client B', ['b-prod']],
    ]);
  });

  test('an empty group is no group', () => {
    const { ungrouped, groups } = groupConnections([connection('local', '')]);

    expect(slugs(ungrouped)).toEqual(['local']);
    expect(groups).toEqual([]);
  });
});

describe('groupNames', () => {
  test('names each group once, sorted', () => {
    expect(
      groupNames([
        connection('b', 'Client B'),
        connection('a1', 'Client A'),
        connection('local'),
        connection('a2', 'Client A'),
      ])
    ).toEqual(['Client A', 'Client B']);
  });
});
