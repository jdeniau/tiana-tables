import { type ReactElement, useSyncExternalStore } from 'react';
import {
  PLATFORM_PACKAGES,
  Platform,
  detectPlatform,
  distributionPackage,
} from './platform';
import { PackageKind, type Release } from './release';
import { type SiteKey, useText } from './text';

const BUTTON_LABELS: Record<PackageKind, SiteKey> = {
  [PackageKind.Deb]: 'download.button.deb',
  [PackageKind.Rpm]: 'download.button.rpm',
  [PackageKind.MacArm]: 'download.button.macArm',
  [PackageKind.MacIntel]: 'download.button.macIntel',
  [PackageKind.WindowsSetup]: 'download.button.windowsSetup',
};

const NOTES: Record<Platform, SiteKey> = {
  [Platform.Linux]: 'download.note.linux',
  [Platform.MacOS]: 'download.note.macos',
  [Platform.Windows]: 'download.note.windows',
};

interface Detected {
  readonly platform: Platform;
  readonly packages: PackageKind[];
}

let detectedOnce: Detected | null | undefined;

function detect(): Detected | null {
  if (detectedOnce === undefined) {
    const { userAgent } = navigator;
    // userAgentData exists in Chromium only, and only over HTTPS
    const platformName =
      (navigator as { userAgentData?: { platform: string } }).userAgentData
        ?.platform ?? navigator.platform;
    const platform = detectPlatform(platformName, userAgent);
    const preferred = distributionPackage(userAgent);
    detectedOnce = platform && {
      platform,
      packages: [...PLATFORM_PACKAGES[platform]].sort(
        (a, b) => Number(b === preferred) - Number(a === preferred)
      ),
    };
  }
  return detectedOnce;
}

const neverChanges = (): (() => void) => () => {};

/** The platform the visitor is on, known only in the browser: null in the page rendered at build. */
export function useDetectedPlatform(): Detected | null {
  return useSyncExternalStore(neverChanges, detect, () => null);
}

/** The download button of the hero: the installers of the visitor's platform, side by side. */
export function DownloadPick({ release }: { release: Release }): ReactElement {
  const { site } = useText();
  const detected = useDetectedPlatform();

  if (!detected) {
    return (
      <a className="action" href="#download">
        {site('hero.download')}
      </a>
    );
  }

  return (
    <div className="download-pick">
      <div className="joined">
        {detected.packages.map((kind) => (
          <a key={kind} className="action" href={release.files[kind].url}>
            {site(BUTTON_LABELS[kind])}
          </a>
        ))}
      </div>
      <p className="caption">
        {site(NOTES[detected.platform])} ·{' '}
        <a href="#download">{site('hero.other')}</a>
      </p>
    </div>
  );
}
