import { WindowState } from '../main-process/windowState';
import { ConnectionObject } from '../sql/types';
import { PANEL } from './panels';

export type Configuration = {
  version: 1;
  theme: string;
  locale: string;
  connections: Record<string, EncryptedConnectionObject>;
  windowState?: WindowState;
  panelSizes?: PanelSizes;
};

/**
 * size of each resizable panel, as a percentage string of its splitter
 * (`'32.5%'`). The unit is stored on purpose — see `parsePanelSize`.
 * Missing or unreadable entries fall back to `DEFAULT_PANEL_SIZES`.
 */
type PanelSizes = Partial<Record<PANEL, string>>;

type TableConfig = {
  currentFilter?: string;
};

export type DatabaseConfig = {
  activeTable: string;
  tables: Record<string, TableConfig>;
};

type ConnectionAppState = {
  activeDatabase: string;
  configByDatabase: Record<string, DatabaseConfig>;
};

export type EncryptedConnectionObject = {
  password: string;
  appState?: ConnectionAppState;
} & Omit<ConnectionObject, 'password'>;

export type EncryptedConfiguration = {
  connections: Record<string, EncryptedConnectionObject>;
} & Omit<Configuration, 'connections'>;
