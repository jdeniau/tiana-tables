export enum TITLE_BAR_CHANNEL {
  SET_COLORS = 'title-bar:set-colors',
  OPEN_MENU = 'title-bar:open-menu',
}

export type TitleBarColors = {
  /** the title bar's fill: base00, or the current connection's colour */
  color: string;
  /** its text: base05, or base07 / base00 on a tinted bar */
  symbolColor: string;
};

/** where the menu opens, in CSS pixels from the top left of the page */
export type MenuAnchor = { x: number; y: number };
