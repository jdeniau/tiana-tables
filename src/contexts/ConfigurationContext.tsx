import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { PANEL } from '../configuration/panels';
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
  setPanelSize: (panel: PANEL, size: string) => void;
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
  ): (...params: P) => Promise<void> {
    return async (...params: P) => {
      const configuration = await functionThatUpdateConfigurations(...params);

      // A channel that answers with nothing must not blank the whole app: the
      // provider renders `null` without a configuration, so every consumer
      // would unmount. It happens when the main process still runs an older
      // build of a handler — it is not hot-reloaded, unlike the renderer.
      if (!configuration) {
        console.error(
          'A configuration channel answered without a configuration. Keeping the one we have — restart the app if a handler has just changed.'
        );

        return;
      }

      setConfiguration(configuration);
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
      setPanelSize: willChangeConfiguration(window.config.setPanelSize),
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
