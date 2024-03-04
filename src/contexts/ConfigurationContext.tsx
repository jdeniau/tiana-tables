import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Configuration, ConnectionAppState } from '../configuration/type';
import { ConnectionObject } from '../sql/types';

type ConfigurationContextType = {
  configuration: Configuration;
  addConnectionToConfig: (connection: ConnectionObject) => void;
  editConnection: (name: string, connection: ConnectionObject) => void;
  updateConnectionState: <K extends keyof ConnectionAppState>(
    connectionName: string,
    key: K,
    value: ConnectionAppState[K]
  ) => void;
  getConnectionFromName: (name: string) => Promise<ConnectionObject>;
};

const ConfigurationContext = createContext<null | ConfigurationContextType>(
  null
);
ConfigurationContext.displayName = 'ConfigurationContext';

export function ConfigurationContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [configuration, setConfiguration] = useState<null | Configuration>(
    null
  );

  useEffect(() => {
    window.config.getConfiguration().then((c) => {
      setConfiguration(c);
    });
  }, []);

  function willChangeConfiguration<P extends unknown[]>(
    functionThatUpdateConfigurations: (...params: P) => Promise<Configuration>
  ): (...params: P) => Promise<Configuration> {
    return async (...params: P) => {
      const configuration = await functionThatUpdateConfigurations(...params);

      setConfiguration(configuration);

      return configuration;
    };
  }

  const value: ConfigurationContextType = useMemo(
    () => ({
      // force `as` here as we will break if configuration is null, but the hook needs to be before it.
      // We don't want to use ts-expect-error, as we want to test other properties of the object.
      configuration: configuration as Configuration,
      addConnectionToConfig: willChangeConfiguration(
        window.config.addConnectionToConfig
      ),
      updateConnectionState: window.config.updateConnectionState,
      editConnection: willChangeConfiguration(window.config.editConnection),
      getConnectionFromName: window.config.getConnectionFromName,
    }),
    [configuration]
  );

  if (!configuration) {
    return null;
  }

  return (
    <ConfigurationContext.Provider value={value}>
      {children}
    </ConfigurationContext.Provider>
  );
}

export function useConfiguration(): ConfigurationContextType {
  const value = useContext(ConfigurationContext);

  if (!value) {
    throw new Error(
      'useConfiguration must be used within a ConfigurationContextProvider'
    );
  }

  return value;
}

export const testables = {
  ConfigurationContext,
};
