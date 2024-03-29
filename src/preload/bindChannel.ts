import { ipcRenderer } from 'electron';

export function bindChannel(channel: string) {
  return function (...args: unknown[]) {
    return ipcRenderer.invoke(channel, ...args);
  };
}

export function bindEvent(channel: string) {
  return function (...args: unknown[]) {
    return ipcRenderer.send(channel, ...args);
  };
}
