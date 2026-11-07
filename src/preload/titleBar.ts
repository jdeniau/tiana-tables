import { bindChannel } from './bindChannel';
import {
  AppMenuItem,
  MenuItemPath,
  TITLE_BAR_CHANNEL,
  TitleBarColors,
} from './titleBarChannel';

interface TitleBar {
  setColors(colors: TitleBarColors): Promise<void>;
  getMenu(): Promise<Array<AppMenuItem>>;
  clickMenuItem(path: MenuItemPath): Promise<void>;
}

export const titleBar: TitleBar = {
  setColors: bindChannel(TITLE_BAR_CHANNEL.SET_COLORS),
  getMenu: bindChannel(TITLE_BAR_CHANNEL.GET_MENU),
  clickMenuItem: bindChannel(TITLE_BAR_CHANNEL.CLICK_MENU_ITEM),
};
