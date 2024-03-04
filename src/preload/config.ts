import type { Configuration, ConnectionAppState } from '../configuration/type';
import type { ConnectionObject } from '../sql/types';
import { bindChannel } from './bindChannel';
import { CONFIGURATION_CHANNEL } from './configurationChannel';

interface Config {
  getConfiguration(): Promise<null | Configuration>;

  addConnectionToConfig(connection: ConnectionObject): Promise<Configuration>;

  changeTheme(theme: string): void;

  updateConnectionState<K extends keyof ConnectionAppState>(
    connectionName: string,
    key: K,
    value: ConnectionAppState[K]
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
  updateConnectionState: bindChannel(
    CONFIGURATION_CHANNEL.UPDATE_CONNECTION_STATE
  ),
  editConnection: bindChannel(CONFIGURATION_CHANNEL.EDIT_CONNECTION),
};
