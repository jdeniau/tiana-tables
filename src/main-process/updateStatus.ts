import type { InstallSourceKind } from './installSource';

export enum UpdateStep {
  /** a newer release, to download by hand from its GitHub page */
  Download = 'download',
  /** downloaded by the auto-updater, installed on restart */
  Restart = 'restart',
}

/** What the title bar tells about the next version. No Electron import: the renderer reads the enum. */
export type UpdateStatus =
  | { available: false }
  | {
      available: true;
      step: UpdateStep.Download;
      version: string;
      installSource: InstallSourceKind;
      releaseUrl: string;
    }
  | { available: true; step: UpdateStep.Restart };
