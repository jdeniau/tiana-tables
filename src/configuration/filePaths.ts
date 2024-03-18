import { app } from 'electron';
import path, { dirname, resolve } from 'node:path';

export function getConfigurationPath() {
  const configDir = resolve(app.getPath('userData'), 'config');
  const configPath = resolve(configDir, 'config.json');

  return configPath;
}

export function getConfigurationFolder() {
  return dirname(getConfigurationPath());
}

export function getLogPath() {
  const isDev = !app.isPackaged;

  return path.join(
    app.getPath('userData'),
    'logs',
    isDev ? 'dev.log' : 'main.log'
  );
}

export function getLogFolder() {
  return dirname(getLogPath());
}
