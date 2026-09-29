import { bindChannel } from './bindChannel';
import {
  MenuAnchor,
  TITLE_BAR_CHANNEL,
  TitleBarColors,
} from './titleBarChannel';

interface TitleBar {
  setColors(colors: TitleBarColors): Promise<void>;
  openMenu(anchor: MenuAnchor): Promise<void>;
}

export const titleBar: TitleBar = {
  setColors: bindChannel(TITLE_BAR_CHANNEL.SET_COLORS),
  openMenu: bindChannel(TITLE_BAR_CHANNEL.OPEN_MENU),
};
