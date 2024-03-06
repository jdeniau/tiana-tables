// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';
import { config } from './preload/config';
import { sql } from './preload/sql';

contextBridge.exposeInMainWorld('config', config);
contextBridge.exposeInMainWorld('sql', sql);

ipcRenderer.invoke('get-is-dev').then((isDev) => {
  contextBridge.exposeInMainWorld('isDev', isDev);
});

// Declare window global that have been added
declare global {
  interface Window {
    isDev: boolean;
    config: typeof config;
    sql: typeof sql;
  }
}
