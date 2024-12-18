import type { Configuration } from '../configuration/type';
import type { ConnectionObjectWithoutSlug } from '../sql/types';
import { bindChannel } from './bindChannel';
import { CONFIGURATION_CHANNEL } from './configurationChannel';

interface Config {
  getConfiguration(): Promise<Configuration>;

  addConnectionToConfig(
    connection: ConnectionObjectWithoutSlug
  ): Promise<Configuration>;

  changeTheme(theme: string): void;

  changeLanguage(language: string): Promise<Configuration>;

  setActiveDatabase(connectionSlug: string, value: string): Promise<void>;

  setActiveTable(
    connectionSlug: string,
    database: string,
    tableName: string
  ): Promise<void>;

  setTableFilter(
    connectionSlug: string,
    database: string,
    tableName: string,
    filter: string
  ): Promise<void>;

  editConnection(
    connectionSlug: string,
    connection: ConnectionObjectWithoutSlug
  ): Promise<Configuration>;
}

export const config: Config = {
  getConfiguration: bindChannel(CONFIGURATION_CHANNEL.GET),
  addConnectionToConfig: bindChannel(CONFIGURATION_CHANNEL.ADD_CONNECTION),
  changeTheme: bindChannel(CONFIGURATION_CHANNEL.CHANGE_THEME),
  changeLanguage: bindChannel(CONFIGURATION_CHANNEL.CHANGE_LANGUAGE),
  setActiveDatabase: bindChannel(CONFIGURATION_CHANNEL.SET_ACTIVE_DATABASE),
  setActiveTable: bindChannel(CONFIGURATION_CHANNEL.SET_ACTIVE_TABLE),
  setTableFilter: bindChannel(CONFIGURATION_CHANNEL.SET_TABLE_FILTER),
  editConnection: bindChannel(CONFIGURATION_CHANNEL.EDIT_CONNECTION),
};
