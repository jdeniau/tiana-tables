import { WindowState } from '../main-process/windowState';
import { ConnectionObject } from '../sql/types';
import { DisplayAfterByColumn } from './columnOrder';
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

  /**
   * The filters this table was given, most recent first. It is `currentFilter`
   * at its head, but only until the filter is cleared: an empty clause is the
   * state of the table, not a filter worth offering again.
   */
  filterHistory?: Array<string>;

  /** the column each column is displayed after, see `DisplayAfterByColumn` */
  displayAfterByColumn?: DisplayAfterByColumn;

  /** the width a column was dragged to, by column name */
  columnWidthByColumn?: ColumnWidthByColumn;
};

/** The width, in pixels, of each column the user resized. */
export type ColumnWidthByColumn = Record<string, number>;

export type DatabaseConfig = {
  /** the table the database opens on, `''` once its last tab is closed */
  activeTable: string;

  /** the tables kept open as tabs, in the order they were memorised — the temporary one is not among them */
  openTables?: Array<string>;

  tables: Record<string, TableConfig>;
};

type ConnectionAppState = {
  activeDatabase: string;
  configByDatabase: Record<string, DatabaseConfig>;
};

/**
 * A connection as the configuration file holds it, password included: the ciphertext stays one from end to end, in memory as on disk.
 * It is read back only when a connection is opened, so a keyring that cannot open it costs that connection and never the file.
 */
export type EncryptedConnectionObject = {
  password: string;
  appState?: ConnectionAppState;
} & Omit<ConnectionObject, 'password'>;
