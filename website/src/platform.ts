import { PackageKind } from './release';

export enum Platform {
  Linux = 'linux',
  MacOS = 'macos',
  Windows = 'windows',
}

/** The desktop system a browser runs on, or null on a phone, a tablet or an unknown one. */
export function detectPlatform(
  platform: string,
  userAgent: string
): Platform | null {
  if (/android|iphone|ipad/i.test(userAgent)) {
    return null;
  }
  if (/mac/i.test(platform)) {
    return Platform.MacOS;
  }
  if (/win/i.test(platform)) {
    return Platform.Windows;
  }
  if (/linux|x11/i.test(platform)) {
    return Platform.Linux;
  }
  return null;
}

/** The package of the distribution a user agent names: browsers rarely name one. */
export function distributionPackage(userAgent: string): PackageKind | null {
  if (/ubuntu|debian|mint/i.test(userAgent)) {
    return PackageKind.Deb;
  }
  if (/fedora|red hat|opensuse|suse/i.test(userAgent)) {
    return PackageKind.Rpm;
  }
  return null;
}

/** The installers of each platform, in the order the page offers them. */
export const PLATFORM_PACKAGES: Record<Platform, PackageKind[]> = {
  [Platform.Linux]: [PackageKind.Deb, PackageKind.Rpm],
  [Platform.MacOS]: [PackageKind.MacArm, PackageKind.MacIntel],
  [Platform.Windows]: [PackageKind.WindowsSetup],
};
