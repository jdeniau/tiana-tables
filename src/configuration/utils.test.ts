import { describe, expect, test } from 'vitest';
import { slugify, uniqueSlug } from './utils';

describe('slugify', () => {
  test('simple', () => {
    expect(slugify('foo')).toBe('foo');
    expect(slugify('foo bar')).toBe('foo-bar');
    expect(slugify('Foo Bar')).toBe('foo-bar');
    expect(slugify('Foo Bar ')).toBe('foo-bar');
    expect(slugify('   Foo      Bar ')).toBe('foo-bar');
  });

  test('emojis and special characters', () => {
    expect(slugify('rocket ! 🚀')).toBe('rocket');
  });
});

describe('uniqueSlug', () => {
  test('the slug of the name while it is free', () => {
    expect(uniqueSlug('docker (dev)', [])).toBe('docker-dev');
    expect(uniqueSlug('docker (dev)', ['local', 'prod'])).toBe('docker-dev');
  });

  test('suffixed when another connection holds it', () => {
    expect(uniqueSlug('Docker-Dev', ['docker-dev'])).toBe('docker-dev-2');
    expect(uniqueSlug('Docker-Dev', ['docker-dev', 'docker-dev-2'])).toBe(
      'docker-dev-3'
    );
  });

  test('fills a suffix a deleted connection left free', () => {
    expect(uniqueSlug('Docker-Dev', ['docker-dev', 'docker-dev-3'])).toBe(
      'docker-dev-2'
    );
  });
});
