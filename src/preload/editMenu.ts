import { Unsubscribe, subscribe } from './bindChannel';
import { EDIT_MENU_CHANNEL } from './editMenuChannel';

interface EditMenu {
  onSelectAll(callback: () => void): Unsubscribe;
  onFind(callback: () => void): Unsubscribe;
}

export const editMenu: EditMenu = {
  onSelectAll: (callback) => subscribe(EDIT_MENU_CHANNEL.SELECT_ALL, callback),
  onFind: (callback) => subscribe(EDIT_MENU_CHANNEL.FIND, callback),
};
