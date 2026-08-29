import { describe, expect, test } from 'vitest';
import { isNewerVersion, parseVersion } from './updateCheck';

describe('parseVersion', () => {
  test('accepts a tag with or without its v prefix', () => {
    expect(parseVersion('v1.2.3')).toEqual({
      parts: [1, 2, 3],
      prerelease: null,
    });
    expect(parseVersion('1.2.3')).toEqual({
      parts: [1, 2, 3],
      prerelease: null,
    });
  });

  test('keeps the prerelease apart instead of dropping it', () => {
    expect(parseVersion('1.2.3-beta.1')).toEqual({
      parts: [1, 2, 3],
      prerelease: 'beta.1',
    });
    expect(parseVersion('v2.0.0-alpha')).toEqual({
      parts: [2, 0, 0],
      prerelease: 'alpha',
    });
  });

  test('ignores build metadata, which carries no ordering', () => {
    expect(parseVersion('1.2.3+20260829')).toEqual({
      parts: [1, 2, 3],
      prerelease: null,
    });
  });

  test('refuses anything it cannot read exactly', () => {
    expect(parseVersion('1.2')).toBeNull();
    expect(parseVersion('nightly')).toBeNull();
    expect(parseVersion('')).toBeNull();
    // the anchors matter: this must not be read as a plain 1.2.3
    expect(parseVersion('1.2.3junk')).toBeNull();
    expect(parseVersion('1.2.3 (build 7)')).toBeNull();
  });
});

describe('isNewerVersion', () => {
  test('detects a newer version on each part', () => {
    expect(isNewerVersion('2.0.0', '1.9.9')).toBe(true);
    expect(isNewerVersion('1.3.0', '1.2.9')).toBe(true);
    expect(isNewerVersion('1.2.4', '1.2.3')).toBe(true);
  });

  test('the same version is not newer', () => {
    expect(isNewerVersion('1.2.3', '1.2.3')).toBe(false);
    expect(isNewerVersion('v1.2.3', '1.2.3')).toBe(false);
  });

  test('an older version is never newer', () => {
    expect(isNewerVersion('1.2.3', '2.0.0')).toBe(false);
    expect(isNewerVersion('1.2.3', '1.3.0')).toBe(false);
  });

  test('a later part never overrides an earlier loss', () => {
    // the classic hand-rolled comparator bug
    expect(isNewerVersion('1.0.5', '1.2.0')).toBe(false);
    expect(isNewerVersion('0.9.99', '1.0.0')).toBe(false);
  });

  test('numbers are compared as numbers, not as strings', () => {
    expect(isNewerVersion('1.10.0', '1.9.0')).toBe(true);
    expect(isNewerVersion('1.9.0', '1.10.0')).toBe(false);
  });

  test('an unreadable version means no update rather than a guess', () => {
    expect(isNewerVersion('nightly', '1.2.3')).toBe(false);
    expect(isNewerVersion('2.0.0', 'not-a-version')).toBe(false);
  });
});

describe('isNewerVersion with prereleases', () => {
  test('a release supersedes its own prerelease', () => {
    expect(isNewerVersion('1.2.3', '1.2.3-beta.1')).toBe(true);
    expect(isNewerVersion('1.2.3', '1.2.3-rc.2')).toBe(true);
  });

  test('a prerelease of the same version is not an update', () => {
    expect(isNewerVersion('1.2.3-beta.1', '1.2.3')).toBe(false);
  });

  test('the numbers still decide first', () => {
    expect(isNewerVersion('1.3.0', '1.3.0-beta.1')).toBe(true);
    expect(isNewerVersion('1.2.9', '1.3.0-beta.1')).toBe(false);
    expect(isNewerVersion('2.0.0', '1.9.9-beta.1')).toBe(true);
  });

  test('two prereleases are never ordered', () => {
    // cannot happen through /releases/latest, and guessing would be worse
    expect(isNewerVersion('1.2.3-beta.2', '1.2.3-beta.1')).toBe(false);
  });
});
