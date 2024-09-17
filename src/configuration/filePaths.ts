import { app } from 'electron';
import { existsSync, mkdirSync } from 'node:fs';
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

export function createConfigurationFolderIfNotExists() {
  const configurationPah = getConfigurationPath();

  if (!existsSync(dirname(configurationPah))) {
    mkdirSync(dirname(configurationPah), { recursive: true });
  }
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
