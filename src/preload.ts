// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

console.info(
  `[startup][preload] preload-start: +${Math.round(performance.now())}ms`
);

import { contextBridge, ipcRenderer } from 'electron';
import { APP_CHANNEL } from './preload/appChannel';
import { clipboard } from './preload/clipboard';
import { config } from './preload/config';
import { editMenu } from './preload/editMenu';
import { navigationListener } from './preload/navigationListener';
import { sql } from './preload/sql';
import { sqlFileStorage } from './preload/sqlFileStorage';
import { titleBar } from './preload/titleBar';
import { update } from './preload/update';

console.info(
  `[startup][preload] preload-end: +${Math.round(performance.now())}ms`
);

contextBridge.exposeInMainWorld('config', config);
contextBridge.exposeInMainWorld('clipboard', clipboard);
contextBridge.exposeInMainWorld('sql', sql);
contextBridge.exposeInMainWorld('sqlFileStorage', sqlFileStorage);
contextBridge.exposeInMainWorld('navigationListener', navigationListener);
contextBridge.exposeInMainWorld('update', update);
contextBridge.exposeInMainWorld('titleBar', titleBar);
contextBridge.exposeInMainWorld('editMenu', editMenu);

ipcRenderer.invoke(APP_CHANNEL.GET_IS_DEV).then((isDev) => {
  contextBridge.exposeInMainWorld('isDev', isDev);
});

ipcRenderer.invoke(APP_CHANNEL.GET_IS_MAC).then((isMac) => {
  contextBridge.exposeInMainWorld('isMac', isMac);
});

// Declare window global that have been added
declare global {
  interface Window {
    isDev: boolean;
    isMac: boolean;
    config: typeof config;
    clipboard: typeof clipboard;
    sql: typeof sql;
    sqlFileStorage: typeof sqlFileStorage;
    navigationListener: typeof navigationListener;
    update: typeof update;
    titleBar: typeof titleBar;
    editMenu: typeof editMenu;
  }
}
