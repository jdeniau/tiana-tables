// Imported from https://github.com/mawie81/electron-window-state
// without the part that saves the window state to a file

import {
  BrowserWindow,
  BrowserWindowConstructorOptions,
  screen,
} from 'electron';

const EVENT_HANDLING_DELAY = 100;

const DEFAULT_STATE: WindowState = {
  width: 1024,
  height: 768,
  x: undefined,
  y: undefined,
};

export type WindowState = {
  width: number;
  height: number;
  x: number | undefined;
  y: number | undefined;
  displayBounds?: boolean | undefined;
  isMaximized?: boolean | undefined;
  isFullScreen?: boolean | undefined;
};

type SaveWindowStateFunction = (state: WindowState) => void;

export default class WindowStateKeeper {
  #initialState: WindowState;
  #state: WindowState;
  #winRef: BrowserWindow | undefined;
  #stateChangeTimer: NodeJS.Timeout | undefined;

  #saveWindowState: SaveWindowStateFunction;

  constructor(
    initialState: WindowState = DEFAULT_STATE,
    saveWindowState: SaveWindowStateFunction
  ) {
    this.#initialState = initialState;
    this.#state = { ...initialState };

    this.#saveWindowState = saveWindowState;

    // Check state validity
    this.validateState();

    this.stateChangeHandler = this.stateChangeHandler.bind(this);
    this.closeHandler = this.closeHandler.bind(this);
    this.closedHandler = this.closedHandler.bind(this);
  }

  //   const config = {
  //     maximize: true,
  //     fullScreen: true,
  //     ...options,
  //   };

  isNormal(win: BrowserWindow): boolean {
    return !win.isMaximized() && !win.isMinimized() && !win.isFullScreen();
  }

  hasBounds() {
    return (
      Number.isInteger(this.#state.x) &&
      Number.isInteger(this.#state.y) &&
      Number.isInteger(this.#state.width) &&
      this.#state.width > 0 &&
      Number.isInteger(this.#state.height) &&
      this.#state.height > 0
    );
  }

  resetStateToDefault() {
    const displayBounds = !!screen.getPrimaryDisplay().bounds;

    // Reset this.state to default values on the primary display
    this.#state = {
      ...this.#initialState,
      displayBounds,
    };
  }

  windowWithinBounds(bounds: Electron.Rectangle): boolean {
    const { x, y, width, height } = this.#state;

    return (
      (x ?? 0) >= bounds.x &&
      (y ?? 0) >= bounds.y &&
      (x ?? 0) + width <= bounds.x + bounds.width &&
      (y ?? 0) + height <= bounds.y + bounds.height
    );
  }

  ensureWindowVisibleOnSomeDisplay(): void {
    const visible = screen.getAllDisplays().some((display) => {
      return this.windowWithinBounds(display.bounds);
    });

    if (!visible) {
      // Window is partially or fully not visible now.
      // Reset it to safe defaults.
      return this.resetStateToDefault();
    }
  }

  validateState(): void {
    const isValid =
      this.hasBounds() || this.#state.isMaximized || this.#state.isFullScreen;

    if (!isValid) {
      this.#state = DEFAULT_STATE;

      return;
    }

    if (this.hasBounds() && this.#state.displayBounds) {
      this.ensureWindowVisibleOnSomeDisplay();
    }
  }

  updateState(win: BrowserWindow | undefined = this.#winRef): void {
    if (!win) {
      return;
    }

    // Don't throw an error when window was closed
    try {
      const winBounds = win.getBounds();
      if (this.isNormal(win)) {
        this.#state.x = winBounds.x;
        this.#state.y = winBounds.y;
        this.#state.width = winBounds.width;
        this.#state.height = winBounds.height;
      }
      this.#state.isMaximized = win.isMaximized();
      this.#state.isFullScreen = win.isFullScreen();
      this.#state.displayBounds = !!screen.getDisplayMatching(winBounds).bounds;
    } catch (err) {
      // Don't care
    }
  }

  saveState(/* win?: BrowserWindow */): void {
    // Update window this.state only if it was provided
    // if (win) {
    //   this.updateState(win);
    // }

    // Save this.state
    this.#saveWindowState(this.#state);
    // try {
    //   mkdirp.sync(path.dirname(fullStoreFileName));
    //   jsonfile.writeFileSync(fullStoreFileName, this.state);
    // } catch (err) {
    //   // Don't care
    // }
  }

  stateChangeHandler(): void {
    // Handles both 'resize' and 'move'
    if (this.#stateChangeTimer) {
      clearTimeout(this.#stateChangeTimer);
      this.#stateChangeTimer = setTimeout(
        this.updateState,
        EVENT_HANDLING_DELAY
      );
    }
  }

  closeHandler(): void {
    this.updateState();
  }

  closedHandler(): void {
    // Unregister listeners and save this.state
    this.unmanage();
    this.saveState();
  }

  manage(win: BrowserWindow): void {
    if (this.#initialState.isMaximized && this.#state.isMaximized) {
      win.maximize();
    }
    if (this.#initialState.isFullScreen && this.#state.isFullScreen) {
      win.setFullScreen(true);
    }
    win.on('resize', this.stateChangeHandler);
    win.on('move', this.stateChangeHandler);
    win.on('close', this.closeHandler);
    win.on('closed', this.closedHandler);
    this.#winRef = win;
  }

  unmanage(): void {
    if (!this.#winRef) {
      return;
    }

    this.#winRef.removeListener('resize', this.stateChangeHandler);
    this.#winRef.removeListener('move', this.stateChangeHandler);
    clearTimeout(this.#stateChangeTimer);
    this.#winRef.removeListener('close', this.closeHandler);
    this.#winRef.removeListener('closed', this.closedHandler);
    this.#winRef = undefined;
  }

  createBrowserWindow(
    options?: BrowserWindowConstructorOptions
  ): BrowserWindow {
    const window = new BrowserWindow({
      width: this.width,
      height: this.height,
      x: this.x,
      y: this.y,
      ...options,
    });

    this.manage(window);

    return window;
  }

  get x() {
    return this.#state.x;
  }

  get y() {
    return this.#state.y;
  }

  get width() {
    return this.#state.width;
  }

  get height() {
    return this.#state.height;
  }

  // get displayBounds() {
  //   return this.state.displayBounds;
  // },
  // get isMaximized() {
  //   return this.#state.isMaximized;
  // }

  // get isFullScreen() {
  //   return this.#state.isFullScreen;
  // }

  //   // this.saveState,
  //   // this.unmanage,
  //   manage,
  //   // this.resetStateToDefault,
}
