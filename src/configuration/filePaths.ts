import { app } from 'electron';
import path, { dirname, resolve } from 'node:path';
import { isDevApp } from '../main-process/helpers';

export function getConfigurationPath() {
  const configDir = resolve(app.getPath('userData'), 'config');
  const configPath = resolve(configDir, 'config.json');

  return configPath;
}

export function getConfigurationFolder() {
  return dirname(getConfigurationPath());
}

export function getLogPath() {
  return path.join(
    app.getPath('userData'),
    'logs',
    isDevApp() ? 'dev.log' : 'main.log'
  );
}

export function getLogFolder() {
  return dirname(getLogPath());
}
