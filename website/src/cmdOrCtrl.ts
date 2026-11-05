import { useDetectedPlatform } from './DownloadPick';
import { Platform } from './platform';

/** The modifier the app writes before a shortcut's key on the visitor's platform: `ctrl+` until the page knows it. */
export function useCmdOrCtrl(): string {
  return useDetectedPlatform()?.platform === Platform.MacOS ? '⌘' : 'ctrl+';
}
