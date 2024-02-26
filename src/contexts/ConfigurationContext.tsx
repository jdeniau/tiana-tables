import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
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

  const addConnectionToConfig = useCallback((connection: ConnectionObject) => {
    window.config.addConnectionToConfig(connection);
  }, []);

  const updateConnectionState = useCallback(
    <K extends keyof ConnectionAppState>(
      connectionName: string,
      key: K,
      value: ConnectionAppState[K]
    ) => {
      window.config.updateConnectionState(connectionName, key, value);
    },
    []
  );
  const value: ConfigurationContextType = useMemo(
    () => ({
      configuration,
      addConnectionToConfig,
      updateConnectionState,
    }),
    [configuration, addConnectionToConfig, updateConnectionState]
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
