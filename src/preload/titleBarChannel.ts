export enum TITLE_BAR_CHANNEL {
  SET_COLORS = 'title-bar:set-colors',
  OPEN_MENU = 'title-bar:open-menu',
}

export type TitleBarColors = {
  /** the fill behind the window controls */
  color: string;
  /** the minimise, maximise and close symbols */
  symbolColor: string;
};

/** where the menu opens, in CSS pixels from the top left of the page */
export type MenuAnchor = { x: number; y: number };
