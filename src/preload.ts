// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

console.info(
  `[startup][preload] preload-start: +${Math.round(performance.now())}ms`
);

import { contextBridge, ipcRenderer } from 'electron';
import { clipboard } from './preload/clipboard';
import { config } from './preload/config';
import { navigationListener } from './preload/navigationListener';
import { sql } from './preload/sql';
import { sqlFileStorage } from './preload/sqlFileStorage';
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

ipcRenderer.invoke('get-is-dev').then((isDev) => {
  contextBridge.exposeInMainWorld('isDev', isDev);
});

ipcRenderer.invoke('get-is-mac').then((isMac) => {
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
  }
}
