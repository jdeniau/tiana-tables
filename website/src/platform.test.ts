import { describe, expect, it } from 'vitest';
import { Platform, detectPlatform, distributionPackage } from './platform';
import { PackageKind } from './release';

describe('detectPlatform', () => {
  it.each([
    ['Win32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', Platform.Windows],
    [
      'MacIntel',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      Platform.MacOS,
    ],
    [
      'macOS',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      Platform.MacOS,
    ],
    ['Linux x86_64', 'Mozilla/5.0 (X11; Linux x86_64)', Platform.Linux],
  ])('reads %s as a desktop system', (platform, userAgent, expected) => {
    expect(detectPlatform(platform, userAgent)).toBe(expected);
  });

  it('offers no installer to a phone, whose platform says Linux', () => {
    expect(
      detectPlatform('Linux armv81', 'Mozilla/5.0 (Linux; Android 14; Pixel 8)')
    ).toBeNull();
  });
});

describe('distributionPackage', () => {
  it.each([
    [
      'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
      PackageKind.Deb,
    ],
    [
      'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
      PackageKind.Rpm,
    ],
    [
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
      null,
    ],
  ])('reads the distribution of %s', (userAgent, expected) => {
    expect(distributionPackage(userAgent)).toBe(expected);
  });
});
