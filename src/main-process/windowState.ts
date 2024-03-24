// Imported from https://github.com/mawie81/electron-window-state
// without the part that saves the window state to a file

import { BrowserWindow, screen } from 'electron';
import { saveWindowState } from '../configuration';

export type WindowState = {
  width: number;
  height: number;
  x: number | undefined;
  y: number | undefined;
  displayBounds?: boolean | undefined;
  isMaximized?: boolean | undefined;
  isFullScreen?: boolean | undefined;
};

export default function windowStateKeeper(initialState: WindowState) {
  let state = { ...initialState };
  let winRef: BrowserWindow | undefined;
  let stateChangeTimer: NodeJS.Timeout;

  const eventHandlingDelay = 100;
  //   const config = {
  //     maximize: true,
  //     fullScreen: true,
  //     ...options,
  //   };

  function isNormal(win: BrowserWindow): boolean {
    return !win.isMaximized() && !win.isMinimized() && !win.isFullScreen();
  }

  function hasBounds() {
    return (
      state &&
      Number.isInteger(state.x) &&
      Number.isInteger(state.y) &&
      Number.isInteger(state.width) &&
      state.width > 0 &&
      Number.isInteger(state.height) &&
      state.height > 0
    );
  }

  function resetStateToDefault() {
    const displayBounds = !!screen.getPrimaryDisplay().bounds;

    // Reset state to default values on the primary display
    state = {
      ...initialState,
      displayBounds,
    };
  }

  function windowWithinBounds(bounds: Electron.Rectangle): boolean {
    return (
      state.x >= bounds.x &&
      state.y >= bounds.y &&
      state.x + state.width <= bounds.x + bounds.width &&
      state.y + state.height <= bounds.y + bounds.height
    );
  }

  function ensureWindowVisibleOnSomeDisplay(): void {
    const visible = screen.getAllDisplays().some((display) => {
      return windowWithinBounds(display.bounds);
    });

    if (!visible) {
      // Window is partially or fully not visible now.
      // Reset it to safe defaults.
      return resetStateToDefault();
    }
  }

  function validateState(): void {
    const isValid =
      state && (hasBounds() || state.isMaximized || state.isFullScreen);

    if (!isValid) {
      state = undefined;
      return;
    }

    if (hasBounds() && state.displayBounds) {
      ensureWindowVisibleOnSomeDisplay();
    }
  }

  function updateState(win: BrowserWindow | undefined = winRef) {
    if (!win) {
      return;
    }

    // Don't throw an error when window was closed
    try {
      const winBounds = win.getBounds();
      if (isNormal(win)) {
        state.x = winBounds.x;
        state.y = winBounds.y;
        state.width = winBounds.width;
        state.height = winBounds.height;
      }
      state.isMaximized = win.isMaximized();
      state.isFullScreen = win.isFullScreen();
      state.displayBounds = !!screen.getDisplayMatching(winBounds).bounds;
    } catch (err) {
      // Don't care
    }
  }

  function saveState(/* win?: BrowserWindow */) {
    // Update window state only if it was provided
    // if (win) {
    //   updateState(win);
    // }

    // Save state
    saveWindowState(state);
    // try {
    //   mkdirp.sync(path.dirname(fullStoreFileName));
    //   jsonfile.writeFileSync(fullStoreFileName, state);
    // } catch (err) {
    //   // Don't care
    // }
  }

  function stateChangeHandler() {
    // Handles both 'resize' and 'move'
    clearTimeout(stateChangeTimer);
    stateChangeTimer = setTimeout(updateState, eventHandlingDelay);
  }

  function closeHandler() {
    updateState();
  }

  function closedHandler() {
    // Unregister listeners and save state
    unmanage();
    saveState();
  }

  function manage(win: BrowserWindow): void {
    if (initialState.isMaximized && state.isMaximized) {
      win.maximize();
    }
    if (initialState.isFullScreen && state.isFullScreen) {
      win.setFullScreen(true);
    }
    win.on('resize', stateChangeHandler);
    win.on('move', stateChangeHandler);
    win.on('close', closeHandler);
    win.on('closed', closedHandler);
    winRef = win;
  }

  function unmanage() {
    if (winRef) {
      winRef.removeListener('resize', stateChangeHandler);
      winRef.removeListener('move', stateChangeHandler);
      clearTimeout(stateChangeTimer);
      winRef.removeListener('close', closeHandler);
      winRef.removeListener('closed', closedHandler);
      winRef = undefined;
    }
  }

  // Check state validity
  validateState();

  return {
    get x() {
      return state.x;
    },
    get y() {
      return state.y;
    },
    get width() {
      return state.width;
    },
    get height() {
      return state.height;
    },
    // get displayBounds() {
    //   return state.displayBounds;
    // },
    get isMaximized() {
      return state.isMaximized;
    },
    get isFullScreen() {
      return state.isFullScreen;
    },
    // saveState,
    // unmanage,
    manage,
    // resetStateToDefault,
  };
}
