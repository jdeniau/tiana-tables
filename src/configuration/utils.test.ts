import { describe, expect, test } from 'vitest';
import { slugify } from './utils';

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
