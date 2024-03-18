import { app } from 'electron';

export const isMacPlatform = () => process.platform === 'darwin';
export const isDevApp = () => !app.isPackaged;
