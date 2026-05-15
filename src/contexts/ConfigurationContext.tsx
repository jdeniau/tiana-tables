import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Configuration } from '../configuration/type';
import { changeLanguage } from '../i18n';
import { ConnectionObjectWithoutSlug } from '../sql/types';

type ConfigurationContextType = {
  configuration: Configuration;
  addConnectionToConfig: (connection: ConnectionObjectWithoutSlug) => void;
  editConnection: (
    slug: string,
    connection: ConnectionObjectWithoutSlug
  ) => void;
  setActiveDatabase: (connectionSlug: string, database: string) => void;
  setActiveTable: (
    connectionSlug: string,
    database: string,
    tableName: string
  ) => void;
  changeLanguage: (language: string) => void;
};

const ConfigurationContext = createContext<null | ConfigurationContextType>(
  null
);
ConfigurationContext.displayName = 'ConfigurationContext';

type Props = {
  children: React.ReactNode;
};

export function ConfigurationContextProvider({ children }: Props) {
  const [configuration, setConfiguration] = useState<Configuration | null>(
    null
  );

  useEffect(() => {
    let isCanceled = false;

    window.config.getConfiguration().then(async (c) => {
      if (isCanceled) {
        return;
      }

      changeLanguage(c.locale);
      setConfiguration(c);
    });

    return () => {
      isCanceled = true;
    };
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
    (): ConfigurationContextType => ({
      // force `as` here as we will break if configuration is null, but the hook needs to be before it.
      // We don't want to use ts-expect-error, as we want to test other properties of the object.
      configuration: configuration as Configuration,
      addConnectionToConfig: willChangeConfiguration(
        window.config.addConnectionToConfig
      ),
      setActiveDatabase: window.config.setActiveDatabase,
      setActiveTable: window.config.setActiveTable,
      editConnection: willChangeConfiguration(window.config.editConnection),
      changeLanguage: willChangeConfiguration((lang: string) => {
        changeLanguage(lang);

        return window.config.changeLanguage(lang);
      }),
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
