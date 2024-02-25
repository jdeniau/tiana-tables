import { createContext, useContext, useEffect, useState } from 'react';
import { Configuration, ConnectionAppState } from '../configuration/type';
import { ConnectionObject } from '../component/Connection/types';

type ConfigurationContextType = {
  configuration: Configuration;
  addConnectionToConfig: (connection: ConnectionObject) => void;
  updateConnectionState: <K extends keyof ConnectionAppState>(
    connectionName: string,
    key: K,
    value: ConnectionAppState[K]
  ) => void;
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

  if (!configuration) {
    return null;
  }

  const value: ConfigurationContextType = {
    configuration,
    addConnectionToConfig: (connection: ConnectionObject) => {
      window.config.addConnectionToConfig(connection);
    },
    updateConnectionState: <K extends keyof ConnectionAppState>(
      connectionName: string,
      key: K,
      value: ConnectionAppState[K]
    ) => {
      window.config.updateConnectionState(connectionName, key, value);
    },
  };

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
