import type { Configuration } from '../configuration/type';
import type { ConnectionObject } from '../sql/types';
import { bindChannel } from './bindChannel';
import { CONFIGURATION_CHANNEL } from './configurationChannel';

interface Config {
  getConfiguration(): Promise<Configuration>;

  addConnectionToConfig(connection: ConnectionObject): Promise<Configuration>;

  changeTheme(theme: string): void;

  setActiveDatabase(connectionName: string, value: string): Promise<void>;

  setActiveTable(
    connectionName: string,
    database: string,
    tableName: string
  ): Promise<void>;

  editConnection(
    connectionName: string,
    connection: ConnectionObject
  ): Promise<Configuration>;
}

export const config: Config = {
  getConfiguration: bindChannel(CONFIGURATION_CHANNEL.GET),
  addConnectionToConfig: bindChannel(CONFIGURATION_CHANNEL.ADD_CONNECTION),
  changeTheme: bindChannel(CONFIGURATION_CHANNEL.CHANGE_THEME),
  setActiveDatabase: bindChannel(CONFIGURATION_CHANNEL.SET_ACTIVE_DATABASE),
  setActiveTable: bindChannel(CONFIGURATION_CHANNEL.SET_ACTIVE_TABLE),
  editConnection: bindChannel(CONFIGURATION_CHANNEL.EDIT_CONNECTION),
};
