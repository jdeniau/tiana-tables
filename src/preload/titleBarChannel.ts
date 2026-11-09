export enum TITLE_BAR_CHANNEL {
  SET_COLORS = 'title-bar:set-colors',
  GET_MENU = 'title-bar:get-menu',
  CLICK_MENU_ITEM = 'title-bar:click-menu-item',
}

export type TitleBarColors = {
  /** the title bar's fill: base00, or the current connection's colour */
  color: string;
  /** its text: base05, or base07 / base00 on a tinted bar */
  symbolColor: string;
};

/** the indexes leading to an item of the application menu, from its top level */
export type MenuItemPath = Array<number>;

export enum AppMenuItemKind {
  Action = 'action',
  Submenu = 'submenu',
  Separator = 'separator',
}

/** an item of the application menu, as the renderer draws it */
export type AppMenuItem =
  | { kind: AppMenuItemKind.Separator }
  | {
      kind: AppMenuItemKind.Submenu;
      path: MenuItemPath;
      label: string;
      enabled: boolean;
      items: Array<AppMenuItem>;
    }
  | {
      kind: AppMenuItemKind.Action;
      path: MenuItemPath;
      label: string;
      /** as Electron writes it: `CommandOrControl+Plus` */
      accelerator: string | null;
      enabled: boolean;
      /** only on a checkbox or radio item */
      checked?: boolean;
    };
