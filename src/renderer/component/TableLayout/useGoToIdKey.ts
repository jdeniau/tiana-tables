import { useEffect } from 'react';

/** Ctrl+G on every platform, VS Code's "Go to line". */
function isGoToIdKey(event: KeyboardEvent): boolean {
  return (
    event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === 'g'
  );
}

/**
 * Calls `onPress` on Ctrl+G, wherever the focus is on the page but in a dialog.
 *
 * Listened to on `window` in the capture phase, which runs before the listener
 * Monaco puts on its own node: the `WHERE` editor never sees the key.
 */
export function useGoToIdKey(enabled: boolean, onPress: () => void): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (
        !isGoToIdKey(event) ||
        (event.target instanceof Element &&
          event.target.closest('[role="dialog"]'))
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onPress();
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });

    return () =>
      window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [enabled, onPress]);
}
