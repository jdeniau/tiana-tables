import { createContext, useContext } from 'react';

export interface ConnexionContextProps {
  currentConnectionName: string | null;
  connectionNameList: Array<string>;
  addConnectionToList: (connectionName: string) => void;
}

export const ConnectionContext = createContext<ConnexionContextProps>({
  currentConnectionName: null,
  connectionNameList: [],
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  addConnectionToList: () => {},
});
ConnectionContext.displayName = 'ConnectionContext';

export function useConnectionContext(): ConnexionContextProps {
  return useContext(ConnectionContext);
}
